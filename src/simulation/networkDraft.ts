import type { ChannelSegment, Sensor } from "./types";
import {
  SENSOR_METADATA_BACKUP,
  type SensorMetadataTemplate,
} from "./sensorMetadataBackup";
import { syncAllSegmentPaths } from "./channelGeometry";

export const NETWORK_DRAFT_FILENAME = "userNetworkDraft.json";
export const NETWORK_DRAFT_STORAGE_KEY = "aqua-grid-network-draft-v1";

export interface NetworkDraft {
  version: 1;
  exportedAt: string;
  sensors: Sensor[];
  channelSegments: ChannelSegment[];
}

export function buildNetworkDraft(
  sensors: Sensor[],
  channelSegments: ChannelSegment[],
  exportedAt: string = new Date().toISOString()
): NetworkDraft {
  return {
    version: 1,
    exportedAt,
    sensors: structuredClone(sensors),
    channelSegments: structuredClone(channelSegments),
  };
}

export function parseNetworkDraft(raw: unknown): NetworkDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.sensors) || !Array.isArray(obj.channelSegments)) {
    return null;
  }
  return {
    version: 1,
    exportedAt:
      typeof obj.exportedAt === "string"
        ? obj.exportedAt
        : new Date().toISOString(),
    sensors: obj.sensors as Sensor[],
    channelSegments: obj.channelSegments as ChannelSegment[],
  };
}

export function downloadNetworkDraft(draft: NetworkDraft): void {
  const blob = new Blob([JSON.stringify(draft, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = NETWORK_DRAFT_FILENAME;
  a.click();
  URL.revokeObjectURL(url);
}

export function saveNetworkDraftToLocalStorage(draft: NetworkDraft): void {
  try {
    localStorage.setItem(NETWORK_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // ignore quota / private mode
  }
}

export function loadNetworkDraftFromLocalStorage(): NetworkDraft | null {
  try {
    const raw = localStorage.getItem(NETWORK_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return parseNetworkDraft(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Apply backup templates onto sensors in order (or by matching templateId).
 * Preserves each sensor's current lat/lng and id.
 */
export function applyMetadataTemplatesToSensors(
  sensors: Sensor[],
  templates: SensorMetadataTemplate[] = SENSOR_METADATA_BACKUP,
  nowIso: string = new Date().toISOString()
): Sensor[] {
  const sortedTemplates = [...templates].sort((a, b) => a.order - b.order);

  return sensors.map((sensor, index) => {
    const byId = sortedTemplates.find((t) => t.templateId === sensor.id);
    const template = byId ?? sortedTemplates[index];
    if (!template) return sensor;

    return {
      ...sensor,
      name: template.name,
      village: template.village,
      area: template.area,
      location: {
        ...sensor.location,
        label: template.locationLabel,
        village: template.village,
        area: template.area,
        isIllustrative: true,
        // keep editor lat/lng
        lat: sensor.location.lat,
        lng: sensor.location.lng,
      },
      baseline: { ...template.baseline },
      current: {
        ...sensor.current,
        flowRateLps: template.baseline.flowRateLps,
        waterLevelM: template.baseline.waterLevelM,
        flowVelocityMps: template.defaults.flowVelocityMps,
        batteryPercent: template.defaults.batteryPercent,
        signalPercent: template.defaults.signalPercent,
        updatedAt: nowIso,
      },
      status: "normal",
    };
  });
}

export function applyMetadataAndSyncPaths(
  sensors: Sensor[],
  channelSegments: ChannelSegment[],
  nowIso?: string
): { sensors: Sensor[]; channelSegments: ChannelSegment[] } {
  const nextSensors = applyMetadataTemplatesToSensors(
    sensors,
    SENSOR_METADATA_BACKUP,
    nowIso
  );
  return {
    sensors: nextSensors,
    channelSegments: syncAllSegmentPaths(channelSegments, nextSensors),
  };
}
