import { useState } from 'react';
import './index.css';
import { useNetwork } from './context/NetworkContext';

const SENSOR_COLORS = {
  S01: '#0d9488', // teal-600
  S02: '#0284c7', // sky-600
  S03: '#d97706', // amber-600
  S04: '#e11d48', // rose-600
};

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

export default function DashboardLayout() {
  // Menünün açık/kapalı durumunu tutan state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedRange, setSelectedRange] = useState('1h');
  const [selectedSensorId, setSelectedSensorId] = useState('ALL');

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

  const visibleSensors =
    selectedSensorId === 'ALL'
      ? sensors
      : sensors.filter((s) => s.id === selectedSensorId);

  // Build SVG polyline paths for the temporal chart
  const chartWidth = 680;
  const chartHeight = 250;
  const padLeft = 44;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 32;
  const innerWidth = chartWidth - padLeft - padRight;
  const innerHeight = chartHeight - padTop - padBottom;
  const maxFlowY = 15; // L/s scale top

  const sensorSeries = visibleSensors.map((sensor) => {
    const points = getSensorTelemetry(sensor.id, selectedRange);
    const coords = points.map((pt, idx) => {
      const x =
        padLeft +
        (points.length <= 1
          ? innerWidth / 2
          : (idx / (points.length - 1)) * innerWidth);
      const clampedFlow = Math.min(Math.max(pt.flowRateLps, 0), maxFlowY);
      const y = padTop + innerHeight - (clampedFlow / maxFlowY) * innerHeight;
      return { x, y, pt };
    });

    return {
      sensor,
      coords,
      polyline: coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' '),
      color: SENSOR_COLORS[sensor.id] || '#0f766e',
    };
  });

  const referenceTicks = getSensorTelemetry(
    sensors[0]?.id || 'S01',
    selectedRange
  );

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* Dinamik Genişlikli Left Navigation Panel */}
      <aside
        className={`bg-white flex flex-col border-r border-slate-200 shadow-sm transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Header Alanı ve Toggle Butonu */}
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
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              {isSidebarOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Navigasyon Linkleri */}
        <nav className="flex flex-col gap-2 px-3 flex-1 overflow-x-hidden">
          <button
            className={`flex items-center gap-4 text-left px-3 py-3 rounded-lg border transition-all whitespace-nowrap ${
              isSidebarOpen
                ? 'bg-teal-50 text-teal-700 font-semibold border-teal-200'
                : 'bg-transparent text-teal-600 border-transparent hover:bg-teal-50 justify-center'
            }`}
            title="Dashboard"
          >
            <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
            <span className={`transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
              Dashboard
            </span>
          </button>

          <button
            className={`flex items-center gap-4 text-left px-3 py-3 rounded-lg border border-transparent transition-all whitespace-nowrap ${
              isSidebarOpen
                ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 justify-center'
            }`}
            title="Network Map"
          >
            <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            <span className={`transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
              Network Map
            </span>
          </button>

          <button
            className={`flex items-center gap-4 text-left px-3 py-3 rounded-lg border border-transparent transition-all whitespace-nowrap ${
              isSidebarOpen
                ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 justify-center'
            }`}
            title="Sensors"
          >
            <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span className={`transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
              Sensors
            </span>
          </button>

          <button
            className={`flex items-center gap-4 text-left px-3 py-3 rounded-lg border border-transparent transition-all whitespace-nowrap ${
              isSidebarOpen
                ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 justify-center'
            }`}
            title="Impact / About"
          >
            <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className={`transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
              Impact / About
            </span>
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-6 overflow-y-auto">
        {/* Header with Mandatory Disclaimer & Demo Scenario Controls */}
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

        {/* Top Summary Cards (Flexbox) */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-slate-500 text-sm font-medium mb-1">
              Estimated Power Potential
            </h3>
            <div className="text-3xl font-bold text-slate-800">
              {summaryMetrics.illustrativePowerPotentialWatts.toFixed(0)} W
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Illustrative estimate (2.8 m head, 65% eff.)
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
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
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
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

        {/* Station Quick Status Bar */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {sensors.map((sensor) => (
            <div
              key={sensor.id}
              onClick={() =>
                setSelectedSensorId((prev) =>
                  prev === sensor.id ? 'ALL' : sensor.id
                )
              }
              className={`p-3.5 rounded-xl border transition-all cursor-pointer bg-white shadow-sm ${
                selectedSensorId === sensor.id
                  ? 'ring-2 ring-teal-500 border-teal-400'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-sm text-slate-800">
                  {sensor.id} — {sensor.name}
                </span>
                <span
                  className={`text-xs font-semibold uppercase px-2 py-0.5 rounded border ${
                    STATUS_BADGE_STYLES[sensor.status] || STATUS_BADGE_STYLES.normal
                  }`}
                >
                  {sensor.status}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>
                  Flow: <strong className="text-slate-800">{sensor.current.flowRateLps.toFixed(2)} L/s</strong>
                </span>
                <span>
                  Level: <strong className="text-slate-800">{sensor.current.waterLevelM.toFixed(2)} m</strong>
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                <span>Baseline: {sensor.baseline.flowRateLps.toFixed(1)} L/s</span>
                <span>Updated {formatTime(sensor.current.updatedAt)}</span>
              </div>
            </div>
          ))}
        </section>

        {/* Adjacent Chart and Log Panels */}
        <section className="flex flex-col lg:flex-row gap-4 flex-1 min-h-[420px]">
          {/* Chart Panel */}
          <div className="flex-[2] bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">
                  Simulated Water Flow Rate (L/s)
                </h3>
                <p className="text-xs text-slate-500">
                  Live telemetry stream (click a station card above to isolate)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedSensorId}
                  onChange={(e) => setSelectedSensorId(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 font-medium"
                >
                  <option value="ALL">All Stations (S01–S04)</option>
                  {sensors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id} — {s.name}
                    </option>
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
                {/* Horizontal grid lines */}
                {[0, 3, 6, 9, 12, 15].map((tickVal) => {
                  const y =
                    padTop + innerHeight - (tickVal / maxFlowY) * innerHeight;
                  return (
                    <g key={tickVal}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={chartWidth - padRight}
                        y2={y}
                        stroke="#e2e8f0"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={padLeft - 8}
                        y={y + 4}
                        textAnchor="end"
                        className="fill-slate-400 text-[10px]"
                      >
                        {tickVal} L/s
                      </text>
                    </g>
                  );
                })}

                {/* Lines for each visible sensor */}
                {sensorSeries.map(({ sensor, polyline, coords, color }) => {
                  const lastCoord = coords[coords.length - 1];
                  return (
                    <g key={sensor.id}>
                      <polyline
                        fill="none"
                        stroke={color}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={polyline}
                      />
                      {lastCoord && (
                        <circle
                          cx={lastCoord.x}
                          cy={lastCoord.y}
                          r="4"
                          fill={color}
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                      )}
                    </g>
                  );
                })}

                {/* Time axis labels */}
                {referenceTicks.length > 1 && (
                  <>
                    <text
                      x={padLeft}
                      y={chartHeight - 6}
                      textAnchor="start"
                      className="fill-slate-400 text-[10px]"
                    >
                      {formatTime(referenceTicks[0]?.timestamp)}
                    </text>
                    <text
                      x={padLeft + innerWidth / 2}
                      y={chartHeight - 6}
                      textAnchor="middle"
                      className="fill-slate-400 text-[10px]"
                    >
                      {formatTime(
                        referenceTicks[Math.floor(referenceTicks.length / 2)]
                          ?.timestamp
                      )}
                    </text>
                    <text
                      x={chartWidth - padRight}
                      y={chartHeight - 6}
                      textAnchor="end"
                      className="fill-slate-400 text-[10px]"
                    >
                      {formatTime(
                        referenceTicks[referenceTicks.length - 1]?.timestamp
                      )}
                    </text>
                  </>
                )}
              </svg>

              {/* Chart Legend */}
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2 border-t border-slate-200/80 text-xs">
                {visibleSensors.map((s) => (
                  <div key={s.id} className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-full inline-block"
                      style={{
                        backgroundColor: SENSOR_COLORS[s.id] || '#0f766e',
                      }}
                    />
                    <span className="font-medium text-slate-700">
                      {s.id} ({s.name}):
                    </span>
                    <span className="font-bold text-slate-900">
                      {s.current.flowRateLps.toFixed(2)} L/s
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sensor Status Logs Panel */}
          <div className="flex-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col max-h-[500px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">
                Alerts & Recent Events
              </h3>
              <span className="text-xs font-medium text-slate-500">
                {alerts.filter((a) => a.status === 'active').length} active
              </span>
            </div>

            <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 border rounded-lg transition-opacity ${
                    ALERT_BADGE_STYLES[alert.severity] || ALERT_BADGE_STYLES.info
                  } ${alert.status === 'resolved' ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      {alert.severity} • {alert.status}
                    </span>
                    <span className="text-[11px] opacity-75">
                      {formatTime(alert.createdAt)}
                    </span>
                  </div>
                  <div className="text-sm font-semibold mb-1">{alert.title}</div>
                  <p className="text-xs leading-relaxed opacity-90">
                    {alert.message}
                  </p>
                  {alert.sensorIds?.length > 0 && (
                    <div className="flex gap-1.5 mt-2">
                      {alert.sensorIds.map((id) => (
                        <span
                          key={id}
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/80 border border-current/20"
                        >
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
