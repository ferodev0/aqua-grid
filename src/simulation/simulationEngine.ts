import { deriveSensorStatus, evaluateNetworkAlerts } from "./alertRules";
import type {
  AlertThresholds,
  AquaAlert,
  ChannelSegment,
  HydropowerEstimateInput,
  HydropowerEstimateResult,
  NetworkSummaryMetrics,
  Sensor,
  TelemetryPoint,
} from "./types";

export const SIMULATION_TICK_INTERVAL_MS = 2500;
export const MAX_TELEMETRY_POINTS_PER_SENSOR = 120;

const WATER_DENSITY_KG_PER_M3 = 1000;
const GRAVITY_M_PER_S2 = 9.81;

/**
 * Target multipliers applied during the crisis simulation scenario (Spec Section 8.3):
 * - S01 and S02 remain near normal.
 * - S03 experiences a sudden flow reduction (Warning range).
 * - S04 experiences a larger downstream reduction (Critical range).
 */
export const CRISIS_SENSOR_MULTIPLIERS: Record<
  string,
  { flowMultiplier: number; levelMultiplier: number }
> = {
  S01: { flowMultiplier: 0.99, levelMultiplier: 0.99 },
  S02: { flowMultiplier: 0.97, levelMultiplier: 0.98 },
  S03: { flowMultiplier: 0.72, levelMultiplier: 0.75 },
  S04: { flowMultiplier: 0.46, levelMultiplier: 0.52 },
};

/**
 * Generates a small bounded random fluctuation in the range [-maxDelta, +maxDelta].
 */
function boundedJitter(maxDelta: number): number {
  return (Math.random() * 2 - 1) * maxDelta;
}

/**
 * Clamps a numeric value between min and max.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Advances a single sensor by one simulation tick with bounded fluctuations around
 * its baseline (or crisis-adjusted target).
 */
export function advanceSensorReading(
  sensor: Sensor,
  thresholds: AlertThresholds,
  isCrisisActive: boolean,
  forceOfflineIds: ReadonlySet<string>,
  nowMs: number = Date.now()
): Sensor {
  const isForcedOffline = forceOfflineIds.has(sensor.id);
  const nowIso = new Date(nowMs).toISOString();

  if (isForcedOffline) {
    return {
      ...sensor,
      status: "offline",
    };
  }

  // Determine scenario multiplier for this station
  const crisisTarget = isCrisisActive
    ? CRISIS_SENSOR_MULTIPLIERS[sensor.id] ?? {
        flowMultiplier: 0.85,
        levelMultiplier: 0.88,
      }
    : { flowMultiplier: 1.0, levelMultiplier: 1.0 };

  // Bounded variation (±1.8%) around target baseline multiplier
  const flowFactor = clamp(
    crisisTarget.flowMultiplier + boundedJitter(0.018),
    0.1,
    1.15
  );
  const levelFactor = clamp(
    crisisTarget.levelMultiplier + boundedJitter(0.014),
    0.1,
    1.15
  );

  const nextFlowRateLps = Number(
    Math.max(0, sensor.baseline.flowRateLps * flowFactor).toFixed(2)
  );
  const nextWaterLevelM = Number(
    Math.max(0, sensor.baseline.waterLevelM * levelFactor).toFixed(3)
  );

  // Estimate flow velocity proportionally to flow rate & level
  const baselineRatio =
    nextFlowRateLps / Math.max(sensor.baseline.flowRateLps, 0.01);
  const baseVelocity = 0.72;
  const nextVelocityMps = Number(
    Math.max(0.05, baseVelocity * baselineRatio + boundedJitter(0.015)).toFixed(2)
  );

  const prevBattery = sensor.current.batteryPercent ?? 90;
  const prevSignal = sensor.current.signalPercent ?? 90;
  const nextSignal = Math.round(clamp(prevSignal + boundedJitter(1.5), 72, 99));

  const updatedSensor: Sensor = {
    ...sensor,
    current: {
      flowRateLps: nextFlowRateLps,
      waterLevelM: nextWaterLevelM,
      flowVelocityMps: nextVelocityMps,
      batteryPercent: prevBattery,
      signalPercent: nextSignal,
      updatedAt: nowIso,
    },
    status: "normal",
  };

  updatedSensor.status = deriveSensorStatus(
    updatedSensor,
    thresholds,
    nowMs,
    false
  );

  return updatedSensor;
}

export interface SimulationTickState {
  sensors: Sensor[];
  channelSegments: ChannelSegment[];
  alerts: AquaAlert[];
  telemetryHistory: TelemetryPoint[];
}

/**
 * Executes one full synchronized simulation tick across all sensors,
 * rolling telemetry history, and deterministic alert rules.
 */
export function runSimulationTick(
  state: SimulationTickState,
  thresholds: AlertThresholds,
  isCrisisActive: boolean,
  forceOfflineIds: ReadonlySet<string> = new Set(),
  nowMs: number = Date.now()
): SimulationTickState {
  const nowIso = new Date(nowMs).toISOString();

  const nextSensors = state.sensors.map((sensor) =>
    advanceSensorReading(
      sensor,
      thresholds,
      isCrisisActive,
      forceOfflineIds,
      nowMs
    )
  );

  // Append new telemetry points for online sensors
  const newPoints: TelemetryPoint[] = nextSensors
    .filter((s) => s.status !== "offline")
    .map((s) => ({
      timestamp: nowIso,
      sensorId: s.id,
      flowRateLps: s.current.flowRateLps,
      waterLevelM: s.current.waterLevelM,
    }));

  const maxTotalPoints =
    Math.max(nextSensors.length, 4) * MAX_TELEMETRY_POINTS_PER_SENSOR;
  const combinedHistory = [...state.telemetryHistory, ...newPoints];
  const nextTelemetryHistory =
    combinedHistory.length > maxTotalPoints
      ? combinedHistory.slice(combinedHistory.length - maxTotalPoints)
      : combinedHistory;

  const nextAlerts = evaluateNetworkAlerts(
    nextSensors,
    state.channelSegments,
    state.alerts,
    thresholds,
    nowIso
  );

  return {
    sensors: nextSensors,
    channelSegments: state.channelSegments,
    alerts: nextAlerts,
    telemetryHistory: nextTelemetryHistory,
  };
}

/**
 * Theoretical micro-hydropower estimation formula (Spec Section 3.3):
 *   Q_(m^3/s) = Q_(L/s) / 1000
 *   P = rho * g * Q * H * eta
 *   E_kWh = (P_W * operatingHours) / 1000
 *
 * All outputs are explicitly flagged as illustrative estimates based on simulated inputs.
 */
export function calculateHydropowerEstimate({
  flowRateLps,
  netHeadM,
  efficiency = 0.65,
  operatingHoursPerDay = 24,
}: HydropowerEstimateInput): HydropowerEstimateResult {
  const safeFlowLps = Math.max(0, flowRateLps);
  const safeHeadM = Math.max(0, netHeadM);
  const safeEta = clamp(efficiency, 0, 1);
  const safeHours = clamp(operatingHoursPerDay, 0, 24);

  const flowRateM3ps = safeFlowLps / 1000;
  const powerWatts =
    WATER_DENSITY_KG_PER_M3 *
    GRAVITY_M_PER_S2 *
    flowRateM3ps *
    safeHeadM *
    safeEta;
  const powerKilowatts = powerWatts / 1000;
  const dailyEnergyKwh = (powerWatts * safeHours) / 1000;
  const annualEnergyKwh = dailyEnergyKwh * 365;

  return {
    flowRateM3ps: Number(flowRateM3ps.toFixed(4)),
    powerWatts: Number(powerWatts.toFixed(1)),
    powerKilowatts: Number(powerKilowatts.toFixed(3)),
    dailyEnergyKwh: Number(dailyEnergyKwh.toFixed(2)),
    annualEnergyKwh: Number(annualEnergyKwh.toFixed(1)),
    isIllustrative: true,
  };
}

/**
 * Computes network-wide summary metrics for the Dashboard and Map headers.
 * Uses S01 (Upper Channel) as the representative reference inflow station
 * so serial sensors along the same channel are never erroneously summed (Spec Section 7.1).
 */
export function computeNetworkSummaryMetrics(
  sensors: Sensor[],
  alerts: AquaAlert[]
): NetworkSummaryMetrics {
  const totalSensors = sensors.length;
  const offlineSensorsCount = sensors.filter(
    (s) => s.status === "offline"
  ).length;
  const activeSensorsCount = totalSensors - offlineSensorsCount;
  const warningSensorsCount = sensors.filter(
    (s) => s.status === "warning"
  ).length;
  const criticalSensorsCount = sensors.filter(
    (s) => s.status === "critical"
  ).length;
  const attentionSensorsCount =
    warningSensorsCount + criticalSensorsCount + offlineSensorsCount;

  const openAlertsCount = alerts.filter((a) => a.status === "active").length;

  const referenceSensor =
    sensors.find((s) => s.id === "S01") ?? sensors[0];
  const terminalSensor =
    sensors.find((s) => s.id === "S04") ?? sensors[sensors.length - 1];

  const referenceInflowLps = referenceSensor?.current.flowRateLps ?? 0;
  const terminalOutflowLps = terminalSensor?.current.flowRateLps ?? 0;

  // Illustrative micro-hydropower estimate assuming a 2.8m candidate drop at Upper/Central channel
  const hydroEstimate = calculateHydropowerEstimate({
    flowRateLps: referenceInflowLps,
    netHeadM: 2.8,
    efficiency: 0.65,
  });

  return {
    totalSensors,
    activeSensorsCount,
    offlineSensorsCount,
    attentionSensorsCount,
    warningSensorsCount,
    criticalSensorsCount,
    openAlertsCount,
    referenceInflowLps,
    referenceSensorId: referenceSensor?.id ?? "S01",
    referenceSensorName: referenceSensor?.name ?? "Upper Channel",
    terminalOutflowLps,
    terminalSensorId: terminalSensor?.id ?? "S04",
    illustrativePowerPotentialWatts: hydroEstimate.powerWatts,
  };
}
