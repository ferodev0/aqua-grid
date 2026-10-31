import { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import './index.css';
import { useNetwork } from './context/NetworkContext';

const COLOR_PALETTE = [
  '#0d9488', // teal-600
  '#0284c7', // sky-600
  '#d97706', // amber-600
  '#e11d48', // rose-600
  '#8b5cf6', // violet-500
  '#10b981'  // emerald-500
];

const STATUS_BADGE_STYLES = {
  normal: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-100 text-amber-800 border-amber-300',
  critical: 'bg-red-100 text-red-700 border-red-300',
  offline: 'bg-slate-200 text-slate-600 border-slate-300',
};

const ALERT_BADGE_STYLES = {
  info: 'bg-sky-50 border-sky-200 text-sky-900',
  warning: 'bg-amber-50 border-amber-300 text-amber-900',
  critical: 'bg-red-50 border-red-300 text-red-900',
};

function formatTime(isoString) {
  if (!isoString) return '--:--:--';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function TopThreeList({ items, renderItem, emptyMessage = 'No data' }) {
  if (!items || items.length === 0) {
    return <div className="text-sm text-slate-500 italic">{emptyMessage}</div>;
  }

  const topThree = items.slice(0, 3);
  const remainingCount = items.length - 3;

  return (
    <div className="flex flex-col gap-1.5">
      {topThree.map((item, index) => renderItem(item, index))}
      
      {remainingCount > 0 && (
        <div className="text-center pt-2 mt-1 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
            + {remainingCount} Other{remainingCount > 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedRange, setSelectedRange] = useState('1h');
  const [selectedSensorId, setSelectedSensorId] = useState('ALL');
  
  const [chartGroupBy, setChartGroupBy] = useState('sensor'); 
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const {
    demoBannerText,
    sensors,
    alerts,
    summaryMetrics,
    isCrisisActive,
    triggerCrisis,
    resetSimulation,
    getSensorTelemetry,
  } = useNetwork();

  const sensorColors = useMemo(() => {
    const colorMap = {};
    sensors.forEach((s, index) => {
      colorMap[s.id] = COLOR_PALETTE[index % COLOR_PALETTE.length];
    });
    return colorMap;
  }, [sensors]);

  const visibleSensors =
    selectedSensorId === 'ALL'
      ? sensors
      : sensors.filter((s) => s.id === selectedSensorId);

  // --- KÖYE GÖRE GRUPLAMALAR ---
  const { villagesData, villagePowerData, villageActiveData, villageMaxFlowData } = useMemo(() => {
    const vData = {};
    const activeByVillage = {};
    const maxFlowByVillage = {};

    sensors.forEach(sensor => {
      const village = sensor.village || 'Unknown Village';
      
      // 1. Sensörleri Köylere Ayır (Açılır menü için)
      if (!vData[village]) vData[village] = [];
      vData[village].push(sensor);

      // 2. Aktif Sensör Sayımı (Köye Göre)
      if (!activeByVillage[village]) activeByVillage[village] = { total: 0, active: 0 };
      activeByVillage[village].total += 1;
      if (sensor.status === 'normal') activeByVillage[village].active += 1;

      // 3. Maksimum Akış Hızı (Köye Göre Referans Belirleme)
      const flowLps = Number(sensor.current?.flowRateLps) || 0;
      if (!maxFlowByVillage[village] || flowLps > maxFlowByVillage[village].flowRateLps) {
        maxFlowByVillage[village] = {
          sensorId: sensor.id,
          flowRateLps: flowLps,
          headHeight: sensor.headHeight || 2.8,
          turbineEfficiency: sensor.turbineEfficiency || 0.65
        };
      }
    });

    // Formata Çevirme ve Güç (Power) Hesabı (Köye Göre EN YÜKSEK Referans Akışına Göre)
    const pData = Object.keys(maxFlowByVillage).map(village => {
      const maxData = maxFlowByVillage[village];
      const calculatedWatts = 1000 * 9.81 * (maxData.flowRateLps / 1000) * maxData.headHeight * maxData.turbineEfficiency;
      return {
        id: village, 
        name: village, 
        sensorId: maxData.sensorId, // Hover'da göstermek için sensör ID'si eklendi
        powerWatts: calculatedWatts
      };
    }).sort((a, b) => b.powerWatts - a.powerWatts);

    const aData = Object.keys(activeByVillage).map(village => ({
      id: village, name: village, ...activeByVillage[village]
    })).sort((a, b) => b.active - a.active);

    const mFlowData = Object.keys(maxFlowByVillage).map(village => ({
      id: village, name: village, ...maxFlowByVillage[village]
    })).sort((a, b) => b.flowRateLps - a.flowRateLps);

    return { 
      villagesData: vData, 
      villagePowerData: pData, 
      villageActiveData: aData, 
      villageMaxFlowData: mFlowData 
    };
  }, [sensors]);

  // Yeni maksimum güç değeri (Toplamı değil, en yüksek potansiyele sahip bölgeyi alır)
  const maxEstimatedPower = useMemo(() => {
    if (villagePowerData.length === 0) return 0;
    return villagePowerData[0].powerWatts; // Sıralı olduğu için [0] en büyüktür
  }, [villagePowerData]);

  const chartWidth = 680;
  const chartHeight = 250;
  const padLeft = 44;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 32;
  const innerWidth = chartWidth - padLeft - padRight;
  const innerHeight = chartHeight - padTop - padBottom;

  // Veriye ve Gruplamaya Dayalı Grafik Hesabı (Village / Sensor)
  const { dynamicMaxFlowY, dynamicTicks, activeSeries } = useMemo(() => {
    let maxVal = 0;
    let series = [];

    if (chartGroupBy === 'sensor') {
      series = visibleSensors.map((sensor) => {
        const points = getSensorTelemetry(sensor.id, selectedRange);
        points.forEach((pt) => { if (pt.flowRateLps > maxVal) maxVal = pt.flowRateLps; });
        return {
          id: sensor.id,
          name: sensor.name,
          color: sensorColors[sensor.id] || '#0f766e',
          points
        };
      });
    } else {
      // Köy (Village) bazlı MAKSİMUM referans grafik gösterimi
      const villages = [...new Set(visibleSensors.map(s => s.village || 'Unknown'))];
      series = villages.map((villageName, index) => {
        const villageSensors = visibleSensors.filter(s => s.village === villageName || (!s.village && villageName === 'Unknown'));
        const refPoints = getSensorTelemetry(villageSensors[0].id, selectedRange);
        
        const points = refPoints.map((refPt, idx) => {
          let maxFlow = 0;
          villageSensors.forEach(s => {
             const pts = getSensorTelemetry(s.id, selectedRange);
             const currentFlow = pts[idx]?.flowRateLps || 0;
             if (currentFlow > maxFlow) {
               maxFlow = currentFlow;
             }
          });
          if (maxFlow > maxVal) maxVal = maxFlow;
          return { ...refPt, flowRateLps: maxFlow };
        });

        return {
          id: villageName,
          name: `${villageName} (Max Ref)`,
          color: COLOR_PALETTE[index % COLOR_PALETTE.length],
          points
        };
      });
    }

    const calculatedMax = Math.max(Math.ceil(maxVal * 1.2), 10); 
    const tickCount = 5;
    const step = calculatedMax / tickCount;
    const ticks = Array.from({ length: tickCount + 1 }, (_, i) => parseFloat((i * step).toFixed(1)));

    const mappedSeries = series.map(s => {
      const coords = s.points.map((pt, idx) => {
        const x = padLeft + (s.points.length <= 1 ? innerWidth / 2 : (idx / (s.points.length - 1)) * innerWidth);
        const clampedFlow = Math.min(Math.max(pt.flowRateLps, 0), calculatedMax);
        const y = padTop + innerHeight - (clampedFlow / calculatedMax) * innerHeight;
        return { x, y, pt, sensorId: s.id, sensorName: s.name };
      });
      return {
        ...s,
        coords,
        polyline: coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
      };
    });

    return { dynamicMaxFlowY: calculatedMax, dynamicTicks: ticks, activeSeries: mappedSeries };
  }, [visibleSensors, getSensorTelemetry, selectedRange, chartGroupBy, sensorColors]);

  const referenceTicks = activeSeries[0]?.points || [];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      
      {/* Left Navigation Panel */}
      <aside
        className={`bg-white flex flex-col border-r border-slate-200 shadow-sm transition-all duration-300 ease-in-out z-20 ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="p-6 flex items-center justify-between">
          <h1
            className={`font-bold text-teal-600 tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ${
              isSidebarOpen ? 'w-auto opacity-100 text-2xl' : 'w-0 opacity-0 text-[0px]'
            }`}
          >
            Aqua Grid
          </h1>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-md text-slate-400 hover:bg-slate-100 hover:text-teal-600 focus:outline-none transition-colors"
            title={isSidebarOpen ? 'Menüyü Daralt' : 'Menüyü Genişlet'}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isSidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        <nav className="flex flex-col gap-2 px-3 flex-1 overflow-x-hidden">
          <NavLink
            to="/"
            className={`flex items-center gap-4 text-left px-3 py-3 rounded-lg border transition-all whitespace-nowrap ${
              isSidebarOpen
                ? 'bg-teal-50 text-teal-700 font-semibold border-teal-200'
                : 'bg-transparent text-teal-600 border-transparent hover:bg-teal-50 justify-center'
            }`}
          >
            <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span className={`transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
              Dashboard
            </span>
          </NavLink>
          
          <NavLink
            to="/map"
            className={`flex items-center gap-4 text-left px-3 py-3 rounded-lg border border-transparent transition-all whitespace-nowrap ${
              isSidebarOpen
                ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 justify-center'
            }`}
          >
            <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span className={`transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
              Network Map
            </span>
          </NavLink>

          <NavLink
            to="/sensors"
            className={`flex items-center gap-4 text-left px-3 py-3 rounded-lg border border-transparent transition-all whitespace-nowrap ${
              isSidebarOpen
                ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 justify-center'
            }`}
          >
            <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className={`transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
              Sensors
            </span>
          </NavLink>

          <NavLink
            to="/impact"
            className={`flex items-center gap-4 text-left px-3 py-3 rounded-lg border border-transparent transition-all whitespace-nowrap ${
              isSidebarOpen
                ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 justify-center'
            }`}
          >
            <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className={`transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
              Impact / About
            </span>
          </NavLink>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-6 overflow-y-auto relative">
        
        {/* Hover Tooltip Overlay (Grafik İçin) */}
        {hoveredPoint && (
          <div
            className="fixed z-50 bg-slate-900 text-white text-xs px-3 py-2 rounded shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full mt-[-10px]"
            style={{ left: hoveredPoint.clientX, top: hoveredPoint.clientY }}
          >
            <div className="font-bold mb-1" style={{ color: hoveredPoint.color || '#10b981' }}>
              {hoveredPoint.sensorId} {hoveredPoint.sensorName && `- ${hoveredPoint.sensorName}`}
            </div>
            <div>Zaman: {formatTime(hoveredPoint.pt.timestamp)}</div>
            <div>Akış: {hoveredPoint.pt.flowRateLps.toFixed(2)} L/s</div>
          </div>
        )}

        <header className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800">Network Overview</h2>
            <p className="text-sm text-slate-500">
              Lefke Canal Concept — Distributed Flow & Level Monitoring
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!isCrisisActive ? (
              <button
                type="button"
                onClick={triggerCrisis}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded text-sm font-semibold shadow-sm transition-colors cursor-pointer"
              >
                Trigger Crisis Simulation
              </button>
            ) : (
              <button
                type="button"
                onClick={resetSimulation}
                className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-1.5 rounded text-sm font-semibold shadow-sm transition-colors cursor-pointer"
              >
                Reset Simulation
              </button>
            )}

            <div className="bg-amber-100 text-amber-800 px-4 py-1.5 rounded text-sm font-bold border border-amber-300 tracking-wide shadow-sm">
              {demoBannerText}
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          
          {/* Max Power Potential Card (Toplama değil, En Yüksek Referans) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative group cursor-help transition-all hover:border-teal-300 hover:shadow-md">
            <h3 className="text-slate-500 text-sm font-medium mb-1">
              Max Power Potential
            </h3>
            <div className="text-3xl font-bold text-slate-800">
              {maxEstimatedPower.toFixed(0)} W
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Highest region reference (2.8m, 65% eff.)
            </p>

            <div className="absolute top-full left-0 mt-2 w-full min-w-[240px] bg-white border border-slate-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 p-3">
              <div className="text-xs font-semibold text-slate-500 mb-2 border-b pb-1">Max Potential by Village</div>
              <TopThreeList 
                items={villagePowerData} 
                renderItem={(data, idx) => (
                  <div key={data.id} className="flex justify-between items-center text-sm">
                    <span className="text-slate-600 font-medium truncate pr-2 max-w-[120px]" title={data.name}>
                      <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COLOR_PALETTE[idx % COLOR_PALETTE.length] }}></span>
                      {data.name}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-400">({data.sensorId})</span>
                      <span className="font-bold text-teal-700">{data.powerWatts.toFixed(0)} W</span>
                    </div>
                  </div>
                )}
              />
            </div>
          </div>

          {/* Active Sensors Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative group cursor-help transition-all hover:border-teal-300 hover:shadow-md">
            <h3 className="text-slate-500 text-sm font-medium mb-1">
              Active Sensors
            </h3>
            <div className="text-3xl font-bold text-slate-800">
              {summaryMetrics.activeSensorsCount} / {summaryMetrics.totalSensors}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {summaryMetrics.attentionSensorsCount > 0 ? (
                <span className="text-amber-600 font-semibold">
                  {summaryMetrics.attentionSensorsCount} station(s) require inspection
                </span>
              ) : (
                'All stations reporting within normal range'
              )}
            </p>

            <div className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 p-3">
              <div className="text-xs font-semibold text-slate-500 mb-2 border-b pb-1">Status by Village</div>
              <TopThreeList 
                items={villageActiveData} 
                renderItem={(data, idx) => (
                  <div key={data.id} className="flex justify-between items-center text-sm">
                    <span className="text-slate-600 font-medium">
                      <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COLOR_PALETTE[idx % COLOR_PALETTE.length] }}></span>
                      {data.name}
                    </span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${data.active === data.total ? STATUS_BADGE_STYLES['normal'] : STATUS_BADGE_STYLES['warning']}`}>
                      {data.active} / {data.total}
                    </span>
                  </div>
                )}
              />
            </div>
          </div>

          {/* Reference Flow Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative group cursor-help transition-all hover:border-teal-300 hover:shadow-md">
            <h3 className="text-slate-500 text-sm font-medium mb-1">
              Reference Flow ({summaryMetrics.referenceSensorId})
            </h3>
            <div className="text-3xl font-bold text-slate-800">
              {summaryMetrics.referenceInflowLps.toFixed(1)} L/s
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Downstream ({summaryMetrics.terminalSensorId}):{' '}
              <span
                className={
                  isCrisisActive ? 'text-red-600 font-semibold' : 'text-slate-600'
                }
              >
                {summaryMetrics.terminalOutflowLps.toFixed(1)} L/s
              </span>
            </p>

            <div className="absolute top-full left-0 mt-2 w-full min-w-[240px] bg-white border border-slate-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 p-3">
              <div className="text-xs font-semibold text-slate-500 mb-2 border-b pb-1">Max Flow by Village (L/s)</div>
              <TopThreeList 
                items={villageMaxFlowData} 
                renderItem={(data, idx) => (
                  <div key={data.id} className="flex justify-between items-center text-sm">
                    <span className="text-slate-600 font-medium truncate pr-2 max-w-[120px]" title={data.name}>
                      <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COLOR_PALETTE[idx % COLOR_PALETTE.length] }}></span>
                      {data.name}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-400">({data.sensorId})</span>
                      <span className="font-bold text-slate-800">
                        {data.flowRateLps.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-slate-500 text-sm font-medium mb-1">
              Open Alerts
            </h3>
            <div
              className={`text-3xl font-bold ${
                summaryMetrics.criticalSensorsCount > 0
                  ? 'text-red-600'
                  : summaryMetrics.openAlertsCount > 1
                  ? 'text-amber-600'
                  : 'text-slate-800'
              }`}
            >
              {summaryMetrics.openAlertsCount}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {isCrisisActive
                ? 'Downstream anomaly active — inspect S03 & S04'
                : 'Rule-based threshold monitoring active'}
            </p>
          </div>
        </section>
        
        <section className="flex flex-col lg:flex-row gap-4 flex-1 min-h-[420px]">
          {/* Chart Panel */}
          <div className="flex-[2] bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">
                  Simulated Water Flow Rate (L/s)
                </h3>
                <p className="text-xs text-slate-500">
                  Live telemetry stream
                </p>
              </div>

              <div className="flex items-center gap-2">
                
                {/* Gruplama (Sensor vs Village) Seçenekleri */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded border border-slate-200 text-xs mr-2">
                  <button 
                    onClick={() => setChartGroupBy('sensor')} 
                    className={`px-2.5 py-1 rounded font-semibold transition-colors ${chartGroupBy === 'sensor' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Sensors
                  </button>
                  <button 
                    onClick={() => setChartGroupBy('village')} 
                    className={`px-2.5 py-1 rounded font-semibold transition-colors ${chartGroupBy === 'village' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Villages (Max Ref)
                  </button>
                </div>

                {/* Köy gruplu (optgroup) Select Dropdown */}
                <select
                  value={selectedSensorId}
                  onChange={(e) => setSelectedSensorId(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 font-medium"
                >
                  <option value="ALL">All {sensors.length} Stations</option>
                  {Object.entries(villagesData).map(([village, vSensors]) => (
                    <optgroup key={village} label={`Village: ${village}`}>
                      {vSensors.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.id} — {s.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                <div className="flex text-xs bg-slate-100 p-0.5 rounded border border-slate-200">
                  {(['1h', '24h', '7d']).map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => setSelectedRange(range)}
                      className={`px-2.5 py-1 rounded font-semibold uppercase transition-colors ${
                        selectedRange === range
                          ? 'bg-white text-teal-700 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* SVG Time-Series Chart */}
            <div className="flex-1 flex flex-col justify-between bg-slate-50/70 border border-slate-200 rounded-lg p-3">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-full max-h-[290px] overflow-visible"
              >
                {dynamicTicks.map((tickVal) => {
                  const y = padTop + innerHeight - (tickVal / dynamicMaxFlowY) * innerHeight;
                  return (
                    <g key={tickVal}>
                      <line x1={padLeft} y1={y} x2={chartWidth - padRight} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
                      <text x={padLeft - 8} y={y + 4} textAnchor="end" className="fill-slate-400 text-[10px]">{tickVal} L/s</text>
                    </g>
                  );
                })}

                {/* Grafikteki noktalar ve çizgiler */}
                {activeSeries.map(({ id, polyline, coords, color }) => {
                  return (
                    <g key={id}>
                      <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={polyline} />
                      
                      {coords.map((coord, i) => (
                        <g key={i}>
                          {/* Mouse'u yakalamak için daha büyük şeffaf daire */}
                          <circle
                            cx={coord.x}
                            cy={coord.y}
                            r="12"
                            fill="transparent"
                            className="cursor-crosshair"
                            onMouseEnter={(e) => setHoveredPoint({ ...coord, color, clientX: e.clientX, clientY: e.clientY })}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                          {/* Görsel nokta, hover yapılınca büyür */}
                          <circle
                            cx={coord.x}
                            cy={coord.y}
                            r={hoveredPoint?.pt?.timestamp === coord.pt.timestamp && hoveredPoint?.sensorId === coord.sensorId ? "5" : "2.5"}
                            fill={color}
                            stroke="#ffffff"
                            strokeWidth="1.5"
                            className="pointer-events-none transition-all duration-100"
                          />
                        </g>
                      ))}
                    </g>
                  );
                })}

                {referenceTicks.length > 1 && (
                  <>
                    <text x={padLeft} y={chartHeight - 6} textAnchor="start" className="fill-slate-400 text-[10px]">
                      {formatTime(referenceTicks[0]?.timestamp)}
                    </text>
                    <text x={padLeft + innerWidth / 2} y={chartHeight - 6} textAnchor="middle" className="fill-slate-400 text-[10px]">
                      {formatTime(referenceTicks[Math.floor(referenceTicks.length / 2)]?.timestamp)}
                    </text>
                    <text x={chartWidth - padRight} y={chartHeight - 6} textAnchor="end" className="fill-slate-400 text-[10px]">
                      {formatTime(referenceTicks[referenceTicks.length - 1]?.timestamp)}
                    </text>
                  </>
                )}
              </svg>

              {/* Dinamik Grafik Lejantı (Village / Sensor geçişine uyumlu) */}
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2 border-t border-slate-200/80 text-xs">
                <TopThreeList 
                  items={activeSeries}
                  renderItem={(s) => (
                    <div key={s.id} className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full inline-block shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="font-medium text-slate-700 truncate max-w-[150px]" title={s.name}>{s.id} ({s.name}):</span>
                      <span className="font-bold text-slate-900 shrink-0">
                        {s.coords[s.coords.length - 1]?.pt.flowRateLps.toFixed(2)} L/s
                      </span>
                    </div>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Sensor Status Logs Panel */}
          <div className="flex-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col max-h-[500px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Alerts & Recent Events</h3>
              <span className="text-xs font-medium text-slate-500">{alerts.filter((a) => a.status === 'active').length} active</span>
            </div>

            <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
              {alerts.map((alert) => (
                <div key={alert.id} className={`p-3 border rounded-lg transition-opacity ${ALERT_BADGE_STYLES[alert.severity] || ALERT_BADGE_STYLES.info} ${alert.status === 'resolved' ? 'opacity-60' : ''}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">{alert.severity} • {alert.status}</span>
                    <span className="text-[11px] opacity-75">{formatTime(alert.createdAt)}</span>
                  </div>
                  <div className="text-sm font-semibold mb-1">{alert.title}</div>
                  <p className="text-xs leading-relaxed opacity-90">{alert.message}</p>
                  {alert.sensorIds?.length > 0 && (
                    <div className="flex gap-1.5 mt-2">
                      {alert.sensorIds.map((id) => (
                        <span key={id} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/80 border border-current/20">
                          Station {id}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}