import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNetwork } from '../context/NetworkContext';
import { DEMO_MODE_LABEL } from '../simulation/demoData';
import { StatusBadge } from '../components/sensors/StatusBadge';
import { AppLayout } from '../components/layout/AppLayout';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { Icon } from 'leaflet';

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

export function NetworkMap() {
  const navigate = useNavigate();
  const { sensors, channelSegments, demoBannerText, addSensor, addChannelSegment } = useNetwork();
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [map, setMap] = useState(null);
  const panelRef = useRef(null);

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
          <MapContainer
            center={CYPRUS_CENTER}
            zoom={9}
            scrollWheelZoom={true}
            style={{ width: '100%', height: '100%', minHeight: '600px', borderRadius: '0.5rem' }}
            whenCreated={setMap}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {channelSegments.map((segment) => (
              <Polyline
                key={segment.id}
                positions={segment.path.map(p => [p.lat, p.lng])}
                color={segment.isIllustrative ? '#94a3b8' : '#0d9488'}
                weight={2}
                opacity={segment.isIllustrative ? 0.4 : 0.8}
              />
            ))}
            {sensors.map((sensor) => {
              const coords = sensorCoords[sensor.id];
              const color = sensorColors[sensor.status] || sensorColors.normal;
              return (
                <CircleMarker
                  key={sensor.id}
                  center={coords}
                  radius={10}
                  fillColor={color}
                  fillOpacity={0.9}
                  color="white"
                  weight={2}
                  onClick={() => {
                    setSelectedSensor(sensor.id);
                    setPanelOpen(true);
                    if (map) map.flyTo(coords, 12);
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
