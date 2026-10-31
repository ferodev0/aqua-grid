import type { ChannelSegment, Sensor } from "./types";

function sensorsByIdMap(sensors: Sensor[]): Record<string, Sensor> {
  return Object.fromEntries(sensors.map((s) => [s.id, s]));
}

function sensorLatLng(
  sensor: Sensor | undefined
): { lat: number; lng: number } | null {
  if (
    sensor?.location?.lat === undefined ||
    sensor?.location?.lng === undefined
  ) {
    return null;
  }
  return { lat: sensor.location.lat, lng: sensor.location.lng };
}

/**
 * Snap only assigned upstream/downstream endpoints to sensor locations.
 * Unlinked ends stay as-is. Intermediate vertices are translated by endpoint deltas.
 */
export function syncSegmentPathToSensors(
  segment: ChannelSegment,
  sensorsById: Record<string, Sensor>
): ChannelSegment {
  const path = (segment.path || []).map((p) => ({ ...p }));
  if (path.length === 0) return { ...segment, path };

  const oldFirst = { ...path[0] };
  const oldLast = { ...path[path.length - 1] };

  const up = segment.upstreamSensorId
    ? sensorLatLng(sensorsById[segment.upstreamSensorId])
    : null;
  const down = segment.downstreamSensorId
    ? sensorLatLng(sensorsById[segment.downstreamSensorId])
    : null;

  if (up) {
    path[0] = { lat: up.lat, lng: up.lng };
  }
  if (down) {
    path[path.length - 1] = { lat: down.lat, lng: down.lng };
  }

  if (path.length <= 2) {
    return { ...segment, path };
  }

  const dStartLat = path[0].lat - oldFirst.lat;
  const dStartLng = path[0].lng - oldFirst.lng;
  const dEndLat = path[path.length - 1].lat - oldLast.lat;
  const dEndLng = path[path.length - 1].lng - oldLast.lng;

  for (let i = 1; i < path.length - 1; i += 1) {
    const t = i / (path.length - 1);
    path[i] = {
      lat: path[i].lat + dStartLat * (1 - t) + dEndLat * t,
      lng: path[i].lng + dStartLng * (1 - t) + dEndLng * t,
    };
  }

  return { ...segment, path };
}

export function syncAllSegmentPaths(
  segments: ChannelSegment[],
  sensors: Sensor[]
): ChannelSegment[] {
  const byId = sensorsByIdMap(sensors);
  return segments.map((seg) => syncSegmentPathToSensors(seg, byId));
}

/** Update only segments that reference the given sensor as an endpoint. */
export function syncSegmentsForSensor(
  sensorId: string,
  segments: ChannelSegment[],
  sensors: Sensor[]
): ChannelSegment[] {
  const byId = sensorsByIdMap(sensors);
  return segments.map((seg) => {
    if (
      seg.upstreamSensorId === sensorId ||
      seg.downstreamSensorId === sensorId
    ) {
      return syncSegmentPathToSensors(seg, byId);
    }
    return seg;
  });
}
