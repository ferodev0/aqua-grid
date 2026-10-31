import type {
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
 * Reference villages and sub-areas in the Lefke region for grouping/filtering.
 */
export const KNOWN_VILLAGES: string[] = [
  "Lefke",
  "Bağlıköy",
  "Gaziveren",
];

export const KNOWN_AREAS_BY_VILLAGE: Record<string, string[]> = {
  Lefke: ["Upper Valley Intake", "Central Town Aqueduct"],
  Bağlıköy: ["Orchard Distribution Zone"],
  Gaziveren: ["Lower Agricultural Plains"],
};

/**
 * Demonstration sensors from the fixed user network draft, with names /
 * villages / areas / baselines restored from `sensorMetadataBackup.ts`.
 * Coordinates come from the draft layout (not the historical backup lat/lng).
 */
export function createInitialSensors(
  nowIso: string = new Date().toISOString()
): Sensor[] {
  return [
    {
      id: "S01",
      name: "Upper Channel",
      channelSegmentId: "SEG-01",
      village: "Lefke",
      area: "Upper Valley Intake",
      location: {
        lat: 35.10726,
        lng: 32.84804,
        label: "Upper Valley Intake (Illustrative)",
        village: "Lefke",
        area: "Upper Valley Intake",
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
      village: "Lefke",
      area: "Central Town Aqueduct",
      location: {
        lat: 35.10956,
        lng: 32.84955,
        label: "Central Town Aqueduct Section (Illustrative)",
        village: "Lefke",
        area: "Central Town Aqueduct",
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
      village: "Bağlıköy",
      area: "Orchard Distribution Zone",
      location: {
        lat: 35.1123,
        lng: 32.85189,
        label: "Orchard & Village Distribution Approach (Illustrative)",
        village: "Bağlıköy",
        area: "Orchard Distribution Zone",
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
      village: "Gaziveren",
      area: "Lower Agricultural Plains",
      location: {
        lat: 35.11326,
        lng: 32.8541,
        label: "Lower Agricultural Outlying Section (Illustrative)",
        village: "Gaziveren",
        area: "Lower Agricultural Plains",
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
 * Draft channel polyline split at S01–S04 into four linked segments.
 */
export const INITIAL_CHANNEL_SEGMENTS: ChannelSegment[] = [
  {
    id: "SEG-01",
    name: "Upper Feeder Section (Intake to S01)",
    village: "Lefke",
    area: "Upper Valley Intake",
    downstreamSensorId: "S01",
    path: [
      { lat: 35.10692, lng: 32.84653 },
      { lat: 35.10694, lng: 32.84697 },
      { lat: 35.10726, lng: 32.84804 },
    ],
    isIllustrative: true,
  },
  {
    id: "SEG-02",
    name: "Upper-to-Central Transit (S01 to S02)",
    village: "Lefke",
    area: "Central Town Aqueduct",
    upstreamSensorId: "S01",
    downstreamSensorId: "S02",
    path: [
      { lat: 35.10726, lng: 32.84804 },
      { lat: 35.10738, lng: 32.84878 },
      { lat: 35.10757, lng: 32.84936 },
      { lat: 35.10782, lng: 32.84958 },
      { lat: 35.10797, lng: 32.84976 },
      { lat: 35.10829, lng: 32.84973 },
      { lat: 35.1086, lng: 32.84963 },
      { lat: 35.1089, lng: 32.84954 },
      { lat: 35.1094, lng: 32.84952 },
      { lat: 35.10956, lng: 32.84955 },
    ],
    isIllustrative: true,
  },
  {
    id: "SEG-03",
    name: "Central-to-Village Distribution (S02 to S03)",
    village: "Bağlıköy",
    area: "Orchard Distribution Zone",
    upstreamSensorId: "S02",
    downstreamSensorId: "S03",
    path: [
      { lat: 35.10956, lng: 32.84955 },
      { lat: 35.11009, lng: 32.84969 },
      { lat: 35.11047, lng: 32.84973 },
      { lat: 35.11104, lng: 32.84975 },
      { lat: 35.11147, lng: 32.84973 },
      { lat: 35.11193, lng: 32.84967 },
      { lat: 35.11218, lng: 32.84961 },
      { lat: 35.11154, lng: 32.8511 },
      { lat: 35.11218, lng: 32.85139 },
      { lat: 35.1123, lng: 32.85189 },
    ],
    isIllustrative: true,
  },
  {
    id: "SEG-04",
    name: "Outlying Lower Reach (S03 to S04)",
    village: "Gaziveren",
    area: "Lower Agricultural Plains",
    upstreamSensorId: "S03",
    downstreamSensorId: "S04",
    path: [
      { lat: 35.1123, lng: 32.85189 },
      { lat: 35.11236, lng: 32.85217 },
      { lat: 35.11254, lng: 32.85249 },
      { lat: 35.11281, lng: 32.85269 },
      { lat: 35.11311, lng: 32.85275 },
      { lat: 35.11331, lng: 32.85301 },
      { lat: 35.11326, lng: 32.8541 },
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
      const phase = i * 0.45 + sIdx * 1.1;
      const waveFactor =
        1 + Math.sin(phase) * 0.018 + Math.cos(phase * 0.7) * 0.008;

      const flowRateLps = Number(
        (sensor.baseline.flowRateLps * waveFactor).toFixed(2)
      );
      const waterLevelM = Number(
        (sensor.baseline.waterLevelM * waveFactor).toFixed(3)
      );

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
export function createInitialAlerts(
  nowIso: string = new Date().toISOString()
): AquaAlert[] {
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
