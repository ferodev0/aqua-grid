import { deriveSensorStatus, evaluateNetworkAlerts } from "./alertRules";
import type {
  AlertThresholds,
  AquaAlert,
  AreaSensorGroup,
  ChannelSegment,
  HydropowerEstimateInput,
  HydropowerEstimateResult,
  NetworkSummaryMetrics,
  Sensor,
  TelemetryPoint,
  VillageSensorGroup,
} from "./types";

export const SIMULATION_TICK_INTERVAL_MS = 2500;
export const MAX_TELEMETRY_POINTS_PER_SENSOR = 120;

const WATER_DENSITY_KG_PER_M3 = 1000;
const GRAVITY_M_PER_S2 = 9.81;

/**
 * Staged crisis timeline (from trigger). Map markers progress:
 * 1) immediately → S03 warning (orange)
 * 2) +2s → S04 warning (orange)
 * 3) +2s more → S04 critical (red); S03 stays warning
 */
export const CRISIS_PHASE_DELAYS_MS = {
  s03Warning: 0,
  s04Warning: 2_000,
  s04Critical: 4_000,
} as const;

type CrisisMultiplier = { flowMultiplier: number; levelMultiplier: number };

/** Final-phase targets (fully escalated crisis). */
export const CRISIS_SENSOR_MULTIPLIERS: Record<string, CrisisMultiplier> = {
  S01: { flowMultiplier: 0.99, levelMultiplier: 0.99 },
  S02: { flowMultiplier: 0.97, levelMultiplier: 0.98 },
  S03: { flowMultiplier: 0.72, levelMultiplier: 0.75 },
  S04: { flowMultiplier: 0.46, levelMultiplier: 0.52 },
};

const CRISIS_NEAR_BASELINE: CrisisMultiplier = {
  flowMultiplier: 0.97,
  levelMultiplier: 0.98,
};

const CRISIS_S04_WARNING: CrisisMultiplier = {
  flowMultiplier: 0.74,
  levelMultiplier: 0.76,
};

/**
 * Resolves per-sensor flow/level targets for the current crisis phase.
 */
export function resolveCrisisMultipliers(
  sensorId: string,
  isCrisisActive: boolean,
  crisisElapsedMs: number = 0
): CrisisMultiplier {
  if (!isCrisisActive) {
    return { flowMultiplier: 1.0, levelMultiplier: 1.0 };
  }

  const s03Warning =
    crisisElapsedMs >= CRISIS_PHASE_DELAYS_MS.s03Warning;
  const s04Warning =
    crisisElapsedMs >= CRISIS_PHASE_DELAYS_MS.s04Warning;
  const s04Critical =
    crisisElapsedMs >= CRISIS_PHASE_DELAYS_MS.s04Critical;

  switch (sensorId) {
    case "S01":
      return CRISIS_SENSOR_MULTIPLIERS.S01;
    case "S02":
      return CRISIS_SENSOR_MULTIPLIERS.S02;
    case "S03":
      return s03Warning
        ? CRISIS_SENSOR_MULTIPLIERS.S03
        : CRISIS_NEAR_BASELINE;
    case "S04":
      if (s04Critical) return CRISIS_SENSOR_MULTIPLIERS.S04;
      if (s04Warning) return CRISIS_S04_WARNING;
      return CRISIS_NEAR_BASELINE;
    default:
      return CRISIS_NEAR_BASELINE;
  }
}

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
  nowMs: number = Date.now(),
  crisisStartedAtMs: number | null = null
): Sensor {
  const isForcedOffline = forceOfflineIds.has(sensor.id);
  const nowIso = new Date(nowMs).toISOString();

  if (isForcedOffline) {
    return {
      ...sensor,
      status: "offline",
    };
  }

  const crisisElapsedMs =
    isCrisisActive && crisisStartedAtMs != null
      ? Math.max(0, nowMs - crisisStartedAtMs)
      : 0;

  const crisisTarget = resolveCrisisMultipliers(
    sensor.id,
    isCrisisActive,
    crisisElapsedMs
  );

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
  nowMs: number = Date.now(),
  crisisStartedAtMs: number | null = null
): SimulationTickState {
  const nowIso = new Date(nowMs).toISOString();

  const nextSensors = state.sensors.map((sensor) =>
    advanceSensorReading(
      sensor,
      thresholds,
      isCrisisActive,
      forceOfflineIds,
      nowMs,
      crisisStartedAtMs
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

  const openAlertsCount = alerts.filter(
    (a) =>
      a.status === "active" &&
      (a.severity === "warning" || a.severity === "critical")
  ).length;

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

/**
 * Groups sensors by their village name.
 */
export function groupSensorsByVillage(
  sensors: Sensor[]
): Record<string, Sensor[]> {
  return sensors.reduce<Record<string, Sensor[]>>((acc, sensor) => {
    const village = sensor.village || sensor.location?.village || "Lefke";
    if (!acc[village]) {
      acc[village] = [];
    }
    acc[village].push(sensor);
    return acc;
  }, {});
}

/**
 * Groups sensors by their area name.
 */
export function groupSensorsByArea(
  sensors: Sensor[]
): Record<string, Sensor[]> {
  return sensors.reduce<Record<string, Sensor[]>>((acc, sensor) => {
    const area = sensor.area || sensor.location?.area || "General Area";
    if (!acc[area]) {
      acc[area] = [];
    }
    acc[area].push(sensor);
    return acc;
  }, {});
}

/**
 * Nested grouping of sensors by village -> area -> Sensor[].
 */
export function groupSensorsByVillageAndArea(
  sensors: Sensor[]
): Record<string, Record<string, Sensor[]>> {
  return sensors.reduce<Record<string, Record<string, Sensor[]>>>(
    (acc, sensor) => {
      const village = sensor.village || sensor.location?.village || "Lefke";
      const area = sensor.area || sensor.location?.area || "General Area";
      if (!acc[village]) {
        acc[village] = {};
      }
      if (!acc[village][area]) {
        acc[village][area] = [];
      }
      acc[village][area].push(sensor);
      return acc;
    },
    {}
  );
}

/**
 * Builds structured VillageSensorGroup array (village -> areas -> sensors)
 * with active and attention counts precomputed for UI rendering.
 */
export function buildVillageSensorGroups(
  sensors: Sensor[]
): VillageSensorGroup[] {
  const byVillageAndArea = groupSensorsByVillageAndArea(sensors);

  return Object.entries(byVillageAndArea).map(([village, areaMap]) => {
    const areas: AreaSensorGroup[] = Object.entries(areaMap).map(
      ([area, areaSensors]) => ({
        area,
        village,
        sensors: areaSensors,
        activeCount: areaSensors.filter((s) => s.status !== "offline").length,
        attentionCount: areaSensors.filter((s) => s.status !== "normal").length,
      })
    );

    const villageSensors = areas.flatMap((a) => a.sensors);

    return {
      village,
      sensors: villageSensors,
      areas,
      activeCount: villageSensors.filter((s) => s.status !== "offline").length,
      attentionCount: villageSensors.filter((s) => s.status !== "normal")
        .length,
    };
  });
}
