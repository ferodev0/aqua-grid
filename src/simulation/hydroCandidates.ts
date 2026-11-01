import { calculateHydropowerEstimate } from "./simulationEngine";
import type {
  ChannelSegment,
  HydroCandidateSite,
  HydropowerEstimateResult,
  Sensor,
} from "./types";

/** Illustrative channel grade (0.2%) used when no DEM is available. */
export const ASSUMED_CHANNEL_GRADE = 0.002;

export const HYDRO_CANDIDATE_EFFICIENCY = 0.65;
export const MAX_HYDRO_CANDIDATES = 3;
export const MIN_HYDRO_POWER_W = 8;
export const SAMPLE_SPACING_M = 50;
export const MIN_SAMPLES_PER_SEGMENT = 3;
export const MIN_HEAD_M = 0.8;
export const MAX_HEAD_M = 4.0;
/** Skip samples that sit on top of a sensor marker. */
export const SENSOR_EXCLUSION_RADIUS_M = 25;
/** Within this haversine gap, prefer the upstream (along-path) sensor. */
export const NEAREST_DISTANCE_TIE_M = 15;

export interface GenerateHydroCandidatesOptions {
  assumedGrade?: number;
  maxCandidates?: number;
  minPowerW?: number;
  sampleSpacingM?: number;
  minSamplesPerSegment?: number;
  efficiency?: number;
  minHeadM?: number;
  maxHeadM?: number;
  sensorExclusionRadiusM?: number;
}

const EARTH_RADIUS_M = 6_371_000;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistanceM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

interface PathVertex {
  lat: number;
  lng: number;
  /** Cumulative distance from path start to this vertex */
  cumDistM: number;
}

function buildPathProfile(
  path: Array<{ lat: number; lng: number }>
): PathVertex[] {
  if (path.length === 0) return [];
  const profile: PathVertex[] = [
    { lat: path[0].lat, lng: path[0].lng, cumDistM: 0 },
  ];
  let total = 0;
  for (let i = 1; i < path.length; i += 1) {
    total += haversineDistanceM(path[i - 1], path[i]);
    profile.push({ lat: path[i].lat, lng: path[i].lng, cumDistM: total });
  }
  return profile;
}

function interpolateAlongPath(
  profile: PathVertex[],
  targetDistM: number
): { lat: number; lng: number } | null {
  if (profile.length === 0) return null;
  if (profile.length === 1 || targetDistM <= 0) {
    return { lat: profile[0].lat, lng: profile[0].lng };
  }
  const total = profile[profile.length - 1].cumDistM;
  const dist = clamp(targetDistM, 0, total);

  for (let i = 1; i < profile.length; i += 1) {
    const prev = profile[i - 1];
    const next = profile[i];
    if (dist <= next.cumDistM || i === profile.length - 1) {
      const span = Math.max(next.cumDistM - prev.cumDistM, 1e-6);
      const t = clamp((dist - prev.cumDistM) / span, 0, 1);
      return {
        lat: prev.lat + (next.lat - prev.lat) * t,
        lng: prev.lng + (next.lng - prev.lng) * t,
      };
    }
  }
  const last = profile[profile.length - 1];
  return { lat: last.lat, lng: last.lng };
}

/** Nearest chainage along a polyline to an arbitrary lat/lng. */
function nearestChainageOnPath(
  profile: PathVertex[],
  point: { lat: number; lng: number }
): number {
  if (profile.length === 0) return 0;
  if (profile.length === 1) return 0;

  let bestDist = Infinity;
  let bestCum = 0;

  for (let i = 1; i < profile.length; i += 1) {
    const a = profile[i - 1];
    const b = profile[i];
    const abLat = b.lat - a.lat;
    const abLng = b.lng - a.lng;
    const abLen2 = abLat * abLat + abLng * abLng;
    let t = 0;
    if (abLen2 > 1e-18) {
      t = clamp(
        ((point.lat - a.lat) * abLat + (point.lng - a.lng) * abLng) / abLen2,
        0,
        1
      );
    }
    const proj = { lat: a.lat + abLat * t, lng: a.lng + abLng * t };
    const d = haversineDistanceM(point, proj);
    if (d < bestDist) {
      bestDist = d;
      const span = b.cumDistM - a.cumDistM;
      bestCum = a.cumDistM + span * t;
    }
  }
  return bestCum;
}

function getSensorLatLng(
  sensor: Sensor,
  channelSegments: ChannelSegment[]
): { lat: number; lng: number } | null {
  if (
    sensor.location?.lat !== undefined &&
    sensor.location?.lng !== undefined
  ) {
    return { lat: sensor.location.lat, lng: sensor.location.lng };
  }
  const seg = channelSegments.find((s) => s.id === sensor.channelSegmentId);
  if (seg?.path?.length) {
    const mid = seg.path[Math.floor(seg.path.length / 2)];
    return { lat: mid.lat, lng: mid.lng };
  }
  return null;
}

function collectSegmentLinkedSensors(
  segment: ChannelSegment,
  sensors: Sensor[],
  sensorsById: Map<string, Sensor>
): Sensor[] {
  const byId = new Map<string, Sensor>();
  for (const sensor of sensors) {
    if (sensor.channelSegmentId === segment.id) {
      byId.set(sensor.id, sensor);
    }
  }
  if (segment.upstreamSensorId) {
    const up = sensorsById.get(segment.upstreamSensorId);
    if (up) byId.set(up.id, up);
  }
  if (segment.downstreamSensorId) {
    const down = sensorsById.get(segment.downstreamSensorId);
    if (down) byId.set(down.id, down);
  }
  return [...byId.values()];
}

function pickNearestSensor(
  point: { lat: number; lng: number },
  pool: Sensor[],
  channelSegments: ChannelSegment[],
  profile: PathVertex[],
  sampleChainageM: number
): Sensor | undefined {
  type Ranked = {
    sensor: Sensor;
    distM: number;
    chainageM: number;
    isUpstreamOrAt: boolean;
  };

  const ranked: Ranked[] = [];
  for (const sensor of pool) {
    const coords = getSensorLatLng(sensor, channelSegments);
    if (!coords) continue;
    const distM = haversineDistanceM(point, coords);
    const chainageM = nearestChainageOnPath(profile, coords);
    ranked.push({
      sensor,
      distM,
      chainageM,
      isUpstreamOrAt: chainageM <= sampleChainageM + 1e-3,
    });
  }
  if (ranked.length === 0) return undefined;

  ranked.sort((a, b) => {
    const distDelta = a.distM - b.distM;
    if (Math.abs(distDelta) > NEAREST_DISTANCE_TIE_M) {
      return distDelta;
    }
    // Near-tie: prefer sensor at/upstream of the sample along the channel
    if (a.isUpstreamOrAt !== b.isUpstreamOrAt) {
      return a.isUpstreamOrAt ? -1 : 1;
    }
    return distDelta;
  });

  return ranked[0].sensor;
}

/**
 * Pick the flow reference for a candidate sample: nearest sensor linked to the
 * segment (haversine), with upstream preference on near-ties; fall back to the
 * nearest network sensor, then classic upstream/downstream IDs.
 */
function resolveReferenceSensorForPoint(
  point: { lat: number; lng: number },
  segment: ChannelSegment,
  sensors: Sensor[],
  channelSegments: ChannelSegment[],
  sensorsById: Map<string, Sensor>,
  profile: PathVertex[],
  sampleChainageM: number
): Sensor | undefined {
  const linked = collectSegmentLinkedSensors(segment, sensors, sensorsById);
  const fromLinked = pickNearestSensor(
    point,
    linked,
    channelSegments,
    profile,
    sampleChainageM
  );
  if (fromLinked) return fromLinked;

  const fromNetwork = pickNearestSensor(
    point,
    sensors,
    channelSegments,
    profile,
    sampleChainageM
  );
  if (fromNetwork) return fromNetwork;

  if (segment.upstreamSensorId) {
    const up = sensorsById.get(segment.upstreamSensorId);
    if (up) return up;
  }
  if (segment.downstreamSensorId) {
    return sensorsById.get(segment.downstreamSensorId);
  }
  return undefined;
}

function resolveFlowRateLps(sensor: Sensor | undefined): number {
  if (!sensor) return 0;
  if (sensor.status === "offline") {
    return sensor.baseline.flowRateLps;
  }
  return sensor.current.flowRateLps;
}

function isNearAnySensor(
  point: { lat: number; lng: number },
  sensors: Sensor[],
  channelSegments: ChannelSegment[],
  exclusionRadiusM: number
): boolean {
  for (const sensor of sensors) {
    const coords = getSensorLatLng(sensor, channelSegments);
    if (!coords) continue;
    if (haversineDistanceM(point, coords) < exclusionRadiusM) {
      return true;
    }
  }
  return false;
}

/**
 * Samples channel polylines, estimates illustrative head from assumed grade ×
 * distance-from-upstream, scores with live flow from the nearest relevant
 * sensor, and returns top candidate sites.
 */
export function generateHydroCandidateSites(
  channelSegments: ChannelSegment[],
  sensors: Sensor[],
  options: GenerateHydroCandidatesOptions = {}
): HydroCandidateSite[] {
  const assumedGrade = options.assumedGrade ?? ASSUMED_CHANNEL_GRADE;
  const maxCandidates = options.maxCandidates ?? MAX_HYDRO_CANDIDATES;
  const minPowerW = options.minPowerW ?? MIN_HYDRO_POWER_W;
  const sampleSpacingM = options.sampleSpacingM ?? SAMPLE_SPACING_M;
  const minSamples =
    options.minSamplesPerSegment ?? MIN_SAMPLES_PER_SEGMENT;
  const efficiency = options.efficiency ?? HYDRO_CANDIDATE_EFFICIENCY;
  const minHeadM = options.minHeadM ?? MIN_HEAD_M;
  const maxHeadM = options.maxHeadM ?? MAX_HEAD_M;
  const exclusionRadiusM =
    options.sensorExclusionRadiusM ?? SENSOR_EXCLUSION_RADIUS_M;

  const sensorsById = new Map(sensors.map((s) => [s.id, s]));
  const scored: Array<{
    lat: number;
    lng: number;
    segmentId: string;
    referenceSensorId: string;
    netHeadM: number;
    flowRateLps: number;
    efficiency: number;
    estimate: HydropowerEstimateResult;
    lengthFromUpstreamM: number;
  }> = [];

  for (const segment of channelSegments) {
    const path = segment.path || [];
    if (path.length < 2) continue;

    const profile = buildPathProfile(path);
    const totalLengthM = profile[profile.length - 1]?.cumDistM ?? 0;
    if (totalLengthM < 5) continue;

    const sampleCount = Math.max(
      minSamples,
      Math.floor(totalLengthM / sampleSpacingM) + 1
    );

    for (let i = 0; i < sampleCount; i += 1) {
      const t = sampleCount === 1 ? 0.5 : i / (sampleCount - 1);
      // Prefer interior samples (avoid exact endpoints which often sit on sensors)
      const interiorT = 0.12 + t * 0.76;
      const lengthFromUpstreamM = totalLengthM * interiorT;
      const point = interpolateAlongPath(profile, lengthFromUpstreamM);
      if (!point) continue;
      if (
        isNearAnySensor(point, sensors, channelSegments, exclusionRadiusM)
      ) {
        continue;
      }

      const refSensor = resolveReferenceSensorForPoint(
        point,
        segment,
        sensors,
        channelSegments,
        sensorsById,
        profile,
        lengthFromUpstreamM
      );
      const referenceSensorId = refSensor?.id ?? "—";
      const flowRateLps = resolveFlowRateLps(refSensor);

      const netHeadM = clamp(
        assumedGrade * lengthFromUpstreamM,
        minHeadM,
        maxHeadM
      );
      const estimate = calculateHydropowerEstimate({
        flowRateLps,
        netHeadM,
        efficiency,
      });

      if (estimate.powerWatts < minPowerW) continue;

      scored.push({
        lat: Number(point.lat.toFixed(6)),
        lng: Number(point.lng.toFixed(6)),
        segmentId: segment.id,
        referenceSensorId,
        netHeadM: Number(netHeadM.toFixed(2)),
        flowRateLps: Number(flowRateLps.toFixed(2)),
        efficiency,
        estimate,
        lengthFromUpstreamM: Number(lengthFromUpstreamM.toFixed(1)),
      });
    }
  }

  // Keep the best sample per segment, then take global top N
  const bestBySegment = new Map<string, (typeof scored)[number]>();
  for (const site of scored) {
    const prev = bestBySegment.get(site.segmentId);
    if (!prev || site.estimate.powerWatts > prev.estimate.powerWatts) {
      bestBySegment.set(site.segmentId, site);
    }
  }

  const ranked = [...bestBySegment.values()]
    .sort((a, b) => b.estimate.powerWatts - a.estimate.powerWatts)
    .slice(0, maxCandidates);

  return ranked.map((site, index) => ({
    id: `HYDRO-${String(index + 1).padStart(2, "0")}`,
    lat: site.lat,
    lng: site.lng,
    segmentId: site.segmentId,
    referenceSensorId: site.referenceSensorId,
    netHeadM: site.netHeadM,
    efficiency: site.efficiency,
    flowRateLps: site.flowRateLps,
    lengthFromUpstreamM: site.lengthFromUpstreamM,
    estimate: site.estimate,
    rank: index + 1,
    isIllustrative: true as const,
  }));
}
