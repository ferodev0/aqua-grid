export type SensorStatus = "normal" | "warning" | "critical" | "offline";

export interface Sensor {
  id: string;
  name: string;
  channelSegmentId: string;
  /** Village grouping for filtering and regional aggregation (e.g., "Lefke", "Bağlıköy", "Gaziveren") */
  village: string;
  /** Specific zone/sub-area within or around the village (e.g., "Upper Valley Intake", "Town Centre Aqueduct") */
  area: string;
  location: {
    lat?: number;
    lng?: number;
    label: string;
    village: string;
    area: string;
    isIllustrative: boolean;
  };
  baseline: {
    flowRateLps: number; // litres per second
    waterLevelM: number; // metres
  };
  current: {
    flowRateLps: number;
    waterLevelM: number;
    flowVelocityMps?: number;
    batteryPercent?: number;
    signalPercent?: number;
    updatedAt: string;
  };
  status: SensorStatus;
}

export interface ChannelSegment {
  id: string;
  name: string;
  village?: string;
  area?: string;
  upstreamSensorId?: string;
  downstreamSensorId?: string;
  path: Array<{ lat: number; lng: number }>;
  isIllustrative: boolean;
}

export interface AreaSensorGroup {
  area: string;
  village: string;
  sensors: Sensor[];
  activeCount: number;
  attentionCount: number;
}

export interface VillageSensorGroup {
  village: string;
  sensors: Sensor[];
  areas: AreaSensorGroup[];
  activeCount: number;
  attentionCount: number;
}

export type AlertSeverity = "info" | "warning" | "critical";

export interface AquaAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  sensorIds: string[];
  channelSegmentId?: string;
  createdAt: string;
  status: "active" | "resolved";
  source: "simulation" | "system";
}

export interface TelemetryPoint {
  timestamp: string;
  sensorId: string;
  flowRateLps: number;
  waterLevelM: number;
}

export type TelemetryTimeRange = "1h" | "24h" | "7d";

export interface AlertThresholds {
  /** Flow ratio relative to sensor baseline below which status becomes "warning" (e.g. 0.85 = 85%) */
  warningFlowRatio: number;
  /** Flow ratio relative to sensor baseline below which status becomes "critical" (e.g. 0.65 = 65%) */
  criticalFlowRatio: number;
  /** Maximum age of last reading in milliseconds before sensor is considered "offline" */
  offlineTimeoutMs: number;
  /** Relative drop between upstream and downstream baseline-normalized ratios that triggers a section anomaly alert */
  sectionDiscrepancyRatio: number;
}

export interface HydropowerEstimateInput {
  flowRateLps: number;
  netHeadM: number;
  efficiency?: number; // 0 to 1, default 0.65
  operatingHoursPerDay?: number; // default 24
}

export interface HydropowerEstimateResult {
  flowRateM3ps: number;
  powerWatts: number;
  powerKilowatts: number;
  dailyEnergyKwh: number;
  annualEnergyKwh: number;
  isIllustrative: true;
}

/**
 * Runtime-generated illustrative micro-hydro candidate along a channel path.
 * Net head is derived from assumed grade × distance (no DEM).
 */
export interface HydroCandidateSite {
  id: string;
  lat: number;
  lng: number;
  segmentId: string;
  referenceSensorId: string;
  netHeadM: number;
  efficiency: number;
  flowRateLps: number;
  lengthFromUpstreamM: number;
  estimate: HydropowerEstimateResult;
  rank: number;
  isIllustrative: true;
}

export interface NetworkSummaryMetrics {
  totalSensors: number;
  activeSensorsCount: number;
  offlineSensorsCount: number;
  attentionSensorsCount: number;
  warningSensorsCount: number;
  criticalSensorsCount: number;
  /** Active warning + critical alerts only (info/system notices excluded) */
  openAlertsCount: number;
  /** Reference inflow measured at the primary upstream station (S01) to avoid summing serial sensors on the same channel */
  referenceInflowLps: number;
  referenceSensorId: string;
  referenceSensorName: string;
  /** Downstream outflow at terminal station (S04) for network-wide comparison */
  terminalOutflowLps: number;
  terminalSensorId: string;
  /** Illustrative micro-hydropower potential in watts across candidate drops */
  illustrativePowerPotentialWatts: number;
}
