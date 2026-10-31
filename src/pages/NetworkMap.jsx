import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNetwork } from '../context/NetworkContext';
import { DEMO_MODE_LABEL } from '../simulation/demoData';
import { StatusBadge } from '../components/sensors/StatusBadge';
import { AppLayout } from '../components/layout/AppLayout';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { Icon } from 'leaflet';
import { v4 as uuidv4 } from 'uuid';

const sensorColors = {
  normal: 'teal',
  warning: 'amber',
  critical: 'red',
  offline: 'gray',
};

const CYPRUS_CENTER = [35.1264, 33.4299];

const sensorCoords = {
  S01: [35.1065, 32.8452],
  S02: [35.1118, 32.8498],
  S03: [35.1174, 32.8546],
  S04: [35.1232, 32.8595],
};

const formatLastUpdate = (updatedAt) => {
  const date = new Date(updatedAt);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} d ago`;
  return date.toLocaleDateString();
};

const DefaultIcon = new Icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Component that uses Leaflet's native click event (more reliable than React onClick)
function MapClickHandler({ onMapClick, mode }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const handler = (e) => {
      // Only handle clicks when in draw or place mode
      if (mode === 'draw' || mode === 'place') {
        onMapClick(e.latlng);
      }
    };

    map.on('click', handler);

    return () => {
      map.off('click', handler);
    };
  }, [map, mode, onMapClick]);

  return null;
}

// Map interaction controller - disables dragging/zoom in draw/place mode
function MapInteractionController({ mode }) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    if (!container) return;

    if (mode === 'draw' || mode === 'place') {
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
      if (map.tap) map.tap.disable();
      container.style.cursor = 'crosshair';
    } else {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
      if (map.tap) map.tap.enable();
      container.style.cursor = '';
    }
  }, [map, mode]);

  return null;
}

export function NetworkMap() {
  const navigate = useNavigate();
  const { sensors, channelSegments, demoBannerText, addSensor, addChannelSegment } = useNetwork();
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const panelRef = useRef(null);

  const [mode, setMode] = useState('view');
  const [channelPoints, setChannelPoints] = useState([]);
  const [mousePosition, setMousePosition] = useState(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setPanelOpen(false);
        setSelectedSensor(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Use Leaflet's native click event for reliable click detection
  const handleMapClick = useCallback((latlng) => {
    const { lat, lng } = latlng;

    if (mode === 'draw') {
      setChannelPoints(prev => [...prev, [lat, lng]]);
    } else if (mode === 'place') {
      for (const segment of channelSegments) {
        const path = segment.path;
        if (path.length < 2) continue;

        let minDist = Infinity;
        let closestPoint = null;
        for (let i = 0; i < path.length - 1; i++) {
          const p1 = path[i];
          const p2 = path[i + 1];
          // p1, p2 are {lat, lng} objects
          const p1Lat = p1.lat;
          const p1Lng = p1.lng;
          const p2Lat = p2.lat;
          const p2Lng = p2.lng;
          
          // Project click point onto line segment
          const x = lng - p1Lng;
          const y = lat - p1Lat;
          const dx = p2Lng - p1Lng;
          const dy = p2Lat - p1Lat;
          const lenSq = dx * dx + dy * dy;
          
          let t = (x * dx + y * dy) / lenSq;
          t = Math.max(0, Math.min(1, t));
          
          const projLat = p1Lat + t * dy;
          const projLng = p1Lng + t * dx;
          const dist = Math.sqrt((lat - projLat) ** 2 + (lng - projLng) ** 2);
          
          if (dist < minDist) {
            minDist = dist;
            closestPoint = [projLat, projLng];
          }
        }

        // Increased tolerance to ~0.02 degrees (~2km) for easier clicking
        if (minDist < 0.02 && closestPoint) {
          const newSensor = {
            id: uuidv4(),
            name: `Sensor ${sensors.length + 1}`,
            channelSegmentId: segment.id,
            location: { lat: closestPoint[0], lng: closestPoint[1], label: `Placed on channel` },
            status: 'normal',
            current: {
              flowRateLps: 2.0 + Math.random() * 3,
              waterLevelM: 0.4 + Math.random() * 0.8,
              updatedAt: new Date().toISOString(),
            },
            baseline: { flowRateLps: 2.5, waterLevelM: 0.6 },
          };
          addSensor(newSensor);
          setMode('view');
          setSelectedSensor(newSensor.id);
          setPanelOpen(true);
          break;
        }
      }
    }
  }, [mode, channelSegments, sensors.length, addSensor]);

  const finishDrawing = useCallback(() => {
    if (channelPoints.length < 2) {
      setChannelPoints([]);
      setMode('view');
      return;
    }

    const newSegment = {
      id: uuidv4(),
      name: `Channel ${channelSegments.length + 1}`,
      path: channelPoints.map(([lat, lng]) => ({ lat, lng })),
    };
    addChannelSegment(newSegment);

    const sourceSensor = {
      id: uuidv4(),
      name: `Source Sensor ${sensors.length + 1}`,
      channelSegmentId: newSegment.id,
      location: { lat: channelPoints[0][0], lng: channelPoints[0][1], label: 'Channel source' },
      status: 'normal',
      current: {
        flowRateLps: 5.0,
        waterLevelM: 1.0,
        updatedAt: new Date().toISOString(),
      },
      baseline: { flowRateLps: 5.0, waterLevelM: 1.0 },
    };
    addSensor(sourceSensor);

    const mouthSensor = {
      id: uuidv4(),
      name: `Mouth Sensor ${sensors.length + 2}`,
      channelSegmentId: newSegment.id,
      location: {
        lat: channelPoints[channelPoints.length - 1][0],
        lng: channelPoints[channelPoints.length - 1][1],
        label: 'Channel mouth',
      },
      status: 'normal',
      current: {
        flowRateLps: 3.0,
        waterLevelM: 0.3,
        updatedAt: new Date().toISOString(),
      },
      baseline: { flowRateLps: 3.0, waterLevelM: 0.3 },
    };
    addSensor(mouthSensor);

    setChannelPoints([]);
    setMode('view');
  }, [channelPoints, channelSegments.length, sensors.length, addChannelSegment, addSensor]);

  const cancelDrawing = useCallback(() => {
    setChannelPoints([]);
    setMode('view');
  }, []);

  const renderSensorPopUp = (sensor) => (
    <div className="fixed bottom-4 left-4 right-4 bg-white rounded-xl shadow-2xl p-6 max-w-md border border-slate-200">
      <div className="flex items-start gap-3">
        <div className="w-3 h-3 rounded-full bg-teal-600 flex-shrink-0 opacity-90"></div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-800">{sensor.name}</h3>
          <p className="text-sm text-slate-500">{sensor.location.label}</p>
          <p className="text-xs text-slate-400">{formatLastUpdate(sensor.current.updatedAt)}</p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2 text-sm"><span className="font-medium text-slate-600">Flow:</span><span className="font-mono text-slate-800 tabular-nums">{sensor.current.flowRateLps.toFixed(2)} L/s</span></div>
        <div className="flex items-center gap-2 text-sm my-2"><span className="font-medium text-slate-600">Level:</span><span className="font-mono text-slate-800 tabular-nums">{sensor.current.waterLevelM.toFixed(3)} m</span></div>
        <div className="flex items-center gap-2 text-sm"><span className="font-medium text-slate-600">Status:</span><StatusBadge status={sensor.status} size="sm" /></div>
      </div>
      <button onClick={() => {setPanelOpen(false);setSelectedSensor(null);navigate('/sensors/' + sensor.id);}} className="mt-4 w-full rounded-md px-4 py-2 text-sm font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 focus-visible:outline focus-visible:ring-2 focus-visible:ring-teal-500">Navigate to Sensor Details</button>
    </div>
  );

  const renderEditPanel = () => {
    if (!selectedSensor) return null;
    const sensor = sensors.find((s) => s.id === selectedSensor);
    if (!sensor) return null;
    return (
      <div className="fixed right-0 top-0 bottom-0 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out translateX0" ref={panelRef}>
        <div className="p-6 border-b border-slate-200"><h3 className="font-semibold text-slate-800 text-sm">Sensor: {sensor?.name}</h3><button onClick={() => {setPanelOpen(false);setSelectedSensor(null);}} className="text-slate-400 text-sm float-right hover:text-slate-600">Close</button></div>
        <div className="p-6">
          <p className="text-xs text-slate-500 mb-4 block">Illustration only — does not alter physical infrastructure</p>
          <div className="mb-4"><label className="block text-sm font-medium text-slate-700 mb-2">Name</label><input type="text" value={sensor?.name || ''} className="w-full rounded-md border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500" readOnly /><span className="text-xs text-slate-400 block mt-1">Illustrative name (prototype state only)</span></div>
          <div className="mb-4"><label className="block text-sm font-medium text-slate-700 mb-2">Flow (L/s)</label><input type="number" value={sensor?.current?.flowRateLps?.toFixed(2) || '0'} className="w-full rounded-md border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500" readOnly /><span className="text-xs text-slate-400 block mt-1">Simulated value — read only in prototype mode</span></div>
          <div className="mb-4"><label className="block text-sm font-medium text-slate-700 mb-2">Water Level (m)</label><input type="number" value={sensor?.current?.waterLevelM?.toFixed(3) || '0'} className="w-full rounded-md border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500" readOnly /><span className="text-xs text-slate-400 block mt-1">Simulated value — read only in prototype mode</span></div>
          <div className="mb-4"><label className="block text-sm font-medium text-slate-700 mb-2">Status</label><select value={sensor?.status || 'normal'} className="w-full rounded-md border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 py-1" readOnly><option value="normal">Normal</option><option value="warning">Warning</option><option value="critical">Critical</option><option value="offline">Offline</option></select><span className="text-xs text-slate-400 block mt-1">Status reflects shared simulation state</span></div>
        </div>
      </div>
    );
  };

  return (
    <AppLayout title="Network Map">
      <div className="flex-1 w-full h-full">
        <div className="relative w-full h-full">
          {/* Toolbar */}
          <div className="absolute top-4 right-4 z-[9999] flex gap-2 bg-white rounded-lg shadow-lg p-2 border border-slate-200">
            <button
              onClick={() => setMode(mode === 'draw' ? 'view' : 'draw')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                mode === 'draw'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              title={mode === 'draw' ? 'Click to add points, then Complete Channel' : 'Draw new channel (source = first point)'}
            >
              {mode === 'draw' ? '✏️ Drawing...' : '✏️ Draw Channel'}
            </button>
            <button
              onClick={() => setMode(mode === 'place' ? 'view' : 'place')}
              disabled={channelSegments.length === 0}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                mode === 'place'
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Click on a channel line to place a sensor"
            >
              {mode === 'place' ? '📍 Placing...' : '📍 Place Sensor'}
            </button>
            {mode === 'draw' && channelPoints.length > 0 && (
              <>
                <button
                  onClick={finishDrawing}
                  className="px-3 py-1.5 text-sm rounded-md bg-teal-600 text-white hover:bg-teal-700"
                >
                  ✅ Complete Channel
                </button>
                <button
                  onClick={cancelDrawing}
                  className="px-3 py-1.5 text-sm rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                >
                  ❌ Cancel
                </button>
                <span className="px-3 py-1.5 text-sm text-slate-600 self-center">
                  {channelPoints.length} pts
                </span>
              </>
            )}
          </div>

          <MapContainer
            center={CYPRUS_CENTER}
            zoom={9}
            scrollWheelZoom={true}
            style={{ width: '100%', height: '100%', minHeight: '600px', borderRadius: '0.5rem' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Map click handler - uses Leaflet native events */}
            <MapClickHandler onMapClick={handleMapClick} mode={mode} />

            {/* Map interaction controller */}
            <MapInteractionController mode={mode} />

            {/* Existing channel segments */}
            {channelSegments.map((segment) => (
              <Polyline
                key={segment.id}
                positions={segment.path.map(p => [p.lat, p.lng])}
                color={segment.isIllustrative ? '#94a3b8' : '#0d9488'}
                weight={3}
                opacity={segment.isIllustrative ? 0.5 : 0.8}
              />
            ))}

            {/* Drawing preview */}
            {mode === 'draw' && channelPoints.length > 0 && (
              <>
                <Polyline
                  key="drawing-preview"
                  positions={channelPoints}
                  color="#eab308"
                  weight={4}
                  dashArray="10, 6"
                  opacity={1}
                />
                {channelPoints.map((point, idx) => (
                  <CircleMarker
                    key={`draw-point-${idx}`}
                    center={point}
                    radius={idx === 0 ? 12 : 10}
                    fillColor={idx === 0 ? '#dc2626' : '#eab308'}
                    fillOpacity={1}
                    color="white"
                    weight={4}
                    opacity={1}
                  >
                    <Popup>
                      <div className="p-2 text-center">
                        <p className="font-semibold text-slate-800">
                          {idx === 0 ? '🌊 Source (start)' : `Point ${idx + 1}`}
                        </p>
                        <p className="text-xs text-slate-500">
                          {point[0].toFixed(6)}, {point[1].toFixed(6)}
                        </p>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
                {mousePosition && (
                  <CircleMarker
                    key="ghost-marker"
                    center={[mousePosition.lat, mousePosition.lng]}
                    radius={10}
                    fillColor="#22c55e"
                    fillOpacity={0.6}
                    color="#16a34a"
                    weight={3}
                    dashArray="4, 4"
                  >
                    <Popup>
                      <div className="p-2 text-center text-xs">
                        <p className="font-medium text-green-700">Next point</p>
                        <p>{mousePosition.lat.toFixed(6)}, {mousePosition.lng.toFixed(6)}</p>
                      </div>
                    </Popup>
                  </CircleMarker>
                )}
              </>
            )}

            {/* Flow direction arrows for drawn channels */}
            {channelSegments
              .filter(s => s.isIllustrative && s.path.length >= 2)
              .map((segment) => {
                const path = segment.path;
                const arrowIdx = Math.floor(path.length * 0.3);
                const arrowStart = path[arrowIdx];
                const arrowEnd = path[Math.min(arrowIdx + 1, path.length - 1)];
                const dx = arrowEnd.lng - arrowStart.lng;
                const dy = arrowEnd.lat - arrowStart.lat;
                const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                return (
                  <div key={segment.id}>
                    <Polyline
                      positions={[[arrowStart.lat, arrowStart.lng], [arrowEnd.lat, arrowEnd.lng]]}
                      color="#f97316"
                      weight={4}
                      opacity={1}
                    />
                    <div
                      className="leaflet-marker-icon"
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        transform: `translate(${arrowStart.lng * 100000}px, ${arrowStart.lat * 100000}px) rotate(${angle}deg)`,
                        pointerEvents: 'none',
                      }}
                    >
                      <svg width="24" height="12" viewBox="0 0 24 12" fill="#f97316">
                        <polygon points="0,0 24,6 0,12" />
                      </svg>
                    </div>
                  </div>
                );
              })}

            {/* Sensor markers */}
            {sensors.map((sensor) => {
              let coords;
              if (sensor.channelSegmentId) {
                const segment = channelSegments.find(s => s.id === sensor.channelSegmentId);
                if (segment && segment.path.length > 0) {
                  // segment.path[0] is {lat, lng} object
                  const firstPt = segment.path[0];
                  const useLocation = sensor.location?.lat;
                  coords = useLocation 
                    ? [sensor.location.lat, sensor.location.lng]
                    : [firstPt.lat, firstPt.lng];
                } else {
                  coords = sensorCoords[sensor.id];
                }
              } else {
                coords = sensorCoords[sensor.id];
              }

              if (!coords) return null;

              const color = sensorColors[sensor.status] || sensorColors.normal;
              return (
                <CircleMarker
                  key={sensor.id}
                  center={coords}
                  radius={sensor.channelSegmentId ? 10 : 12}
                  fillColor={color}
                  fillOpacity={1}
                  color="white"
                  weight={3}
                  opacity={1}
                  onClick={() => {
                    setSelectedSensor(sensor.id);
                    setPanelOpen(true);
                  }}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-semibold text-slate-800">{sensor.name}</h3>
                      <p className="text-sm text-slate-500">{sensor.location.label}</p>
                      <p className="text-xs text-slate-400">{formatLastUpdate(sensor.current.updatedAt)}</p>
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-1 text-xs"><span className="font-medium text-slate-600">Flow:</span><span className="font-mono text-slate-800">{sensor.current.flowRateLps.toFixed(2)} L/s</span></div>
                        <div className="flex items-center gap-1 text-xs"><span className="font-medium text-slate-600">Level:</span><span className="font-mono text-slate-800">{sensor.current.waterLevelM.toFixed(3)} m</span></div>
                        <button
                          className="mt-2 w-full text-xs text-teal-600 hover:underline"
                          onClick={() => navigate('/sensors/' + sensor.id)}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>

          <div className="absolute top-2 right-2 bg-teal-600 text-white text-xs font-medium px-3 py-1 rounded-md">
            DEMO MODE — SIMULATED SENSOR DATA
          </div>
        </div>

        {renderEditPanel()}
        {selectedSensor && renderSensorPopUp(
          sensors.find((s) => s.id === selectedSensor)
        )}
      </div>
    </AppLayout>
  );
}
