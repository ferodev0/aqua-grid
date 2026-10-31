import type {
  AlertSeverity,
  AlertThresholds,
  AquaAlert,
  ChannelSegment,
  Sensor,
  SensorStatus,
} from "./types";

/**
 * Deterministically derives a sensor's operating status from its current readings,
 * baseline values, last update timestamp, and configured demonstration thresholds.
 */
export function deriveSensorStatus(
  sensor: Sensor,
  thresholds: AlertThresholds,
  nowMs: number = Date.now(),
  forceOffline: boolean = false
): SensorStatus {
  if (forceOffline) {
    return "offline";
  }

  const updatedAtMs = Date.parse(sensor.current.updatedAt);
  if (
    !Number.isNaN(updatedAtMs) &&
    nowMs - updatedAtMs > thresholds.offlineTimeoutMs
  ) {
    return "offline";
  }

  const baselineFlow = Math.max(sensor.baseline.flowRateLps, 0.01);
  const baselineLevel = Math.max(sensor.baseline.waterLevelM, 0.001);

  const flowRatio = sensor.current.flowRateLps / baselineFlow;
  const levelRatio = sensor.current.waterLevelM / baselineLevel;
  const worstRatio = Math.min(flowRatio, levelRatio);

  if (worstRatio < thresholds.criticalFlowRatio) {
    return "critical";
  }
  if (worstRatio < thresholds.warningFlowRatio) {
    return "warning";
  }

  return "normal";
}

/**
 * Evaluates all sensors and channel segments against deterministic alert rules.
 *
 * Crucial design invariant (Spec Section 8.4):
 * - Avoids generating duplicate alerts on every simulation tick.
 * - Creates an alert only when a condition enters an abnormal state (or upgrades severity).
 * - Automatically resolves active alerts when the underlying condition returns to normal.
 * - Uses careful, non-speculative language ("inspection recommended", "unusual flow reduction")
 *   rather than claiming confirmed leaks.
 */
export function evaluateNetworkAlerts(
  sensors: Sensor[],
  channelSegments: ChannelSegment[],
  existingAlerts: AquaAlert[],
  thresholds: AlertThresholds,
  nowIso: string = new Date().toISOString()
): AquaAlert[] {
  const sensorMap = new Map<string, Sensor>(sensors.map((s) => [s.id, s]));
  let updatedAlerts = existingAlerts.map((alert) => ({ ...alert }));

  const findActiveAlertByPrefix = (prefix: string): AquaAlert | undefined =>
    updatedAlerts.find(
      (a) => a.status === "active" && a.id.startsWith(prefix)
    );

  // 1. Evaluate individual sensor status rules
  for (const sensor of sensors) {
    const rulePrefix = `ALT-SENSOR-${sensor.id}-`;
    const existingActive = findActiveAlertByPrefix(rulePrefix);

    if (sensor.status === "normal") {
      // Resolve any active alert for this sensor
      if (existingActive) {
        updatedAlerts = updatedAlerts.map((a) =>
          a.id === existingActive.id ? { ...a, status: "resolved" } : a
        );
      }
      continue;
    }

    const flowPct = Math.round(
      (sensor.current.flowRateLps / Math.max(sensor.baseline.flowRateLps, 0.01)) * 100
    );

    let severity: AlertSeverity = "warning";
    let title = "";
    let message = "";

    if (sensor.status === "offline") {
      severity = "warning";
      title = `Sensor ${sensor.id} (${sensor.name}) has stopped reporting`;
      message = `No simulated telemetry received from ${sensor.name} (${sensor.id}) within the expected reporting window. Check station connectivity and power.`;
    } else if (sensor.status === "critical") {
      severity = "critical";
      title = `Significant flow reduction at ${sensor.id} (${sensor.name})`;
      message = `Current simulated flow at ${sensor.name} is ${sensor.current.flowRateLps.toFixed(
        1
      )} L/s (${flowPct}% of ${sensor.baseline.flowRateLps.toFixed(
        1
      )} L/s baseline) with water level at ${sensor.current.waterLevelM.toFixed(
        2
      )} m. Unexpected downstream reduction — field inspection recommended.`;
    } else if (sensor.status === "warning") {
      severity = "warning";
      title = `Below-baseline flow observed at ${sensor.id} (${sensor.name})`;
      message = `Simulated flow at ${sensor.name} decreased to ${sensor.current.flowRateLps.toFixed(
        1
      )} L/s (${flowPct}% of ${sensor.baseline.flowRateLps.toFixed(
        1
      )} L/s baseline). Monitor section and consider visual inspection if reduction persists.`;
    }

    if (existingActive) {
      // Update severity/message in place if status changed (e.g. warning -> critical) without duplicating
      if (existingActive.severity !== severity || existingActive.title !== title) {
        updatedAlerts = updatedAlerts.map((a) =>
          a.id === existingActive.id
            ? {
                ...a,
                severity,
                title,
                message,
              }
            : a
        );
      }
    } else {
      const newAlert: AquaAlert = {
        id: `${rulePrefix}${Date.now()}`,
        severity,
        title,
        message,
        sensorIds: [sensor.id],
        channelSegmentId: sensor.channelSegmentId,
        createdAt: nowIso,
        status: "active",
        source: "simulation",
      };
      updatedAlerts = [newAlert, ...updatedAlerts];
    }
  }

  // 2. Evaluate upstream vs. downstream channel segment comparison rules
  for (const segment of channelSegments) {
    if (!segment.upstreamSensorId || !segment.downstreamSensorId) {
      continue;
    }

    const upstream = sensorMap.get(segment.upstreamSensorId);
    const downstream = sensorMap.get(segment.downstreamSensorId);
    if (!upstream || !downstream) {
      continue;
    }

    const rulePrefix = `ALT-SEG-${segment.id}-`;
    const existingActive = findActiveAlertByPrefix(rulePrefix);

    if (upstream.status === "offline" || downstream.status === "offline") {
      continue;
    }

    // If either station is already warning/critical, the per-sensor alert
    // covers it — skip duplicate section comparison logs.
    if (upstream.status !== "normal" || downstream.status !== "normal") {
      if (existingActive) {
        updatedAlerts = updatedAlerts.map((a) =>
          a.id === existingActive.id ? { ...a, status: "resolved" } : a
        );
      }
      continue;
    }

    const upstreamRatio =
      upstream.current.flowRateLps / Math.max(upstream.baseline.flowRateLps, 0.01);
    const downstreamRatio =
      downstream.current.flowRateLps / Math.max(downstream.baseline.flowRateLps, 0.01);

    // Relative reduction between upstream performance and downstream performance
    const relativeDrop = upstreamRatio - downstreamRatio;

    if (relativeDrop >= thresholds.sectionDiscrepancyRatio) {
      const severity: AlertSeverity =
        relativeDrop >= thresholds.sectionDiscrepancyRatio * 1.6
          ? "critical"
          : "warning";

      const dropPercent = Math.round(relativeDrop * 100);
      const title = `Unusual flow reduction detected between ${upstream.id} and ${downstream.id}`;
      const message = `Comparison across ${segment.name} shows ${upstream.id} near ${Math.round(
        upstreamRatio * 100
      )}% of baseline (${upstream.current.flowRateLps.toFixed(
        1
      )} L/s) while downstream ${downstream.id} dropped to ${Math.round(
        downstreamRatio * 100
      )}% of baseline (${downstream.current.flowRateLps.toFixed(
        1
      )} L/s) — a ${dropPercent}% relative divergence. Possible loss, withdrawal, or channel diversion; inspection recommended.`;

      if (existingActive) {
        if (existingActive.severity !== severity) {
          updatedAlerts = updatedAlerts.map((a) =>
            a.id === existingActive.id
              ? { ...a, severity, title, message }
              : a
          );
        }
      } else {
        const newSegmentAlert: AquaAlert = {
          id: `${rulePrefix}${Date.now()}`,
          severity,
          title,
          message,
          sensorIds: [upstream.id, downstream.id],
          channelSegmentId: segment.id,
          createdAt: nowIso,
          status: "active",
          source: "simulation",
        };
        updatedAlerts = [newSegmentAlert, ...updatedAlerts];
      }
    } else if (existingActive) {
      // Upstream/downstream balance returned within threshold
      updatedAlerts = updatedAlerts.map((a) =>
        a.id === existingActive.id ? { ...a, status: "resolved" } : a
      );
    }
  }

  // Keep a bounded list of max 50 alerts so memory remains clean during long demos
  return updatedAlerts.slice(0, 50);
}
