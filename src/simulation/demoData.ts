import {
  AlertThresholds,
  AquaAlert,
  ChannelSegment,
  Sensor,
  TelemetryPoint,
} from "./types";

export const DEMO_MODE_LABEL = "DEMO MODE — SIMULATED SENSOR DATA";

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  warningFlowRatio: 0.85,
  criticalFlowRatio: 0.68,
  offlineTimeoutMs: 15_000,
  sectionDiscrepancyRatio: 0.18,
};

/**
 * Fictional demonstration sensors representing a conceptual water channel
 * passing through the Lefke area. Coordinates and baselines are illustrative
 * demonstration values, not surveyed field measurements.
 */
export function createInitialSensors(nowIso: string = new Date().toISOString()): Sensor[] {
  return [
    {
      id: "S01",
      name: "Upper Channel",
      channelSegmentId: "SEG-01",
      location: {
        lat: 35.1065,
        lng: 32.8452,
        label: "Upper Valley Intake (Illustrative)",
        isIllustrative: true,
      },
      baseline: {
        flowRateLps: 12.0,
        waterLevelM: 0.42,
      },
      current: {
        flowRateLps: 12.0,
        waterLevelM: 0.42,
        flowVelocityMps: 0.86,
        batteryPercent: 96,
        signalPercent: 94,
        updatedAt: nowIso,
      },
      status: "normal",
    },
    {
      id: "S02",
      name: "Central Channel",
      channelSegmentId: "SEG-02",
      location: {
        lat: 35.1118,
        lng: 32.8498,
        label: "Central Town Aqueduct Section (Illustrative)",
        isIllustrative: true,
      },
      baseline: {
        flowRateLps: 10.5,
        waterLevelM: 0.38,
      },
      current: {
        flowRateLps: 10.5,
        waterLevelM: 0.38,
        flowVelocityMps: 0.79,
        batteryPercent: 91,
        signalPercent: 92,
        updatedAt: nowIso,
      },
      status: "normal",
    },
    {
      id: "S03",
      name: "Village Approach",
      channelSegmentId: "SEG-03",
      location: {
        lat: 35.1174,
        lng: 32.8546,
        label: "Orchard & Village Distribution Approach (Illustrative)",
        isIllustrative: true,
      },
      baseline: {
        flowRateLps: 8.0,
        waterLevelM: 0.31,
      },
      current: {
        flowRateLps: 8.0,
        waterLevelM: 0.31,
        flowVelocityMps: 0.68,
        batteryPercent: 88,
        signalPercent: 85,
        updatedAt: nowIso,
      },
      status: "normal",
    },
    {
      id: "S04",
      name: "Lower Channel",
      channelSegmentId: "SEG-04",
      location: {
        lat: 35.1232,
        lng: 32.8595,
        label: "Lower Agricultural Outlying Section (Illustrative)",
        isIllustrative: true,
      },
      baseline: {
        flowRateLps: 6.5,
        waterLevelM: 0.25,
      },
      current: {
        flowRateLps: 6.5,
        waterLevelM: 0.25,
        flowVelocityMps: 0.58,
        batteryPercent: 84,
        signalPercent: 81,
        updatedAt: nowIso,
      },
      status: "normal",
    },
  ];
}

/**
 * Illustrative channel segments connecting the demonstration sensor stations.
 */
export const INITIAL_CHANNEL_SEGMENTS: ChannelSegment[] = [
  {
    id: "SEG-01",
    name: "Upper Feeder Section (Intake to S01)",
    downstreamSensorId: "S01",
    path: [
      { lat: 35.1025, lng: 32.8415 },
      { lat: 35.1046, lng: 32.8434 },
      { lat: 35.1065, lng: 32.8452 },
    ],
    isIllustrative: true,
  },
  {
    id: "SEG-02",
    name: "Upper-to-Central Transit (S01 to S02)",
    upstreamSensorId: "S01",
    downstreamSensorId: "S02",
    path: [
      { lat: 35.1065, lng: 32.8452 },
      { lat: 35.1091, lng: 32.8476 },
      { lat: 35.1118, lng: 32.8498 },
    ],
    isIllustrative: true,
  },
  {
    id: "SEG-03",
    name: "Central-to-Village Distribution (S02 to S03)",
    upstreamSensorId: "S02",
    downstreamSensorId: "S03",
    path: [
      { lat: 35.1118, lng: 32.8498 },
      { lat: 35.1147, lng: 32.8521 },
      { lat: 35.1174, lng: 32.8546 },
    ],
    isIllustrative: true,
  },
  {
    id: "SEG-04",
    name: "Outlying Lower Reach (S03 to S04)",
    upstreamSensorId: "S03",
    downstreamSensorId: "S04",
    path: [
      { lat: 35.1174, lng: 32.8546 },
      { lat: 35.1203, lng: 32.8571 },
      { lat: 35.1232, lng: 32.8595 },
    ],
    isIllustrative: true,
  },
];

/**
 * Generates an initial rolling telemetry history buffer so charts immediately
 * display realistic, bounded fluctuations upon opening the prototype.
 */
export function createInitialTelemetryHistory(
  sensors: Sensor[],
  pointsPerSensor: number = 36,
  intervalMs: number = 5 * 60 * 1000, // 5-minute spacing for historical warm-up
  nowMs: number = Date.now()
): TelemetryPoint[] {
  const history: TelemetryPoint[] = [];

  for (let i = pointsPerSensor - 1; i >= 0; i--) {
    const pointTimeMs = nowMs - i * intervalMs;
    const timestamp = new Date(pointTimeMs).toISOString();

    for (let sIdx = 0; sIdx < sensors.length; sIdx++) {
      const sensor = sensors[sIdx];
      // Deterministic gentle wave + tiny noise so initial charts look smooth and credible
      const phase = (i * 0.45) + sIdx * 1.1;
      const waveFactor = 1 + Math.sin(phase) * 0.018 + Math.cos(phase * 0.7) * 0.008;

      const flowRateLps = Number((sensor.baseline.flowRateLps * waveFactor).toFixed(2));
      const waterLevelM = Number((sensor.baseline.waterLevelM * waveFactor).toFixed(3));

      history.push({
        timestamp,
        sensorId: sensor.id,
        flowRateLps,
        waterLevelM,
      });
    }
  }

  return history;
}

/**
 * Initial system alert entries so the event panel is immediately informative.
 */
export function createInitialAlerts(nowIso: string = new Date().toISOString()): AquaAlert[] {
  return [
    {
      id: "ALT-SYS-INIT",
      severity: "info",
      title: "Simulated Monitoring Active",
      message:
        "All 4 demonstration stations (S01–S04) are reporting normal baseline flow conditions in Demo Mode.",
      sensorIds: ["S01", "S02", "S03", "S04"],
      createdAt: nowIso,
      status: "active",
      source: "system",
    },
  ];
}
