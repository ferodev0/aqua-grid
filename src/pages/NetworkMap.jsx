import {
  Fragment,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  Tooltip,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { AppLayout } from '../components/layout/AppLayout';
import { StatusBadge } from '../components/sensors/StatusBadge';
import { useLanguage } from '../context/LanguageContext';
import { useNetwork } from '../context/NetworkContext';
import { useTheme } from '../context/ThemeContext';
import {
  KNOWN_AREAS_BY_VILLAGE,
  KNOWN_VILLAGES,
} from '../simulation/demoData';

const LEFKE_CENTER = [35.1135, 32.851];
const DEFAULT_ZOOM = 14;

const STATUS_MARKER_COLORS = {
  normal: '#10b981', // emerald-500 (Green)
  warning: '#f59e0b', // amber-500 (Amber)
  critical: '#ef4444', // red-500 (Red)
  offline: '#64748b', // slate-500 (Grey)
};

const SENSOR_ALERT_CARD_STYLES = {
  warning:
    'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/45 dark:text-amber-200',
  critical:
    'border-red-300 bg-red-50 text-red-900 dark:border-red-800/70 dark:bg-red-950/45 dark:text-red-200',
};

function isAlertingStatus(status) {
  return status === 'warning' || status === 'critical';
}

/** Same glyph as sidebar Sensors nav item (broadcast / radio sensor). */
function SensorGlyphIcon({ size = 16 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="1.5" fill="#ffffff" />
      <path
        d="M8.5 8.5a5 5 0 000 7"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 5.5a9.5 9.5 0 000 13"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 8.5a5 5 0 010 7"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.5 5.5a9.5 9.5 0 010 13"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EnergyGlyphIcon({ size = 16, color = '#0284c7' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <path
        fill={color}
        d="M13.2 2.4 5.5 13.2h5.1l-.9 8.4 8.4-12h-5.2l1.3-7.2z"
      />
    </svg>
  );
}

function formatTimeAgo(isoString, t, locale) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  const diffSec = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (diffSec < 5) return t('map.justNow');
  if (diffSec < 60) return t('map.secAgo', { count: diffSec });
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return t('map.minAgo', { count: diffMin });
  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getSensorCoords(sensor, channelSegments) {
  if (
    sensor.location?.lat !== undefined &&
    sensor.location?.lng !== undefined
  ) {
    return [sensor.location.lat, sensor.location.lng];
  }
  const seg = channelSegments.find((s) => s.id === sensor.channelSegmentId);
  if (seg && seg.path.length > 0) {
    const mid = seg.path[Math.floor(seg.path.length / 2)];
    return [mid.lat, mid.lng];
  }
  return LEFKE_CENTER;
}

/**
 * Projects a lat/lng click onto the nearest channel segment if within threshold,
 * returning the snapped coordinate and segment metadata.
 */
function findNearestSegmentProjection(
  latlng,
  channelSegments,
  maxDistDeg = 0.008
) {
  const { lat, lng } = latlng;
  let best = null;

  for (const segment of channelSegments) {
    const path = segment.path || [];
    if (path.length < 2) continue;

    for (let i = 0; i < path.length - 1; i += 1) {
      const p1 = path[i];
      const p2 = path[i + 1];
      const dx = p2.lng - p1.lng;
      const dy = p2.lat - p1.lat;
      const lenSq = dx * dx + dy * dy;
      const rawT =
        lenSq > 0 ? ((lng - p1.lng) * dx + (lat - p1.lat) * dy) / lenSq : 0;
      const t = Math.max(0, Math.min(1, rawT));
      const projLat = Number((p1.lat + t * dy).toFixed(5));
      const projLng = Number((p1.lng + t * dx).toFixed(5));
      const dist = Math.hypot(lat - projLat, lng - projLng);

      if (dist <= maxDistDeg && (!best || dist < best.dist)) {
        best = {
          segment,
          lat: projLat,
          lng: projLng,
          dist,
          ratioAlongSegment: (i + t) / Math.max(1, path.length - 1),
        };
      }
    }
  }

  return best;
}

function MapClickHandler({ mode, onMapClick }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return undefined;
    const handleClick = (event) => {
      if (mode === 'draw' || mode === 'place') {
        onMapClick(event.latlng);
      }
    };
    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [map, mode, onMapClick]);

  return null;
}

/**
 * Clears sensor/segment selection when the user presses on empty map chrome
 * (tiles, etc.). Uses capture-phase DOM events so it is not affected by
 * Leaflet layer/map click ordering quirks.
 */
function MapBackgroundDeselect({ enabled, onDeselect }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !enabled) return undefined;
    const container = map.getContainer();

    const onPointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      // Keep selection when interacting with markers, lines, tooltips, or map chrome.
      if (
        target.closest(
          '.leaflet-overlay-pane .leaflet-interactive, .leaflet-marker-icon, .leaflet-tooltip, .leaflet-popup, .leaflet-control'
        )
      ) {
        return;
      }

      onDeselect();
    };

    container.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      container.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [map, enabled, onDeselect]);

  return null;
}

function MapViewportController({ mode, flyTarget, resetCounter }) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    if (!container) return;
    if (mode === 'draw' || mode === 'place') {
      container.style.cursor = 'crosshair';
    } else {
      container.style.cursor = '';
    }
  }, [map, mode]);

  useEffect(() => {
    if (flyTarget && flyTarget.length === 2) {
      map.flyTo(flyTarget, Math.max(map.getZoom(), 15), { duration: 0.6 });
    }
  }, [map, flyTarget]);

  useEffect(() => {
    if (resetCounter > 0) {
      map.flyTo(LEFKE_CENTER, DEFAULT_ZOOM, { duration: 0.6 });
    }
  }, [map, resetCounter]);

  return null;
}

/** Keeps Leaflet zoom control title/aria labels in sync with UI language. */
function LocalizedMapChrome({ zoomInLabel, zoomOutLabel }) {
  const map = useMap();

  useEffect(() => {
    const zoomEl = map.zoomControl?.getContainer?.();
    if (!zoomEl) return;
    const links = zoomEl.querySelectorAll('a');
    const inBtn = links[0];
    const outBtn = links[1];
    if (inBtn) {
      inBtn.title = zoomInLabel;
      inBtn.setAttribute('aria-label', zoomInLabel);
    }
    if (outBtn) {
      outBtn.title = zoomOutLabel;
      outBtn.setAttribute('aria-label', zoomOutLabel);
    }
  }, [map, zoomInLabel, zoomOutLabel]);

  return null;
}

/**
 * Fits viewport once when sensor/channel geometry changes.
 * Skips telemetry-only ticks so manual zoom is not reset.
 */
function FitBoundsToNetwork({ sensors, channelSegments }) {
  const map = useMap();
  const lastFittedKeyRef = useRef(null);

  const geometryKey = useMemo(() => {
    const sensorPart = sensors
      .map((s) => {
        const [lat, lng] = getSensorCoords(s, channelSegments);
        return `${s.id}:${lat},${lng}`;
      })
      .join('|');
    const segPart = channelSegments
      .map(
        (seg) =>
          `${seg.id}:${(seg.path || [])
            .map((p) => `${p.lat},${p.lng}`)
            .join(';')}`
      )
      .join('|');
    return `${sensorPart}#${segPart}`;
  }, [sensors, channelSegments]);

  useEffect(() => {
    if (lastFittedKeyRef.current === geometryKey) return;
    lastFittedKeyRef.current = geometryKey;

    const points = [];
    sensors.forEach((s) => {
      points.push(getSensorCoords(s, channelSegments));
    });
    channelSegments.forEach((seg) => {
      (seg.path || []).forEach((p) => points.push([p.lat, p.lng]));
    });
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], DEFAULT_ZOOM);
      return;
    }
    map.fitBounds(points, { padding: [48, 48], maxZoom: 16 });
  }, [map, geometryKey, sensors, channelSegments]);

  return null;
}

/**
 * SVG Schematic Network Diagram fallback (Spec Section 7.2 & 10).
 */
function SchematicNetworkDiagram({
  sensors,
  channelSegments,
  selectedSensorId,
  selectedSegmentId,
  onSelectSensor,
  onSelectSegment,
  t,
}) {
  const allCoords = useMemo(() => {
    const pts = [];
    channelSegments.forEach((seg) => {
      seg.path.forEach((p) => pts.push([p.lat, p.lng]));
    });
    sensors.forEach((s) => {
      const c = getSensorCoords(s, channelSegments);
      if (c) pts.push(c);
    });
    return pts;
  }, [sensors, channelSegments]);

  const bounds = useMemo(() => {
    if (allCoords.length === 0) {
      return {
        minLat: 35.102,
        maxLat: 35.125,
        minLng: 32.84,
        maxLng: 32.862,
      };
    }
    const lats = allCoords.map((c) => c[0]);
    const lngs = allCoords.map((c) => c[1]);
    // Modest padding so markers aren't clipped; keep shape close to the map.
    const padLat = 0.0012;
    const padLng = 0.0012;
    return {
      minLat: Math.min(...lats) - padLat,
      maxLat: Math.max(...lats) + padLat,
      minLng: Math.min(...lngs) - padLng,
      maxLng: Math.max(...lngs) + padLng,
    };
  }, [allCoords]);

  const width = 760;
  const height = 460;

  /**
   * Uniform geographic scale (meters) so schematic channel shapes match the
   * interactive map instead of independently stretching lat vs lng into the SVG.
   */
  const project = useCallback(
    (lat, lng) => {
      const drawLeft = 48;
      const drawTop = 40;
      const drawWidth = width - 96;
      const drawHeight = height - 90;
      const midLat = (bounds.minLat + bounds.maxLat) / 2;
      const metersPerDegLat = 111_320;
      const metersPerDegLng =
        111_320 * Math.max(0.2, Math.cos((midLat * Math.PI) / 180));

      const geoWidthM = Math.max(
        (bounds.maxLng - bounds.minLng) * metersPerDegLng,
        1
      );
      const geoHeightM = Math.max(
        (bounds.maxLat - bounds.minLat) * metersPerDegLat,
        1
      );
      const scale = Math.min(drawWidth / geoWidthM, drawHeight / geoHeightM);
      const usedW = geoWidthM * scale;
      const usedH = geoHeightM * scale;
      const offsetX = drawLeft + (drawWidth - usedW) / 2;
      const offsetY = drawTop + (drawHeight - usedH) / 2;

      return {
        x: offsetX + (lng - bounds.minLng) * metersPerDegLng * scale,
        y: offsetY + (bounds.maxLat - lat) * metersPerDegLat * scale,
      };
    },
    [bounds]
  );

  return (
    <div className="flex h-full min-h-[540px] w-full flex-col justify-between rounded-xl border border-slate-200 bg-slate-900 p-4 text-slate-100 shadow-inner">
      <div className="border-b border-slate-800 pb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400">
          {t('map.schematicBadge')}
        </span>
        <h4 className="text-sm font-semibold text-white">
          {t('map.schematicTitle')}
        </h4>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="my-auto h-full max-h-[420px] w-full select-none"
      >
        <defs>
          <pattern
            id="schematic-grid"
            width="38"
            height="38"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 38 0 L 0 0 0 38"
              fill="none"
              stroke="#1e293b"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#schematic-grid)" rx="8" />

        {/* Channel segments */}
        {channelSegments.map((seg) => {
          const pts = seg.path.map((p) => project(p.lat, p.lng));
          const pointsStr = pts
            .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
            .join(' ');
          const isSelected = seg.id === selectedSegmentId;
          const downstreamSensor = sensors.find(
            (s) => s.id === seg.downstreamSensorId
          );
          const hasCriticalAnomaly = downstreamSensor?.status === 'critical';
          const hasWarningAnomaly = downstreamSensor?.status === 'warning';
          const strokeColor = hasCriticalAnomaly
            ? '#ef4444'
            : hasWarningAnomaly
            ? '#f59e0b'
            : isSelected
            ? '#2dd4bf'
            : '#0d9488';

          return (
            <g
              key={seg.id}
              onClick={() => onSelectSegment(seg.id)}
              className="cursor-pointer"
            >
              <polyline
                fill="none"
                stroke={strokeColor}
                strokeWidth={isSelected ? 8 : 5}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={
                  hasCriticalAnomaly || hasWarningAnomaly ? '8 6' : undefined
                }
                points={pointsStr}
                opacity={0.9}
              />
            </g>
          );
        })}

        {/* Sensor nodes */}
        {sensors.map((sensor) => {
          const [lat, lng] = getSensorCoords(sensor, channelSegments);
          const pt = project(lat, lng);
          const color =
            STATUS_MARKER_COLORS[sensor.status] || STATUS_MARKER_COLORS.normal;
          const isSelected = sensor.id === selectedSensorId;
          const isAlerting = isAlertingStatus(sensor.status);

          return (
            <g
              key={sensor.id}
              onClick={() => onSelectSensor(sensor.id)}
              className="cursor-pointer"
            >
              {isSelected && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="19"
                  fill="none"
                  stroke="#2dd4bf"
                  strokeWidth="2.5"
                  strokeDasharray="4 3"
                />
              )}
              {isAlerting && (
                <>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="26"
                    fill={color}
                    fillOpacity="0.28"
                    stroke="#ffffff"
                    strokeWidth="3"
                    className="aqua-sensor-pulse-halo"
                  />
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="20"
                    fill="none"
                    stroke={color}
                    strokeWidth="4"
                    className="aqua-sensor-pulse-ring"
                  />
                </>
              )}
              <circle
                cx={pt.x}
                cy={pt.y}
                r="13"
                fill={color}
                stroke="#ffffff"
                strokeWidth={isAlerting ? 4 : 3}
                className={isAlerting ? 'aqua-sensor-pulse' : undefined}
              />
              <g
                transform={`translate(${pt.x - 7}, ${pt.y - 7}) scale(${14 / 24})`}
                className={isAlerting ? 'aqua-sensor-pulse' : undefined}
              >
                <circle cx="12" cy="12" r="1.5" fill="#ffffff" stroke="none" />
                <path
                  d="M8.5 8.5a5 5 0 000 7"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M5.5 5.5a9.5 9.5 0 000 13"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M15.5 8.5a5 5 0 010 7"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M18.5 5.5a9.5 9.5 0 010 13"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
              <text
                x={pt.x}
                y={pt.y + 24}
                textAnchor="middle"
                className="fill-slate-200 text-[9px] font-bold"
              >
                {sensor.id}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-2 text-[11px] text-slate-400">
        <span>{t('map.schematicFooterHint')}</span>
        <span>{t('map.schematicDirection')}</span>
      </div>
    </div>
  );
}

export function NetworkMap({ title }) {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const {
    language,
    t,
    tSensorName,
    tSegmentName,
    tVillage,
    tArea,
    tAlert,
  } = useLanguage();
  const {
    sensors,
    channelSegments,
    alerts,
    summaryMetrics,
    hydroCandidates,
    isCrisisActive,
    addSensor,
    updateSensor,
    removeSensor,
    addChannelSegment,
    updateChannelSegment,
    removeChannelSegment,
    toggleSensorOffline,
    exportNetworkDraft,
    importNetworkDraft,
  } = useNetwork();

  const draftFileInputRef = useRef(null);

  // Map view & interaction state
  const [viewType, setViewType] = useState('map'); // 'map' | 'schematic'
  const [mode, setMode] = useState('view'); // 'view' | 'place' | 'draw'
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);

  // Selection state (stores IDs so data is always read live from simulation)
  const [selectedSensorId, setSelectedSensorId] = useState(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [showHydroCandidates, setShowHydroCandidates] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);
  const [resetViewCounter, setResetViewCounter] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Channel drawing state
  const [channelPoints, setChannelPoints] = useState([]);
  const [branchPoint, setBranchPoint] = useState(null);
  const [newSegmentName, setNewSegmentName] = useState('');

  // New Virtual Sensor Form state
  const [newSensorForm, setNewSensorForm] = useState({
    name: '',
    channelSegmentId: 'SEG-02',
    village: 'Lefke',
    area: 'Central Town Aqueduct',
    flowRateLps: '9.5',
    waterLevelM: '0.35',
    lat: '35.1105',
    lng: '32.8485',
    label: '',
  });

  // Live selected sensor or segment from shared state
  const selectedSensor = useMemo(
    () => sensors.find((s) => s.id === selectedSensorId) ?? null,
    [sensors, selectedSensorId]
  );

  const selectedSegment = useMemo(
    () => channelSegments.find((s) => s.id === selectedSegmentId) ?? null,
    [channelSegments, selectedSegmentId]
  );

  const selectedCandidate = useMemo(
    () => hydroCandidates.find((c) => c.id === selectedCandidateId) ?? null,
    [hydroCandidates, selectedCandidateId]
  );

  useEffect(() => {
    if (
      selectedCandidateId &&
      !hydroCandidates.some((c) => c.id === selectedCandidateId)
    ) {
      setSelectedCandidateId(null);
    }
  }, [hydroCandidates, selectedCandidateId]);

  const selectedSensorAlertSummary = useMemo(() => {
    if (!selectedSensor) return { latest: null, total: 0 };
    const sensorId = selectedSensor.id.toLowerCase();
    const matching = alerts
      .filter(
        (alert) =>
          alert.status === 'active' &&
          isAlertingStatus(alert.severity) &&
          alert.sensorIds.some((id) => id.toLowerCase() === sensorId)
      )
      .sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || 0
      );
    return { latest: matching[0] ?? null, total: matching.length };
  }, [alerts, selectedSensor]);

  const buildSensorFormValues = useCallback(
    (sensor) => {
      if (!sensor) {
        return {
          name: '',
          channelSegmentId: 'SEG-01',
          village: 'Lefke',
          area: 'Upper Valley Intake',
          label: '',
          flowRateLps: '8.0',
          waterLevelM: '0.30',
          lat: '35.1065',
          lng: '32.8452',
        };
      }
      const [lat, lng] = getSensorCoords(sensor, channelSegments);
      return {
        name: sensor.name,
        channelSegmentId: sensor.channelSegmentId || 'SEG-01',
        village: sensor.village || sensor.location?.village || 'Lefke',
        area:
          sensor.area ||
          sensor.location?.area ||
          'Upper Valley Intake',
        label: sensor.location?.label || '',
        flowRateLps: String(sensor.baseline.flowRateLps),
        waterLevelM: String(sensor.baseline.waterLevelM),
        lat: String(lat),
        lng: String(lng),
      };
    },
    [channelSegments]
  );

  // Edit Sensor Form state synced when a sensor is selected
  const [editSensorForm, setEditSensorForm] = useState(() =>
    buildSensorFormValues(sensors[0])
  );

  const openEditPanel = useCallback(() => {
    setIsEditPanelOpen(true);
  }, []);

  const closeEditPanel = useCallback(() => {
    setIsEditPanelOpen(false);
  }, []);

  const handleSelectSensor = useCallback(
    (sensorId, shouldFly = false, sensorOverride = null) => {
      setSelectedSensorId(sensorId);
      setSelectedSegmentId(null);
      setSelectedCandidateId(null);
      setConfirmDeleteId(null);
      const targetSensor =
        sensorOverride || sensors.find((s) => s.id === sensorId);
      if (targetSensor) {
        setEditSensorForm(buildSensorFormValues(targetSensor));
        if (shouldFly) {
          setFlyTarget(getSensorCoords(targetSensor, channelSegments));
        }
      }
    },
    [sensors, channelSegments, buildSensorFormValues]
  );

  const handleSelectSegment = useCallback((segmentId) => {
    setSelectedSegmentId(segmentId);
    setSelectedSensorId(null);
    setSelectedCandidateId(null);
    setConfirmDeleteId(null);
  }, []);

  const handleSelectCandidate = useCallback((candidateId) => {
    setSelectedCandidateId(candidateId);
    setSelectedSensorId(null);
    setSelectedSegmentId(null);
    setConfirmDeleteId(null);
    setIsEditPanelOpen(false);
  }, []);

  const clearMapSelection = useCallback(() => {
    setSelectedSensorId(null);
    setSelectedSegmentId(null);
    setSelectedCandidateId(null);
    setConfirmDeleteId(null);
    setIsEditPanelOpen(false);
  }, []);

  // Map click handler for 'place' (add virtual sensor) and 'draw' (draw channel segment)
  const handleMapClick = useCallback(
    (latlng) => {
      const clickedLat = Number(latlng.lat.toFixed(5));
      const clickedLng = Number(latlng.lng.toFixed(5));

      if (mode === 'place') {
        const nearest = findNearestSegmentProjection(
          latlng,
          channelSegments,
          0.012
        );
        const targetSegment =
          nearest?.segment ||
          channelSegments.find(
            (s) => s.id === newSensorForm.channelSegmentId
          ) ||
          channelSegments[0];

        const finalLat = nearest ? nearest.lat : clickedLat;
        const finalLng = nearest ? nearest.lng : clickedLng;

        const upSensor = sensors.find(
          (s) => s.id === targetSegment?.upstreamSensorId
        );
        const downSensor = sensors.find(
          (s) => s.id === targetSegment?.downstreamSensorId
        );
        const ratio = nearest?.ratioAlongSegment ?? 0.5;
        const interpolatedFlow =
          upSensor && downSensor
            ? Number(
                (
                  upSensor.baseline.flowRateLps * (1 - ratio) +
                  downSensor.baseline.flowRateLps * ratio
                ).toFixed(1)
              )
            : Number(newSensorForm.flowRateLps) || 8.5;
        const interpolatedLevel =
          upSensor && downSensor
            ? Number(
                (
                  upSensor.baseline.waterLevelM * (1 - ratio) +
                  downSensor.baseline.waterLevelM * ratio
                ).toFixed(2)
              )
            : Number(newSensorForm.waterLevelM) || 0.32;

        const village =
          targetSegment?.village || newSensorForm.village || 'Lefke';
        const area =
          targetSegment?.area ||
          newSensorForm.area ||
          KNOWN_AREAS_BY_VILLAGE[village]?.[0] ||
          'Upper Valley Intake';

        const created = addSensor({
          name:
            newSensorForm.name.trim() ||
            `${tVillage(village)} S0${sensors.length + 1}`,
          channelSegmentId: targetSegment?.id || 'SEG-01',
          village,
          area,
          location: {
            lat: finalLat,
            lng: finalLng,
            label:
              newSensorForm.label.trim() ||
              `${tArea(area)} (${
                nearest ? 'Placed on channel' : 'Illustrative point'
              })`,
            village,
            area,
          },
          baseline: {
            flowRateLps: interpolatedFlow,
            waterLevelM: interpolatedLevel,
          },
        });

        setMode('view');
        handleSelectSensor(created.id, false, created);
        return;
      }

      if (mode === 'draw') {
        if (channelPoints.length === 0) {
          const nearest = findNearestSegmentProjection(
            latlng,
            channelSegments,
            0.008
          );
          if (nearest) {
            const flowToBranch = Math.min(
              0.55,
              Math.max(0.2, nearest.ratioAlongSegment * 0.45 + 0.15)
            );
            setBranchPoint({
              parentSegmentId: nearest.segment.id,
              parentSegmentName: nearest.segment.name,
              village: nearest.segment.village || 'Lefke',
              area: nearest.segment.area || 'Upper Valley Intake',
              point: [nearest.lat, nearest.lng],
              flowToBranch,
              flowContinues: Number((1 - flowToBranch).toFixed(2)),
            });
            setChannelPoints([[nearest.lat, nearest.lng]]);
            return;
          }
        }
        setChannelPoints((prev) => [...prev, [clickedLat, clickedLng]]);
      }
    },
    [
      mode,
      channelSegments,
      sensors,
      newSensorForm,
      addSensor,
      handleSelectSensor,
      channelPoints.length,
      tVillage,
      tArea,
    ]
  );

  const handleFinishDrawing = useCallback(() => {
    if (channelPoints.length < 2) {
      setChannelPoints([]);
      setBranchPoint(null);
      setMode('view');
      return;
    }

    const village = branchPoint?.village || 'Lefke';
    const area =
      KNOWN_AREAS_BY_VILLAGE[village]?.[0] || 'Upper Valley Intake';

    const createdSegment = addChannelSegment({
      name:
        newSegmentName.trim() ||
        (branchPoint
          ? `Branch (${branchPoint.parentSegmentId})`
          : `Section ${channelSegments.length + 1}`),
      village,
      area,
      path: channelPoints.map(([lat, lng]) => ({ lat, lng })),
    });

    setChannelPoints([]);
    setBranchPoint(null);
    setNewSegmentName('');
    setMode('view');
    handleSelectSegment(createdSegment.id);
  }, [
    channelPoints,
    branchPoint,
    newSegmentName,
    channelSegments.length,
    addChannelSegment,
    handleSelectSegment,
  ]);

  const handleCancelDrawing = useCallback(() => {
    setChannelPoints([]);
    setBranchPoint(null);
    setMode('view');
  }, []);

  const handleSaveSensorEdits = (event) => {
    event.preventDefault();
    if (!selectedSensor) return;

    updateSensor(selectedSensor.id, {
      name: editSensorForm.name.trim() || selectedSensor.name,
      channelSegmentId: editSensorForm.channelSegmentId,
      village: editSensorForm.village,
      area: editSensorForm.area.trim() || selectedSensor.area,
      location: {
        lat: Number(editSensorForm.lat) || selectedSensor.location?.lat,
        lng: Number(editSensorForm.lng) || selectedSensor.location?.lng,
        label:
          editSensorForm.label.trim() || selectedSensor.location?.label || '',
        village: editSensorForm.village,
        area: editSensorForm.area.trim() || selectedSensor.area,
      },
      baseline: {
        flowRateLps: Math.max(
          0.1,
          Number(editSensorForm.flowRateLps) ||
            selectedSensor.baseline.flowRateLps
        ),
        waterLevelM: Math.max(
          0.02,
          Number(editSensorForm.waterLevelM) ||
            selectedSensor.baseline.waterLevelM
        ),
      },
    });
  };

  return (
    <AppLayout title={title ?? t('nav.map')} denseHeader>
      {/* Top Status & Map Controls Bar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
        {/* Map Status Summary Pills (Spec Section 7.2) */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-700">
            <span className="h-2 w-2 rounded-full bg-teal-500" />
            <span>{t('map.stationsLabel')}</span>
            <strong className="font-bold text-slate-900">
              {summaryMetrics.activeSensorsCount}/{summaryMetrics.totalSensors}
            </strong>
          </div>

          <div
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-medium ${
              summaryMetrics.attentionSensorsCount > 0
                ? 'border-amber-300 bg-amber-50 text-amber-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                summaryMetrics.attentionSensorsCount > 0
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
            />
            <span>
              {summaryMetrics.attentionSensorsCount > 0
                ? t('map.needInspection', {
                    count: summaryMetrics.attentionSensorsCount,
                  })
                : t('map.allNormal')}
            </span>
          </div>

          <div
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-medium ${
              isCrisisActive
                ? 'border-red-300 bg-red-50 text-red-700'
                : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
          >
            <span>{t('map.openAlertsLabel')}</span>
            <strong className="font-bold">
              {summaryMetrics.openAlertsCount}
            </strong>
          </div>
        </div>

        {/* Interactive Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {viewType === 'map' && (
            <>
              <button
                type="button"
                onClick={() => {
                  if (mode === 'view') {
                    setChannelPoints([]);
                    setBranchPoint(null);
                    setMode('place');
                  } else {
                    handleCancelDrawing();
                  }
                }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  mode !== 'view'
                    ? 'border-teal-600 bg-teal-600 text-white shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
                title={t('map.editorTooltip')}
              >
                {mode !== 'view' ? t('map.editorActiveBtn') : t('map.editorBtn')}
              </button>

              <button
                type="button"
                onClick={() => setResetViewCounter((c) => c + 1)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                title={t('map.centerLefkeTooltip')}
              >
                {t('map.centerLefkeBtn')}
              </button>

              <button
                type="button"
                onClick={() => exportNetworkDraft()}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                title={t('map.exportDraftTooltip')}
              >
                {t('map.exportDraftBtn')}
              </button>

              <button
                type="button"
                onClick={() => draftFileInputRef.current?.click()}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                title={t('map.importDraftTooltip')}
              >
                {t('map.importDraftBtn')}
              </button>

              <input
                ref={draftFileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (!file) return;
                  try {
                    const text = await file.text();
                    const parsed = JSON.parse(text);
                    const ok = importNetworkDraft(parsed);
                    if (!ok) {
                      window.alert(t('map.importDraftInvalid'));
                    }
                  } catch {
                    window.alert(t('map.importDraftInvalid'));
                  }
                }}
              />
            </>
          )}

        </div>
      </div>

      {/* Add Editor banner: choose sensor or channel, then click the map */}
      {mode !== 'view' && viewType === 'map' && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-teal-300 bg-teal-50 px-4 py-2.5 text-xs text-teal-900">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
            <div className="flex rounded-lg border border-teal-200 bg-white/80 p-0.5">
              <button
                type="button"
                onClick={() => {
                  setChannelPoints([]);
                  setBranchPoint(null);
                  setMode('place');
                }}
                className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                  mode === 'place'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-teal-800 hover:bg-teal-100'
                }`}
              >
                {t('map.editorAddSensor')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setChannelPoints([]);
                  setBranchPoint(null);
                  setMode('draw');
                }}
                className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                  mode === 'draw'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-teal-800 hover:bg-teal-100'
                }`}
              >
                {t('map.editorAddChannel')}
              </button>
            </div>

            {mode === 'place' ? (
              <div className="flex items-center gap-2 font-medium">
                <span className="inline-block h-2.5 w-2.5 animate-ping rounded-full bg-teal-600" />
                <span>{t('map.placeModeDesc')}</span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3 font-medium">
                <span>
                  {t('map.drawModeDesc', { count: channelPoints.length })}{' '}
                  {branchPoint &&
                    t('map.branchingNotice', {
                      id: branchPoint.parentSegmentId,
                      pct: Math.round(branchPoint.flowToBranch * 100),
                    })}
                </span>
                <input
                  type="text"
                  value={newSegmentName}
                  onChange={(e) => setNewSegmentName(e.target.value)}
                  placeholder={t('map.segmentNamePlaceholder')}
                  className="rounded border border-teal-300 bg-white px-2 py-0.5 text-xs text-slate-800"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {mode === 'draw' && channelPoints.length >= 2 && (
              <button
                type="button"
                onClick={handleFinishDrawing}
                className="rounded bg-teal-600 px-3 py-1 font-semibold text-white hover:bg-teal-700"
              >
                {t('map.completeChannelBtn', { count: channelPoints.length })}
              </button>
            )}
            <button
              type="button"
              onClick={handleCancelDrawing}
              className="rounded border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-100"
            >
              {t('map.cancelBtn')}
            </button>
          </div>
        </div>
      )}

      {/* Map Area — edit panel opens as an overlay popup */}
      <div className="relative flex min-h-[560px] flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* View toggle + hydro candidates — top-right; hydro only on interactive map */}
          <div className="pointer-events-auto absolute right-3 top-3 z-[510] flex flex-col items-stretch gap-2">
            <div className="flex rounded-xl border border-slate-200 bg-white/95 p-0.5 text-[11px] shadow-md backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/95">
              <button
                type="button"
                onClick={() => setViewType('map')}
                className={`rounded-lg px-2.5 py-1.5 font-semibold transition-colors ${
                  viewType === 'map'
                    ? 'bg-slate-100 text-teal-700 dark:bg-slate-700 dark:text-teal-300'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {t('map.interactiveMapBtn')}
              </button>
              <button
                type="button"
                onClick={() => setViewType('schematic')}
                className={`rounded-lg px-2.5 py-1.5 font-semibold transition-colors ${
                  viewType === 'schematic'
                    ? 'bg-slate-100 text-teal-700 dark:bg-slate-700 dark:text-teal-300'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {t('map.schematicSvgBtn')}
              </button>
            </div>
            {viewType === 'map' && (
              <button
                type="button"
                onClick={() => {
                  if (showHydroCandidates) setSelectedCandidateId(null);
                  setShowHydroCandidates((prev) => !prev);
                }}
                className={`rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold shadow-md backdrop-blur-sm transition-colors ${
                  showHydroCandidates
                    ? 'border-sky-600 bg-sky-600 text-white'
                    : 'border-slate-200 bg-white/95 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/95 dark:text-slate-200 dark:hover:bg-slate-700'
                }`}
                title={t('map.hydroCandidatesToggleTooltip')}
                aria-pressed={showHydroCandidates}
              >
                {t('map.hydroCandidatesToggleBtn')}
              </button>
            )}
          </div>

          {viewType === 'schematic' ? (
            <SchematicNetworkDiagram
              sensors={sensors}
              channelSegments={channelSegments}
              selectedSensorId={selectedSensorId}
              selectedSegmentId={selectedSegmentId}
              onSelectSensor={(id) => handleSelectSensor(id, false)}
              onSelectSegment={handleSelectSegment}
              t={t}
            />
          ) : (
            <MapContainer
              center={LEFKE_CENTER}
              zoom={DEFAULT_ZOOM}
              scrollWheelZoom={true}
              style={{
                width: '100%',
                height: '100%',
                minHeight: '540px',
                zIndex: 1,
              }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapClickHandler mode={mode} onMapClick={handleMapClick} />
              <MapBackgroundDeselect
                enabled={mode === 'view'}
                onDeselect={clearMapSelection}
              />
              <MapViewportController
                mode={mode}
                flyTarget={flyTarget}
                resetCounter={resetViewCounter}
              />
              <LocalizedMapChrome
                zoomInLabel={t('map.zoomIn')}
                zoomOutLabel={t('map.zoomOut')}
              />
              <FitBoundsToNetwork
                sensors={sensors}
                channelSegments={channelSegments}
              />

              {/* Channel Segments (SEG-01..SEG-04 + Custom) */}
              {channelSegments.map((segment) => {
                const positions = segment.path.map((p) => [p.lat, p.lng]);
                const isSelected = segment.id === selectedSegmentId;
                const downSensor = sensors.find(
                  (s) => s.id === segment.downstreamSensorId
                );
                const hasCriticalAnomaly = downSensor?.status === 'critical';
                const hasWarningAnomaly = downSensor?.status === 'warning';

                const strokeColor = hasCriticalAnomaly
                  ? '#ef4444'
                  : hasWarningAnomaly
                  ? '#f59e0b'
                  : isSelected
                  ? '#0f766e'
                  : '#0d9488';

                return (
                  <Fragment key={segment.id}>
                    <Polyline
                      positions={positions}
                      pathOptions={{
                        color: isSelected
                          ? '#5eead4'
                          : isDark
                          ? '#0f172a'
                          : '#ffffff',
                        weight: isSelected ? 10 : 8,
                        opacity: 0.75,
                      }}
                      eventHandlers={{
                        click: () => handleSelectSegment(segment.id),
                      }}
                    />
                    <Polyline
                      positions={positions}
                      pathOptions={{
                        color: strokeColor,
                        weight: isSelected ? 6 : 4.5,
                        opacity: 0.95,
                        dashArray:
                          hasCriticalAnomaly || hasWarningAnomaly
                            ? '8, 6'
                            : undefined,
                      }}
                      eventHandlers={{
                        click: () => handleSelectSegment(segment.id),
                      }}
                    >
                      <Tooltip sticky>
                        <div className="text-xs text-slate-800 dark:text-slate-100">
                          <strong>{segment.id}:</strong>{' '}
                          {tSegmentName(segment.id, segment.name)}
                          <br />
                          <span className="text-slate-500 dark:text-slate-400">
                            {t('map.segmentTooltipHint')}
                          </span>
                        </div>
                      </Tooltip>
                    </Polyline>
                  </Fragment>
                );
              })}

              {/* Drawing in-progress preview */}
              {mode === 'draw' && channelPoints.length > 0 && (
                <>
                  <Polyline
                    positions={channelPoints}
                    pathOptions={{
                      color: '#f59e0b',
                      weight: 4,
                      dashArray: '8, 6',
                    }}
                  />
                  {channelPoints.map((pt, idx) => (
                    <CircleMarker
                      key={`draw-pt-${idx}`}
                      center={pt}
                      radius={idx === 0 ? 8 : 6}
                      pathOptions={{
                        fillColor: idx === 0 ? '#ef4444' : '#f59e0b',
                        fillOpacity: 1,
                        color: '#ffffff',
                        weight: 2,
                      }}
                    />
                  ))}
                </>
              )}

              {/* Runtime micro-hydro candidates — toggled via toolbar */}
              {showHydroCandidates &&
                hydroCandidates.map((site) => {
                  const isSelected = site.id === selectedCandidateId;
                  const ringColor = isSelected
                    ? isDark
                      ? '#2dd4bf'
                      : '#0369a1'
                    : '#0284c7';
                  // Match sensor radii: selected 14, default 11
                  const radius = isSelected ? 14 : 11;
                  return (
                    <CircleMarker
                      key={site.id}
                      center={[site.lat, site.lng]}
                      radius={radius}
                      pathOptions={{
                        fillColor: isDark ? '#0f172a' : '#ffffff',
                        fillOpacity: 0.95,
                        color: ringColor,
                        weight: isSelected ? 3.5 : 2.5,
                        dashArray: '6, 5',
                        opacity: 1,
                      }}
                      eventHandlers={{
                        click: () => handleSelectCandidate(site.id),
                      }}
                    >
                      <Tooltip
                        permanent
                        interactive={false}
                        direction="center"
                        offset={[0, 0]}
                        opacity={1}
                        className="aqua-marker-glyph-tip"
                      >
                        <EnergyGlyphIcon
                          size={radius >= 13 ? 16 : 14}
                          color={ringColor}
                        />
                      </Tooltip>
                    </CircleMarker>
                  );
                })}

              {/* Simulated Sensor Station Markers */}
              {sensors.map((sensor) => {
                const coords = getSensorCoords(sensor, channelSegments);
                const markerColor =
                  STATUS_MARKER_COLORS[sensor.status] ||
                  STATUS_MARKER_COLORS.normal;
                const isSelected = sensor.id === selectedSensorId;
                const isAlerting = isAlertingStatus(sensor.status);
                const radius = isSelected ? 14 : isAlerting ? 12 : 11;

                return (
                  <Fragment key={sensor.id}>
                    {isAlerting && (
                      <>
                        <CircleMarker
                          center={coords}
                          radius={isSelected ? 34 : 30}
                          pathOptions={{
                            fillColor: markerColor,
                            fillOpacity: 0.4,
                            color: '#ffffff',
                            weight: 3,
                            opacity: 1,
                            className: 'aqua-sensor-pulse-halo',
                            interactive: false,
                          }}
                        />
                        <CircleMarker
                          center={coords}
                          radius={isSelected ? 24 : 20}
                          pathOptions={{
                            fillColor: markerColor,
                            fillOpacity: 0.35,
                            color: markerColor,
                            weight: 4,
                            opacity: 1,
                            className: 'aqua-sensor-pulse-ring',
                            interactive: false,
                          }}
                        />
                      </>
                    )}
                    {/* Remount when alert state flips — Leaflet pathOptions.className
                        does not reliably drop aqua-sensor-pulse after reset. */}
                    <CircleMarker
                      key={`${sensor.id}-alert-${isAlerting ? '1' : '0'}`}
                      center={coords}
                      radius={radius}
                      pathOptions={{
                        fillColor: markerColor,
                        fillOpacity: 1,
                        color: isSelected
                          ? isDark
                            ? '#2dd4bf'
                            : '#0f172a'
                          : '#ffffff',
                        weight: isAlerting || isSelected ? 3.5 : 2.5,
                        className: isAlerting
                          ? 'aqua-sensor-pulse'
                          : 'aqua-sensor-marker',
                      }}
                      eventHandlers={{
                        click: () => handleSelectSensor(sensor.id, false),
                      }}
                    >
                      <Tooltip
                        permanent
                        interactive={false}
                        direction="center"
                        offset={[0, 0]}
                        opacity={1}
                        className={
                          isAlerting
                            ? 'aqua-marker-glyph-tip aqua-sensor-pulse'
                            : 'aqua-marker-glyph-tip'
                        }
                      >
                        <SensorGlyphIcon size={radius >= 13 ? 16 : 14} />
                      </Tooltip>
                    </CircleMarker>
                  </Fragment>
                );
              })}
            </MapContainer>
          )}

          {/* Floating Quick-Info Card (Top-Right of Map) */}
          {selectedSensor && (
            <div className={`pointer-events-auto absolute right-3 z-[500] max-w-xs rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/95 ${
              viewType === 'map' ? 'top-24' : 'top-14'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">
                      {selectedSensor.id}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {tVillage(selectedSensor.village || 'Lefke')}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {tSensorName(selectedSensor)}
                  </h4>
                </div>
                <div className="flex items-start gap-2">
                  <StatusBadge status={selectedSensor.status} size="sm" />
                  <button
                    type="button"
                    onClick={clearMapSelection}
                    className="rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                    aria-label={t('map.closeCard')}
                    title={t('map.closeCard')}
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-900/70">
                <div>
                  <span className="block text-[10px] uppercase text-slate-400">
                    {t('map.simulatedFlow')}
                  </span>
                  <strong className="font-mono text-sm text-slate-800 dark:text-slate-100">
                    {selectedSensor.current.flowRateLps.toFixed(2)} L/s
                  </strong>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-slate-400">
                    {t('map.waterLevel')}
                  </span>
                  <strong className="font-mono text-sm text-slate-800 dark:text-slate-100">
                    {selectedSensor.current.waterLevelM.toFixed(3)} m
                  </strong>
                </div>
              </div>

              {selectedSensorAlertSummary.latest && (() => {
                const alert = selectedSensorAlertSummary.latest;
                const { title, message } = tAlert(alert);
                const extraCount = selectedSensorAlertSummary.total - 1;
                return (
                  <div className="mt-2 flex flex-col gap-1.5">
                    <div
                      className={`rounded-lg border p-2 ${
                        SENSOR_ALERT_CARD_STYLES[alert.severity] ||
                        SENSOR_ALERT_CARD_STYLES.warning
                      }`}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider">
                        {t(`severity.${alert.severity}`)}
                      </div>
                      <div className="mt-0.5 text-xs font-semibold leading-snug">
                        {title}
                      </div>
                      <p className="mt-0.5 text-[11px] leading-relaxed opacity-90">
                        {message}
                      </p>
                    </div>
                    {extraCount > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/sensors/${selectedSensor.id}`)
                        }
                        className="text-left text-[11px] font-semibold text-teal-700 hover:text-teal-800 hover:underline dark:text-teal-400 dark:hover:text-teal-300"
                      >
                        {t('map.moreAlertsLink', { count: extraCount })}
                      </button>
                    )}
                  </div>
                );
              })()}

              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400">
                  {t('map.updatedAgo', {
                    time: formatTimeAgo(
                      selectedSensor.current.updatedAt,
                      t,
                      language
                    ),
                  })}
                </span>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const [lat, lng] = getSensorCoords(
                        selectedSensor,
                        channelSegments
                      );
                      const url = `https://www.google.com/maps?q=${lat},${lng}`;
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:border-sky-700 dark:hover:bg-sky-950/40 dark:hover:text-sky-300"
                    title={t('map.openInMapsTooltip')}
                  >
                    {t('map.openInMapsBtn')}
                  </button>
                  <button
                    type="button"
                    onClick={openEditPanel}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  >
                    {t('map.editBtn')}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/sensors/${selectedSensor.id}`)}
                    className="rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-700"
                  >
                    {t('map.sensorDetailsBtn')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedSegment && !selectedSensor && !selectedCandidate && (
            <div className={`pointer-events-auto absolute right-3 z-[500] max-w-xs rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/95 ${
              viewType === 'map' ? 'top-24' : 'top-14'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">
                    {selectedSegment.id}
                  </span>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {tSegmentName(selectedSegment.id, selectedSegment.name)}
                  </h4>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {tVillage(selectedSegment.village || 'Lefke')} ·{' '}
                    {tArea(selectedSegment.area || '')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearMapSelection}
                  className="shrink-0 rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                  aria-label={t('map.closeCard')}
                  title={t('map.closeCard')}
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="mt-2.5 flex justify-end">
                <button
                  type="button"
                  onClick={openEditPanel}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                >
                  {t('map.editBtn')}
                </button>
              </div>
            </div>
          )}

          {showHydroCandidates && selectedCandidate && !selectedSensor && (
            <div className={`pointer-events-auto absolute right-3 z-[500] max-w-xs rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/95 ${
              viewType === 'map' ? 'top-24' : 'top-14'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300">
                    {t('map.hydroCandidateBadge')}
                  </span>
                  <h4 className="mt-1.5 text-sm font-bold text-slate-800 dark:text-slate-100">
                    {t('map.hydroCandidateName', {
                      rank: selectedCandidate.rank,
                      segmentId: selectedCandidate.segmentId,
                    })}
                  </h4>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {t('map.hydroGradeNote')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearMapSelection}
                  className="shrink-0 rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                  aria-label={t('map.closeCard')}
                  title={t('map.closeCard')}
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="mt-2 space-y-1.5 rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-900/70">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">
                    {t('map.refFlowLabel', {
                      id: selectedCandidate.referenceSensorId,
                    })}
                  </span>
                  <strong className="font-mono text-slate-800 dark:text-slate-100">
                    {selectedCandidate.flowRateLps.toFixed(2)} L/s
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">
                    {t('map.assumedHeadLabel')}
                  </span>
                  <strong className="font-mono text-slate-800 dark:text-slate-100">
                    {selectedCandidate.netHeadM.toFixed(2)} m (
                    {Math.round(selectedCandidate.efficiency * 100)}%{' '}
                    {t('map.effShort')})
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">
                    {t('map.theoreticalPotentialLabel')}
                  </span>
                  <strong className="font-mono text-teal-700 dark:text-teal-400">
                    ~{selectedCandidate.estimate.powerWatts.toFixed(0)} W (
                    {selectedCandidate.estimate.dailyEnergyKwh.toFixed(2)}{' '}
                    kWh/d)
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Map Legend Overlay (Bottom-Right of Map) */}
          <div className="pointer-events-auto absolute bottom-7 right-3 z-[500] rounded-xl border border-slate-200 bg-white/95 p-3 text-[11px] shadow-md backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/95">
            <div className="mb-1.5">
              <span className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('map.legendTitle')}
              </span>
            </div>
            <div className="flex flex-col gap-1 text-slate-700 dark:text-slate-200">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                {t('status.normal')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                {t('status.warning')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                {t('status.critical')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                {t('status.offline')}
              </span>
              {showHydroCandidates && (
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-2.5 w-2.5 items-center justify-center rounded-full border border-dashed border-sky-600 bg-white">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-1.5 w-1.5"
                      aria-hidden
                    >
                      <path
                        fill="#0284c7"
                        d="M13.2 2.4 5.5 13.2h5.1l-.9 8.4 8.4-12h-5.2l1.3-7.2z"
                      />
                    </svg>
                  </span>
                  {t('map.hydroLegendLabel')}
                </span>
              )}
            </div>
          </div>

        {/* Edit panel popup overlay (default hidden; opens via Edit) */}
        {isEditPanelOpen && (
          <div className="absolute inset-0 z-[600] flex items-center justify-center bg-slate-900/25 p-2 backdrop-blur-[1px]">
            <button
              type="button"
              className="absolute inset-0 cursor-default"
              aria-label={t('map.closeCard')}
              onClick={closeEditPanel}
            />
            <aside className="relative z-[1] flex max-h-[calc(100%-0.75rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                {t('map.panelTitle')}
              </h3>
              <button
                type="button"
                onClick={closeEditPanel}
                className="rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                aria-label={t('map.closeCard')}
                title={t('map.closeCard')}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

              <div className="min-h-0 flex-1 overflow-hidden p-3">
                {selectedSensor ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-slate-600 dark:bg-slate-800/80">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-teal-600">
                            {selectedSensor.id}
                          </span>
                          <h4 className="truncate text-base font-bold text-slate-800 dark:text-slate-100">
                            {tSensorName(selectedSensor)}
                          </h4>
                        </div>
                        <p className="truncate text-xs text-slate-500">
                          {tVillage(selectedSensor.village || 'Lefke')} ·{' '}
                          {tArea(selectedSensor.area || '')}
                        </p>
                      </div>
                      <StatusBadge status={selectedSensor.status} size="sm" />
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div className="rounded-md border border-slate-200 px-1.5 py-1.5 dark:border-slate-600">
                        <span className="block text-[11px] uppercase text-slate-400">
                          {t('sensorDetails.flowRate')}
                        </span>
                        <strong className="font-mono text-xs text-slate-800 dark:text-slate-100">
                          {selectedSensor.current.flowRateLps.toFixed(2)} L/s
                        </strong>
                      </div>
                      <div className="rounded-md border border-slate-200 px-1.5 py-1.5 dark:border-slate-600">
                        <span className="block text-[11px] uppercase text-slate-400">
                          {t('sensorDetails.waterLevel')}
                        </span>
                        <strong className="font-mono text-xs text-slate-800 dark:text-slate-100">
                          {selectedSensor.current.waterLevelM.toFixed(3)} m
                        </strong>
                      </div>
                      <div className="rounded-md border border-slate-200 px-1.5 py-1.5 dark:border-slate-600">
                        <span className="block text-[11px] uppercase text-slate-400">
                          {t('map.velocity')}
                        </span>
                        <strong className="font-mono text-xs text-slate-800 dark:text-slate-100">
                          {(
                            selectedSensor.current.flowVelocityMps ?? 0.7
                          ).toFixed(2)}{' '}
                          m/s
                        </strong>
                      </div>
                    </div>

                    <form
                      onSubmit={handleSaveSensorEdits}
                      className="space-y-1.5 border-t border-slate-200 pt-2 dark:border-slate-700"
                    >
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {t('map.editSensorHeading')}
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="col-span-2 sm:col-span-1">
                          <label className="mb-0.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                            {t('map.stationDisplayName')}
                          </label>
                          <input
                            type="text"
                            value={editSensorForm.name}
                            onChange={(e) =>
                              setEditSensorForm((prev) => ({
                                ...prev,
                                name: e.target.value,
                              }))
                            }
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <label className="mb-0.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                            {t('map.areaLabel')}
                          </label>
                          <input
                            type="text"
                            value={editSensorForm.area}
                            onChange={(e) =>
                              setEditSensorForm((prev) => ({
                                ...prev,
                                area: e.target.value,
                              }))
                            }
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="mb-0.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                            {t('map.villageLabel')}
                          </label>
                          <select
                            value={editSensorForm.village}
                            onChange={(e) => {
                              const nextVillage = e.target.value;
                              const defaultArea =
                                KNOWN_AREAS_BY_VILLAGE[nextVillage]?.[0] ||
                                editSensorForm.area;
                              setEditSensorForm((prev) => ({
                                ...prev,
                                village: nextVillage,
                                area: defaultArea,
                              }));
                            }}
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          >
                            {KNOWN_VILLAGES.map((v) => (
                              <option key={v} value={v}>
                                {tVillage(v)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-0.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                            {t('map.channelSegmentLabel')}
                          </label>
                          <select
                            value={editSensorForm.channelSegmentId}
                            onChange={(e) =>
                              setEditSensorForm((prev) => ({
                                ...prev,
                                channelSegmentId: e.target.value,
                              }))
                            }
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          >
                            {channelSegments.map((seg) => (
                              <option key={seg.id} value={seg.id}>
                                {seg.id} —{' '}
                                {tSegmentName(seg.id, seg.name).slice(0, 18)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-0.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                            {t('map.baselineFlowLabel')}
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={editSensorForm.flowRateLps}
                            onChange={(e) =>
                              setEditSensorForm((prev) => ({
                                ...prev,
                                flowRateLps: e.target.value,
                              }))
                            }
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 font-mono text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="mb-0.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                            {t('map.baselineLevelLabel')}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.02"
                            value={editSensorForm.waterLevelM}
                            onChange={(e) =>
                              setEditSensorForm((prev) => ({
                                ...prev,
                                waterLevelM: e.target.value,
                              }))
                            }
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 font-mono text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="mb-0.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                            {t('map.illustrativeLatLabel')}
                          </label>
                          <input
                            type="number"
                            step="0.0005"
                            value={editSensorForm.lat}
                            onChange={(e) =>
                              setEditSensorForm((prev) => ({
                                ...prev,
                                lat: e.target.value,
                              }))
                            }
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 font-mono text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="mb-0.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                            {t('map.illustrativeLngLabel')}
                          </label>
                          <input
                            type="number"
                            step="0.0005"
                            value={editSensorForm.lng}
                            onChange={(e) =>
                              setEditSensorForm((prev) => ({
                                ...prev,
                                lng: e.target.value,
                              }))
                            }
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 font-mono text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        <button
                          type="submit"
                          className="flex-1 rounded-md bg-teal-600 px-2.5 py-1.5 text-sm font-semibold text-white hover:bg-teal-700"
                        >
                          {t('map.saveChangesBtn')}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSensorOffline(selectedSensor.id)}
                          className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                        >
                          {selectedSensor.status === 'offline'
                            ? t('map.setOnlineBtn')
                            : t('map.simulateOfflineBtn')}
                        </button>
                      </div>
                    </form>

                    <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-1.5 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/sensors/${selectedSensor.id}`)
                        }
                        className="truncate text-xs font-semibold text-teal-600 hover:underline"
                      >
                        {t('map.openFullTelemetryLink', {
                          id: selectedSensor.id,
                        })}
                      </button>

                      {sensors.length > 1 && (
                        <div className="shrink-0">
                          {confirmDeleteId === selectedSensor.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const idToRemove = selectedSensor.id;
                                  const remaining = sensors.filter(
                                    (s) => s.id !== idToRemove
                                  );
                                  removeSensor(idToRemove);
                                  setConfirmDeleteId(null);
                                  setSelectedSensorId(
                                    remaining[0]?.id ?? null
                                  );
                                  setIsEditPanelOpen(false);
                                }}
                                className="rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white hover:bg-red-700"
                              >
                                {t('map.confirmRemoveBtn')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded border border-slate-200 px-2 py-0.5 text-xs text-slate-600 dark:border-slate-600"
                              >
                                {t('map.cancelBtn')}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmDeleteId(selectedSensor.id)
                              }
                              className="text-xs text-red-600 hover:underline"
                            >
                              {t('map.removeStationBtn')}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : selectedSegment ? (
                  <div className="space-y-2 text-sm">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-slate-600 dark:bg-slate-800/80">
                      <span className="font-mono text-xs font-bold text-teal-600">
                        {t('map.channelSegmentHeader', {
                          id: selectedSegment.id,
                        })}
                      </span>
                      <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
                        {tSegmentName(selectedSegment.id, selectedSegment.name)}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {tVillage(selectedSegment.village || 'Lefke')} ·{' '}
                        {tArea(selectedSegment.area || '')}
                      </p>
                    </div>

                    {/* Upstream vs Downstream Flow Comparison (Spec Section 3.2) */}
                    {(() => {
                      const up = sensors.find(
                        (s) => s.id === selectedSegment.upstreamSensorId
                      );
                      const down = sensors.find(
                        (s) => s.id === selectedSegment.downstreamSensorId
                      );
                      if (!up || !down) {
                        return (
                          <div className="rounded-lg border border-slate-200 p-3 text-slate-500">
                            {t('map.assignStationsHint')}
                          </div>
                        );
                      }
                      const diffLps =
                        up.current.flowRateLps - down.current.flowRateLps;
                      const diffPct =
                        up.current.flowRateLps > 0
                          ? (diffLps / up.current.flowRateLps) * 100
                          : 0;
                      const isAnomalous = diffPct > 22;

                      return (
                        <div
                          className={`rounded-lg border p-3 ${
                            isAnomalous
                              ? 'border-amber-300 bg-amber-50 text-amber-900'
                              : 'border-slate-200 bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="font-bold uppercase tracking-wider">
                            {t('map.sectionComparisonTitle')}
                          </div>
                          <div className="mt-2 flex justify-between">
                            <span>
                              {t('map.upstreamShort', { id: up.id })}{' '}
                              <strong>
                                {up.current.flowRateLps.toFixed(2)} L/s
                              </strong>
                            </span>
                            <span>
                              {t('map.downstreamShort', { id: down.id })}{' '}
                              <strong>
                                {down.current.flowRateLps.toFixed(2)} L/s
                              </strong>
                            </span>
                          </div>
                          <div className="mt-1.5 font-semibold">
                            {t('map.differenceLabel')}{' '}
                            {diffLps >= 0 ? '-' : '+'}
                            {Math.abs(diffLps).toFixed(2)} L/s (
                            {diffPct.toFixed(1)}%)
                          </div>
                          {isAnomalous && (
                            <p className="mt-1 text-[11px]">
                              {t('map.sectionAnomalyNote', {
                                id: selectedSegment.id,
                              })}
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    <div className="space-y-2 border-t border-slate-200 pt-3">
                      <label className="block font-medium text-slate-700">
                        {t('map.segmentNameLabel')}
                      </label>
                      <input
                        type="text"
                        value={selectedSegment.name}
                        onChange={(e) =>
                          updateChannelSegment(selectedSegment.id, {
                            name: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-800"
                      />
                    </div>

                    {channelSegments.length > 1 && (
                      <div className="border-t border-slate-200 pt-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            removeChannelSegment(selectedSegment.id);
                            setSelectedSegmentId(null);
                            setSelectedSensorId(sensors[0]?.id ?? null);
                          }}
                          className="font-semibold text-red-600 hover:underline"
                        >
                          {t('map.removeSegmentBtn')}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    {t('map.emptySelectionHint')}
                  </p>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
