import { Fragment, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  Popup,
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

const FALLBACK_SENSOR_COORDS = {
  S01: [35.1065, 32.8452],
  S02: [35.1118, 32.8498],
  S03: [35.1174, 32.8546],
  S04: [35.1232, 32.8595],
};

/**
 * Candidate micro-hydropower & distribution pool points (Spec Section 7.2).
 */
const CANDIDATE_POINTS = [
  {
    id: 'HYDRO-01',
    type: 'hydropower',
    nameKey: 'map.hydro1Name',
    noteKey: 'map.hydro1Note',
    lat: 35.1091,
    lng: 32.8476,
    headM: 2.8,
    efficiency: 0.65,
    referenceSensorId: 'S01',
  },
  {
    id: 'POOL-01',
    type: 'pool',
    nameKey: 'map.pool1Name',
    noteKey: 'map.pool1Note',
    lat: 35.1158,
    lng: 32.8532,
    headM: 1.9,
    efficiency: 0.65,
    referenceSensorId: 'S03',
  },
];

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
  if (FALLBACK_SENSOR_COORDS[sensor.id]) {
    return FALLBACK_SENSOR_COORDS[sensor.id];
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
  tSensorName,
  tSegmentName,
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
    const padLat = 0.003;
    const padLng = 0.003;
    return {
      minLat: Math.min(...lats) - padLat,
      maxLat: Math.max(...lats) + padLat,
      minLng: Math.min(...lngs) - padLng,
      maxLng: Math.max(...lngs) + padLng,
    };
  }, [allCoords]);

  const width = 760;
  const height = 460;

  const project = useCallback(
    (lat, lng) => {
      const xRatio =
        (lng - bounds.minLng) /
        Math.max(0.0001, bounds.maxLng - bounds.minLng);
      const yRatio =
        (lat - bounds.minLat) /
        Math.max(0.0001, bounds.maxLat - bounds.minLat);
      return {
        x: 60 + xRatio * (width - 120),
        y: height - 50 - yRatio * (height - 100),
      };
    },
    [bounds]
  );

  return (
    <div className="flex h-full min-h-[540px] w-full flex-col justify-between rounded-xl border border-slate-200 bg-slate-900 p-4 text-slate-100 shadow-inner">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400">
            {t('map.schematicBadge')}
          </span>
          <h4 className="text-sm font-semibold text-white">
            {t('map.schematicTitle')}
          </h4>
        </div>
        <span className="rounded bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300">
          {t('map.schematicDisclaimer')}
        </span>
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
          const hasAnomaly =
            downstreamSensor &&
            (downstreamSensor.status === 'warning' ||
              downstreamSensor.status === 'critical');

          return (
            <g
              key={seg.id}
              onClick={() => onSelectSegment(seg.id)}
              className="cursor-pointer"
            >
              <polyline
                fill="none"
                stroke={
                  isSelected
                    ? '#2dd4bf'
                    : hasAnomaly
                    ? '#f59e0b'
                    : '#0d9488'
                }
                strokeWidth={isSelected ? 8 : 5}
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pointsStr}
                opacity={0.9}
              />
              {pts.length >= 2 && (
                <text
                  x={(pts[0].x + pts[pts.length - 1].x) / 2 - 10}
                  y={(pts[0].y + pts[pts.length - 1].y) / 2 - 12}
                  className="fill-slate-400 text-[10px] font-semibold"
                >
                  {seg.id} ({tSegmentName(seg.id, seg.name).slice(0, 22)})
                </text>
              )}
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
              <circle
                cx={pt.x}
                cy={pt.y}
                r="12"
                fill={color}
                stroke="#0f172a"
                strokeWidth="3"
              />
              <text
                x={pt.x}
                y={pt.y + 4}
                textAnchor="middle"
                className="fill-white text-[9px] font-bold"
              >
                {sensor.id}
              </text>
              <g transform={`translate(${pt.x + 16}, ${pt.y - 14})`}>
                <rect
                  x="0"
                  y="0"
                  width="144"
                  height="36"
                  rx="6"
                  fill="#1e293b"
                  stroke={isSelected ? '#2dd4bf' : '#334155'}
                  strokeWidth="1"
                />
                <text
                  x="8"
                  y="14"
                  className="fill-slate-100 text-[10px] font-semibold"
                >
                  {sensor.id} · {tSensorName(sensor).slice(0, 15)}
                </text>
                <text
                  x="8"
                  y="28"
                  className="fill-teal-300 font-mono text-[10px]"
                >
                  {sensor.current.flowRateLps.toFixed(1)} L/s ·{' '}
                  {sensor.current.waterLevelM.toFixed(2)} m
                </text>
              </g>
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
    tSensorLocation,
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
    isCrisisActive,
    addSensor,
    updateSensor,
    removeSensor,
    addChannelSegment,
    updateChannelSegment,
    removeChannelSegment,
    toggleSensorOffline,
    estimateHydropower,
  } = useNetwork();

  // Map view & interaction state
  const [viewType, setViewType] = useState('map'); // 'map' | 'schematic'
  const [mode, setMode] = useState('view'); // 'view' | 'place' | 'draw'
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [panelTab, setPanelTab] = useState('inspect'); // 'inspect' | 'add' | 'network'
  const [showCandidatePoints, setShowCandidatePoints] = useState(true);

  // Selection state (stores IDs so data is always read live from simulation)
  const [selectedSensorId, setSelectedSensorId] = useState('S01');
  const [selectedSegmentId, setSelectedSegmentId] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);
  const [resetViewCounter, setResetViewCounter] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Channel drawing state
  const [channelPoints, setChannelPoints] = useState([]);
  const [branchPoint, setBranchPoint] = useState(null);
  const [newSegmentName, setNewSegmentName] = useState('');
  const [autoCreateSegmentSensors, setAutoCreateSegmentSensors] =
    useState(true);

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

  const handleSelectSensor = useCallback(
    (sensorId, shouldFly = false, sensorOverride = null) => {
      setSelectedSensorId(sensorId);
      setSelectedSegmentId(null);
      setPanelTab('inspect');
      setIsRightPanelOpen(true);
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
    setPanelTab('inspect');
    setIsRightPanelOpen(true);
    setConfirmDeleteId(null);
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
    const baseFlowLps = branchPoint
      ? Number((9.5 * branchPoint.flowToBranch).toFixed(1))
      : 7.5;

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

    if (autoCreateSegmentSensors) {
      const startPt = channelPoints[0];
      const endPt = channelPoints[channelPoints.length - 1];

      const upSensor = addSensor({
        name: branchPoint
          ? `${createdSegment.id} Intake`
          : `${createdSegment.id} Upstream`,
        channelSegmentId: createdSegment.id,
        village,
        area,
        location: {
          lat: startPt[0],
          lng: startPt[1],
          label: `${createdSegment.id} Intake (Illustrative)`,
          village,
          area,
        },
        baseline: {
          flowRateLps: baseFlowLps,
          waterLevelM: 0.34,
        },
      });

      const downSensor = addSensor({
        name: `${createdSegment.id} Downstream`,
        channelSegmentId: createdSegment.id,
        village,
        area,
        location: {
          lat: endPt[0],
          lng: endPt[1],
          label: `${createdSegment.id} Outflow (Illustrative)`,
          village,
          area,
        },
        baseline: {
          flowRateLps: Number((baseFlowLps * 0.92).toFixed(1)),
          waterLevelM: 0.29,
        },
      });

      updateChannelSegment(createdSegment.id, {
        upstreamSensorId: upSensor.id,
        downstreamSensorId: downSensor.id,
      });
    }

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
    autoCreateSegmentSensors,
    addChannelSegment,
    addSensor,
    updateChannelSegment,
    handleSelectSegment,
  ]);

  const handleCancelDrawing = useCallback(() => {
    setChannelPoints([]);
    setBranchPoint(null);
    setMode('view');
  }, []);

  const handleAddSensorSubmit = (event) => {
    event.preventDefault();
    const seg = channelSegments.find(
      (s) => s.id === newSensorForm.channelSegmentId
    );
    const village = newSensorForm.village || seg?.village || 'Lefke';
    const area =
      newSensorForm.area.trim() ||
      seg?.area ||
      KNOWN_AREAS_BY_VILLAGE[village]?.[0] ||
      'Upper Valley Intake';

    const created = addSensor({
      name:
        newSensorForm.name.trim() ||
        `${tVillage(village)} S0${sensors.length + 1}`,
      channelSegmentId: newSensorForm.channelSegmentId || 'SEG-01',
      village,
      area,
      location: {
        lat: Number(newSensorForm.lat) || 35.114,
        lng: Number(newSensorForm.lng) || 32.852,
        label:
          newSensorForm.label.trim() ||
          `${tArea(area)} (Illustrative)`,
        village,
        area,
      },
      baseline: {
        flowRateLps: Math.max(0.5, Number(newSensorForm.flowRateLps) || 8.0),
        waterLevelM: Math.max(0.05, Number(newSensorForm.waterLevelM) || 0.32),
      },
    });

    setNewSensorForm((prev) => ({
      ...prev,
      name: '',
      label: '',
    }));
    handleSelectSensor(created.id, true, created);
  };

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

  const handleSegmentChangeInAddForm = (segmentId) => {
    const seg = channelSegments.find((s) => s.id === segmentId);
    let midLat = newSensorForm.lat;
    let midLng = newSensorForm.lng;
    if (seg && seg.path.length > 0) {
      const mid = seg.path[Math.floor(seg.path.length / 2)];
      midLat = String(Number((mid.lat + 0.0006).toFixed(5)));
      midLng = String(Number((mid.lng + 0.0006).toFixed(5)));
    }
    setNewSensorForm((prev) => ({
      ...prev,
      channelSegmentId: segmentId,
      village: seg?.village || prev.village,
      area: seg?.area || prev.area,
      lat: midLat,
      lng: midLng,
    }));
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

          <div className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600 xl:flex">
            <span>
              {t('map.refInflowLabel', {
                id: summaryMetrics.referenceSensorId,
              })}
            </span>
            <strong className="font-mono font-bold text-slate-800">
              {summaryMetrics.referenceInflowLps.toFixed(1)} L/s
            </strong>
          </div>
        </div>

        {/* Interactive Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Map vs Schematic Toggle */}
          <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewType('map')}
              className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                viewType === 'map'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('map.interactiveMapBtn')}
            </button>
            <button
              type="button"
              onClick={() => setViewType('schematic')}
              className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                viewType === 'schematic'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('map.schematicSvgBtn')}
            </button>
          </div>

          {viewType === 'map' && (
            <>
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'place' ? 'view' : 'place');
                  setPanelTab('add');
                  setIsRightPanelOpen(true);
                }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  mode === 'place'
                    ? 'border-teal-600 bg-teal-600 text-white shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
                title={t('map.placeSensorTooltip')}
              >
                {mode === 'place'
                  ? t('map.clickToPlaceBtn')
                  : t('map.placeVirtualSensorBtn')}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (mode === 'draw') {
                    handleCancelDrawing();
                  } else {
                    setMode('draw');
                    setChannelPoints([]);
                    setBranchPoint(null);
                  }
                }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  mode === 'draw'
                    ? 'border-amber-600 bg-amber-600 text-white shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
                title={t('map.drawChannelTooltip')}
              >
                {mode === 'draw'
                  ? t('map.drawingChannelBtn')
                  : t('map.drawChannelBtn')}
              </button>

              <button
                type="button"
                onClick={() => setResetViewCounter((c) => c + 1)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                title={t('map.centerLefkeTooltip')}
              >
                {t('map.centerLefkeBtn')}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsRightPanelOpen((open) => !open)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            {isRightPanelOpen
              ? t('map.hideEditPanelBtn')
              : t('map.openEditPanelBtn')}
          </button>
        </div>
      </div>

      {/* Active Drawing / Placement Instruction Banner */}
      {mode !== 'view' && viewType === 'map' && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-teal-300 bg-teal-50 px-4 py-2 text-xs text-teal-900">
          {mode === 'place' ? (
            <div className="flex items-center gap-2 font-medium">
              <span className="inline-block h-2.5 w-2.5 animate-ping rounded-full bg-teal-600" />
              <span>
                <strong>{t('map.placeModeTitle')}</strong>{' '}
                {t('map.placeModeDesc')}
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 font-medium">
              <span>
                <strong>{t('map.drawModeTitle')}</strong>{' '}
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
              <label className="flex items-center gap-1 text-[11px]">
                <input
                  type="checkbox"
                  checked={autoCreateSegmentSensors}
                  onChange={(e) =>
                    setAutoCreateSegmentSensors(e.target.checked)
                  }
                />
                {t('map.autoAddSensorsLabel')}
              </label>
            </div>
          )}

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

      {/* Main Content Split: Map Area (Left/Center) + Collapsible Edit Panel (Right) */}
      <div className="flex min-h-[560px] flex-1 flex-col gap-4 lg:flex-row">
        {/* Central Map / Schematic Container */}
        <div className="relative flex min-h-[540px] flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {viewType === 'schematic' ? (
            <SchematicNetworkDiagram
              sensors={sensors}
              channelSegments={channelSegments}
              selectedSensorId={selectedSensorId}
              selectedSegmentId={selectedSegmentId}
              onSelectSensor={(id) => handleSelectSensor(id, false)}
              onSelectSegment={handleSelectSegment}
              t={t}
              tSensorName={tSensorName}
              tSegmentName={tSegmentName}
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
              <MapViewportController
                mode={mode}
                flyTarget={flyTarget}
                resetCounter={resetViewCounter}
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

              {/* Candidate Hydropower & Pool Points (Spec Section 7.2) */}
              {showCandidatePoints &&
                CANDIDATE_POINTS.map((pt) => {
                  const refSensor =
                    sensors.find((s) => s.id === pt.referenceSensorId) ??
                    sensors[0];
                  const estimate = estimateHydropower({
                    flowRateLps: refSensor?.current.flowRateLps ?? 10,
                    netHeadM: pt.headM,
                    efficiency: pt.efficiency,
                  });

                  return (
                    <CircleMarker
                      key={pt.id}
                      center={[pt.lat, pt.lng]}
                      radius={7}
                      pathOptions={{
                        fillColor:
                          pt.type === 'hydropower' ? '#0284c7' : '#8b5cf6',
                        fillOpacity: 0.9,
                        color: isDark ? '#0f172a' : '#ffffff',
                        weight: 2,
                      }}
                    >
                      <Popup key={`cand-popup-${pt.id}-${resolvedTheme}`}>
                        <div
                          className={`min-w-[210px] p-1 text-xs ${
                            isDark ? 'text-slate-100' : 'text-slate-800'
                          }`}
                        >
                          <span className="inline-block rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-sky-800 dark:bg-sky-950/70 dark:text-sky-300">
                            {pt.type === 'hydropower'
                              ? t('map.hydroCandidateBadge')
                              : t('map.poolCandidateBadge')}
                          </span>
                          <h4 className="mt-1.5 font-bold text-slate-800 dark:text-slate-100">
                            {t(pt.nameKey)}
                          </h4>
                          <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                            {t(pt.noteKey)}
                          </p>
                          <div className="mt-2 space-y-1 border-t border-slate-200 pt-2 text-[11px] dark:border-slate-700">
                            <div className="flex justify-between">
                              <span className="text-slate-500 dark:text-slate-400">
                                {t('map.refFlowLabel', {
                                  id: refSensor?.id ?? 'S01',
                                })}
                              </span>
                              <strong className="font-mono text-slate-800 dark:text-slate-100">
                                {(refSensor?.current.flowRateLps ?? 0).toFixed(
                                  2
                                )}{' '}
                                L/s
                              </strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500 dark:text-slate-400">
                                {t('map.assumedHeadLabel')}
                              </span>
                              <strong className="font-mono text-slate-800 dark:text-slate-100">
                                {pt.headM} m ({Math.round(pt.efficiency * 100)}%{' '}
                                {t('map.effShort')})
                              </strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500 dark:text-slate-400">
                                {t('map.theoreticalPotentialLabel')}
                              </span>
                              <strong className="font-mono text-teal-700 dark:text-teal-400">
                                ~{estimate.powerWatts.toFixed(0)} W (
                                {estimate.dailyEnergyKwh.toFixed(2)} kWh/d)
                              </strong>
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </CircleMarker>
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

              {/* Simulated Sensor Station Markers (S01..S04 + Virtual Stations) */}
              {sensors.map((sensor) => {
                const coords = getSensorCoords(sensor, channelSegments);
                const markerColor =
                  STATUS_MARKER_COLORS[sensor.status] ||
                  STATUS_MARKER_COLORS.normal;
                const isSelected = sensor.id === selectedSensorId;
                const localizedName = tSensorName(sensor);
                const localizedLocation = tSensorLocation(sensor);

                return (
                  <CircleMarker
                    key={sensor.id}
                    center={coords}
                    radius={isSelected ? 13 : 10}
                    pathOptions={{
                      fillColor: markerColor,
                      fillOpacity: 0.95,
                      color: isSelected
                        ? isDark
                          ? '#2dd4bf'
                          : '#0f172a'
                        : isDark
                        ? '#0f172a'
                        : '#ffffff',
                      weight: isSelected ? 3.5 : 2.5,
                    }}
                    eventHandlers={{
                      click: () => handleSelectSensor(sensor.id, false),
                    }}
                  >
                    <Tooltip
                      permanent
                      direction="top"
                      offset={[0, -10]}
                      className="font-mono text-[10px] font-bold"
                    >
                      {sensor.id}
                    </Tooltip>

                    {/* Quick-Information Pop-Up on Marker Click (Spec Section 7.2) */}
                    <Popup key={`sensor-popup-${sensor.id}-${resolvedTheme}`}>
                      <div
                        className={`min-w-[230px] p-1 ${
                          isDark ? 'text-slate-100' : 'text-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono text-[11px] font-bold text-teal-700 dark:text-teal-400">
                              {t('dashboard.stationTag', { id: sensor.id })}
                            </span>
                            <h3 className="text-sm font-bold leading-snug text-slate-900 dark:text-slate-100">
                              {localizedName}
                            </h3>
                          </div>
                          <StatusBadge status={sensor.status} size="sm" />
                        </div>

                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
                          {localizedLocation}
                        </p>
                        <p className="text-[10px] font-medium text-slate-400">
                          {tVillage(sensor.village || 'Lefke')} ·{' '}
                          {tArea(sensor.area || '')}
                        </p>

                        <div className="mt-2.5 space-y-1.5 border-t border-slate-200 pt-2 text-xs dark:border-slate-700">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 dark:text-slate-400">
                              {t('dashboard.flowLabel')}
                            </span>
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                              {sensor.current.flowRateLps.toFixed(2)} L/s{' '}
                              <span className="text-[10px] font-normal text-slate-400">
                                (
                                {t('map.baseShort', {
                                  val: sensor.baseline.flowRateLps.toFixed(1),
                                })}
                                )
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 dark:text-slate-400">
                              {t('dashboard.levelLabel')}
                            </span>
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                              {sensor.current.waterLevelM.toFixed(3)} m{' '}
                              <span className="text-[10px] font-normal text-slate-400">
                                (
                                {t('map.baseShort', {
                                  val: sensor.baseline.waterLevelM.toFixed(2),
                                })}
                                )
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 dark:text-slate-400">
                              {t('map.updatedLabel')}
                            </span>
                            <span className="text-slate-600 dark:text-slate-300">
                              {formatTimeAgo(
                                sensor.current.updatedAt,
                                t,
                                language
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/sensors/${sensor.id}`)}
                            className="flex-1 rounded-md bg-teal-600 px-2.5 py-1.5 text-center text-xs font-semibold text-white hover:bg-teal-700"
                          >
                            {t('map.openDetailsBtn')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectSensor(sensor.id, false);
                            }}
                            className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                          >
                            {t('map.editBtn')}
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          )}

          {/* Floating Quick-Info Card for Selected Sensor (Bottom-Left of Map) */}
          {selectedSensor && (
            <div className="pointer-events-auto absolute bottom-3 left-3 z-[500] max-w-xs rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/95">
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
                <StatusBadge status={selectedSensor.status} size="sm" />
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

              <div className="mt-2.5 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400">
                  {t('map.updatedAgo', {
                    time: formatTimeAgo(
                      selectedSensor.current.updatedAt,
                      t,
                      language
                    ),
                  })}
                </span>
                <button
                  type="button"
                  onClick={() => navigate(`/sensors/${selectedSensor.id}`)}
                  className="rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-700"
                >
                  {t('map.sensorDetailsBtn')}
                </button>
              </div>
            </div>
          )}

          {/* Map Legend Overlay (Bottom-Right of Map, Spec Section 7.2) */}
          <div className="pointer-events-auto absolute bottom-3 right-3 z-[500] rounded-xl border border-slate-200 bg-white/95 p-3 text-[11px] shadow-md backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/95">
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('map.legendTitle')}
              </span>
              <label className="flex cursor-pointer items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={showCandidatePoints}
                  onChange={(e) => setShowCandidatePoints(e.target.checked)}
                />
                {t('map.hydroPoolsToggle')}
              </label>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-700 dark:text-slate-200">
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
            </div>
            <div className="mt-1.5 border-t border-slate-100 pt-1 text-[10px] text-slate-400 dark:border-slate-700">
              {t('map.legendFooter')}
            </div>
          </div>
        </div>

        {/* Right-Side Collapsible Edit & Configuration Panel (Spec Section 7.2) */}
        {isRightPanelOpen && (
          <aside className="flex w-full flex-col rounded-xl border border-slate-200 bg-white shadow-sm lg:w-96 lg:shrink-0">
            {/* Prototype Disclaimer Header */}
            <div className="border-b border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">
                  {t('map.panelTitle')}
                </h3>
                <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                  {t('map.prototypeStateBadge')}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                {t('map.panelDisclaimer')}
              </p>

              {/* Panel Navigation Tabs */}
              <div className="mt-3 grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setPanelTab('inspect')}
                  className={`rounded-md py-1.5 font-semibold transition-colors ${
                    panelTab === 'inspect'
                      ? 'bg-white text-teal-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t('map.tabInspect')}
                </button>
                <button
                  type="button"
                  onClick={() => setPanelTab('add')}
                  className={`rounded-md py-1.5 font-semibold transition-colors ${
                    panelTab === 'add'
                      ? 'bg-white text-teal-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t('map.tabAdd')}
                </button>
                <button
                  type="button"
                  onClick={() => setPanelTab('network')}
                  className={`rounded-md py-1.5 font-semibold transition-colors ${
                    panelTab === 'network'
                      ? 'bg-white text-teal-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t('map.tabStations', { count: sensors.length })}
                </button>
              </div>
            </div>

            {/* Tab 1: Inspect & Edit Selected Sensor or Segment */}
            {panelTab === 'inspect' && (
              <div className="flex-1 overflow-y-auto p-4">
                {selectedSensor ? (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div>
                        <span className="font-mono text-xs font-bold text-teal-600">
                          {t('dashboard.stationTag', {
                            id: selectedSensor.id,
                          })}
                        </span>
                        <h4 className="text-base font-bold text-slate-800">
                          {tSensorName(selectedSensor)}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {tVillage(selectedSensor.village || 'Lefke')} ·{' '}
                          {tArea(selectedSensor.area || '')}
                        </p>
                      </div>
                      <StatusBadge status={selectedSensor.status} />
                    </div>

                    {/* Live Simulated Telemetry Snapshot */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg border border-slate-200 p-2">
                        <span className="block text-[10px] text-slate-400">
                          {t('sensorDetails.flowRate')}
                        </span>
                        <strong className="font-mono text-sm text-slate-800">
                          {selectedSensor.current.flowRateLps.toFixed(2)} L/s
                        </strong>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-2">
                        <span className="block text-[10px] text-slate-400">
                          {t('sensorDetails.waterLevel')}
                        </span>
                        <strong className="font-mono text-sm text-slate-800">
                          {selectedSensor.current.waterLevelM.toFixed(3)} m
                        </strong>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-2">
                        <span className="block text-[10px] text-slate-400">
                          {t('map.velocity')}
                        </span>
                        <strong className="font-mono text-sm text-slate-800">
                          {(
                            selectedSensor.current.flowVelocityMps ?? 0.7
                          ).toFixed(2)}{' '}
                          m/s
                        </strong>
                      </div>
                    </div>

                    {/* Edit Sensor Properties Form */}
                    <form
                      onSubmit={handleSaveSensorEdits}
                      className="space-y-3 border-t border-slate-200 pt-3 text-xs"
                    >
                      <div className="font-semibold uppercase tracking-wider text-slate-400">
                        {t('map.editSensorHeading')}
                      </div>

                      <div>
                        <label className="mb-1 block font-medium text-slate-700">
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
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-800"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block font-medium text-slate-700">
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
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-800"
                          >
                            {KNOWN_VILLAGES.map((v) => (
                              <option key={v} value={v}>
                                {tVillage(v)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block font-medium text-slate-700">
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
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-800"
                          >
                            {channelSegments.map((seg) => (
                              <option key={seg.id} value={seg.id}>
                                {seg.id} —{' '}
                                {tSegmentName(seg.id, seg.name).slice(0, 18)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block font-medium text-slate-700">
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
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-800"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block font-medium text-slate-700">
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
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block font-medium text-slate-700">
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
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-slate-800"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block font-medium text-slate-700">
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
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block font-medium text-slate-700">
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
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-slate-800"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="submit"
                          className="flex-1 rounded-lg bg-teal-600 px-3 py-2 font-semibold text-white hover:bg-teal-700"
                        >
                          {t('map.saveChangesBtn')}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSensorOffline(selectedSensor.id)}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          {selectedSensor.status === 'offline'
                            ? t('map.setOnlineBtn')
                            : t('map.simulateOfflineBtn')}
                        </button>
                      </div>
                    </form>

                    {/* Navigation & Deletion Actions */}
                    <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/sensors/${selectedSensor.id}`)
                        }
                        className="font-semibold text-teal-600 hover:underline"
                      >
                        {t('map.openFullTelemetryLink', {
                          id: selectedSensor.id,
                        })}
                      </button>

                      {sensors.length > 1 && (
                        <div>
                          {confirmDeleteId === selectedSensor.id ? (
                            <div className="flex items-center gap-1.5">
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
                                }}
                                className="rounded bg-red-600 px-2 py-1 font-semibold text-white hover:bg-red-700"
                              >
                                {t('map.confirmRemoveBtn')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded border border-slate-200 px-2 py-1 text-slate-600"
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
                              className="text-red-600 hover:underline"
                            >
                              {t('map.removeStationBtn')}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : selectedSegment ? (
                  <div className="space-y-4 text-xs">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <span className="font-mono text-xs font-bold text-teal-600">
                        {t('map.channelSegmentHeader', {
                          id: selectedSegment.id,
                        })}
                      </span>
                      <h4 className="mt-0.5 text-base font-bold text-slate-800">
                        {tSegmentName(selectedSegment.id, selectedSegment.name)}
                      </h4>
                      <p className="mt-1 text-slate-500">
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
            )}

            {/* Tab 2: Add Virtual Simulated Sensor */}
            {panelTab === 'add' && (
              <form
                onSubmit={handleAddSensorSubmit}
                className="flex-1 space-y-3 overflow-y-auto p-4 text-xs"
              >
                <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-teal-900">
                  <div className="font-bold">{t('map.addSensorCardTitle')}</div>
                  <p className="mt-0.5 text-[11px]">
                    {t('map.addSensorCardDesc')}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setViewType('map');
                      setMode(mode === 'place' ? 'view' : 'place');
                    }}
                    className={`mt-2 w-full rounded-md px-2.5 py-1.5 font-semibold transition-colors ${
                      mode === 'place'
                        ? 'bg-amber-600 text-white'
                        : 'bg-teal-600 text-white hover:bg-teal-700'
                    }`}
                  >
                    {mode === 'place'
                      ? t('map.clickMapNowBtn')
                      : t('map.orClickMapBtn')}
                  </button>
                </div>

                <div>
                  <label className="mb-1 block font-medium text-slate-700">
                    {t('map.stationDisplayName')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t('map.stationNamePlaceholder', {
                      id: `S0${sensors.length + 1}`,
                    })}
                    value={newSensorForm.name}
                    onChange={(e) =>
                      setNewSensorForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block font-medium text-slate-700">
                      {t('map.channelSegmentLabel')}
                    </label>
                    <select
                      value={newSensorForm.channelSegmentId}
                      onChange={(e) =>
                        handleSegmentChangeInAddForm(e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-800"
                    >
                      {channelSegments.map((seg) => (
                        <option key={seg.id} value={seg.id}>
                          {seg.id} ({tVillage(seg.village || 'Lefke')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block font-medium text-slate-700">
                      {t('map.villageLabel')}
                    </label>
                    <select
                      value={newSensorForm.village}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNewSensorForm((prev) => ({
                          ...prev,
                          village: v,
                          area:
                            KNOWN_AREAS_BY_VILLAGE[v]?.[0] || prev.area,
                        }));
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-800"
                    >
                      {KNOWN_VILLAGES.map((v) => (
                        <option key={v} value={v}>
                          {tVillage(v)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block font-medium text-slate-700">
                    {t('map.areaLabel')}
                  </label>
                  <input
                    type="text"
                    value={newSensorForm.area}
                    onChange={(e) =>
                      setNewSensorForm((prev) => ({
                        ...prev,
                        area: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block font-medium text-slate-700">
                      {t('map.baselineFlowLabel')}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      required
                      value={newSensorForm.flowRateLps}
                      onChange={(e) =>
                        setNewSensorForm((prev) => ({
                          ...prev,
                          flowRateLps: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-medium text-slate-700">
                      {t('map.baselineLevelLabel')}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.05"
                      required
                      value={newSensorForm.waterLevelM}
                      onChange={(e) =>
                        setNewSensorForm((prev) => ({
                          ...prev,
                          waterLevelM: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block font-medium text-slate-700">
                      {t('map.illustrativeLatLabel')}
                    </label>
                    <input
                      type="number"
                      step="0.0005"
                      required
                      value={newSensorForm.lat}
                      onChange={(e) =>
                        setNewSensorForm((prev) => ({
                          ...prev,
                          lat: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-medium text-slate-700">
                      {t('map.illustrativeLngLabel')}
                    </label>
                    <input
                      type="number"
                      step="0.0005"
                      required
                      value={newSensorForm.lng}
                      onChange={(e) =>
                        setNewSensorForm((prev) => ({
                          ...prev,
                          lng: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-slate-800"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-lg bg-teal-600 px-3 py-2.5 font-semibold text-white shadow-sm hover:bg-teal-700"
                >
                  {t('map.submitAddSensorBtn')}
                </button>
              </form>
            )}

            {/* Tab 3: All Simulated Stations & Segments Directory */}
            {panelTab === 'network' && (
              <div className="flex-1 space-y-4 overflow-y-auto p-4 text-xs">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-bold uppercase tracking-wider text-slate-400">
                      {t('map.simulatedStationsHeader', {
                        count: sensors.length,
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPanelTab('add')}
                      className="font-semibold text-teal-600 hover:underline"
                    >
                      {t('map.addNewLink')}
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {sensors.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => handleSelectSensor(s.id, true)}
                        className={`flex cursor-pointer items-center justify-between rounded-lg border p-2.5 transition-colors ${
                          s.id === selectedSensorId
                            ? 'border-teal-300 bg-teal-50'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-teal-600">
                              {s.id}
                            </span>
                            <span className="font-semibold text-slate-800">
                              {tSensorName(s)}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {tVillage(s.village || 'Lefke')} ·{' '}
                            {s.current.flowRateLps.toFixed(1)} L/s ·{' '}
                            {s.current.waterLevelM.toFixed(2)} m
                          </span>
                        </div>
                        <StatusBadge status={s.status} size="sm" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-bold uppercase tracking-wider text-slate-400">
                      {t('map.channelSegmentsHeader', {
                        count: channelSegments.length,
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setViewType('map');
                        setMode('draw');
                      }}
                      className="font-semibold text-teal-600 hover:underline"
                    >
                      {t('map.drawChannelLink')}
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {channelSegments.map((seg) => (
                      <div
                        key={seg.id}
                        onClick={() => handleSelectSegment(seg.id)}
                        className={`flex cursor-pointer items-center justify-between rounded-lg border p-2.5 transition-colors ${
                          seg.id === selectedSegmentId
                            ? 'border-teal-300 bg-teal-50'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                        }`}
                      >
                        <div>
                          <span className="font-mono font-bold text-teal-600">
                            {seg.id}
                          </span>{' '}
                          <span className="font-medium text-slate-800">
                            {tSegmentName(seg.id, seg.name)}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {t('map.ptsShort', { count: seg.path.length })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {alerts.filter((a) => a.status === 'active').length > 0 && (
                  <div className="border-t border-slate-200 pt-3">
                    <span className="mb-2 block font-bold uppercase tracking-wider text-slate-400">
                      {t('map.activeNetworkAlertsHeader')}
                    </span>
                    <div className="space-y-1.5">
                      {alerts
                        .filter((a) => a.status === 'active')
                        .slice(0, 3)
                        .map((alert) => {
                          const localizedAlert = tAlert(alert);
                          return (
                            <div
                              key={alert.id}
                              className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900"
                            >
                              <div className="font-bold">
                                {localizedAlert.title}
                              </div>
                              <div className="mt-0.5 opacity-80">
                                {t('map.stationsLabel')}{' '}
                                {alert.sensorIds.join(', ')}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </aside>
        )}
      </div>
    </AppLayout>
  );
}
