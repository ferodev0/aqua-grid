import { useState } from 'react';

const TIME_RANGES = [
  { id: '1h', label: '1h' },
  { id: '24h', label: '24h' },
  { id: '7d', label: '7d' },
];

const SENSOR_COLORS = {
  S01: '#0d9488',
  S02: '#0284c7',
  S03: '#d97706',
  S04: '#e11d48',
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

/**
 * Dashboard-style SVG flow chart for a single station (Sensor Details).
 */
export function SensorTelemetryChart({
  points,
  range,
  onRangeChange,
  sensorId,
  sensorName,
  currentFlowLps,
}) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const chartWidth = 680;
  const chartHeight = 250;
  const padLeft = 44;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 32;
  const innerWidth = chartWidth - padLeft - padRight;
  const innerHeight = chartHeight - padTop - padBottom;
  const maxFlowY = 15;
  const color = SENSOR_COLORS[sensorId] || '#0f766e';
  const series = points ?? [];

  const coords = series.map((pt, idx) => {
    const x =
      padLeft +
      (series.length <= 1
        ? innerWidth / 2
        : (idx / (series.length - 1)) * innerWidth);
    const clampedFlow = Math.min(Math.max(pt.flowRateLps, 0), maxFlowY);
    const y = padTop + innerHeight - (clampedFlow / maxFlowY) * innerHeight;
    return { x, y, pt };
  });

  const polyline = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const lastCoord = coords[coords.length - 1];
  const hover = hoverIndex != null ? coords[hoverIndex] : null;

  const handleMouseMove = (event) => {
    if (coords.length === 0) return;
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const scaleX = chartWidth / rect.width;
    const mouseX = (event.clientX - rect.left) * scaleX;

    let nearest = 0;
    let bestDist = Infinity;
    for (let i = 0; i < coords.length; i += 1) {
      const dist = Math.abs(coords[i].x - mouseX);
      if (dist < bestDist) {
        bestDist = dist;
        nearest = i;
      }
    }
    setHoverIndex(nearest);
  };

  return (
    <div className="flex h-full min-h-[420px] flex-[2] flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">
            Telemetry over time
          </h3>
          <p className="text-xs text-slate-500">
            Simulated water flow rate (L/s) · shared history
          </p>
        </div>

        <div className="flex rounded border border-slate-200 bg-slate-100 p-0.5 text-xs">
          {TIME_RANGES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onRangeChange?.(item.id)}
              className={`rounded px-2.5 py-1 font-semibold uppercase transition-colors ${
                range === item.id
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {series.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/70 text-sm text-slate-400">
          Waiting for telemetry points…
        </div>
      ) : (
        <div className="relative flex min-h-0 flex-1 flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="h-full max-h-[290px] w-full cursor-crosshair overflow-visible"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverIndex(null)}
          >
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

            <polyline
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polyline}
            />

            {hover && (
              <g pointerEvents="none">
                <line
                  x1={hover.x}
                  y1={padTop}
                  x2={hover.x}
                  y2={padTop + innerHeight}
                  stroke="#94a3b8"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                />
                <circle
                  cx={hover.x}
                  cy={hover.y}
                  r="5"
                  fill={color}
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              </g>
            )}

            {!hover && lastCoord && (
              <circle
                cx={lastCoord.x}
                cy={lastCoord.y}
                r="4"
                fill={color}
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            )}

            {series.length > 1 && (
              <>
                <text
                  x={padLeft}
                  y={chartHeight - 6}
                  textAnchor="start"
                  className="fill-slate-400 text-[10px]"
                >
                  {formatTime(series[0]?.timestamp)}
                </text>
                <text
                  x={padLeft + innerWidth / 2}
                  y={chartHeight - 6}
                  textAnchor="middle"
                  className="fill-slate-400 text-[10px]"
                >
                  {formatTime(series[Math.floor(series.length / 2)]?.timestamp)}
                </text>
                <text
                  x={chartWidth - padRight}
                  y={chartHeight - 6}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px]"
                >
                  {formatTime(series[series.length - 1]?.timestamp)}
                </text>
              </>
            )}
          </svg>

          {hover && (
            <div
              className="pointer-events-none absolute z-10 min-w-[140px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md"
              style={{
                left: `clamp(8px, calc(${(hover.x / chartWidth) * 100}% - 70px), calc(100% - 156px))`,
                top: 12,
              }}
            >
              <p className="font-semibold text-slate-800">
                {formatTime(hover.pt.timestamp)}
              </p>
              <p className="mt-1 text-slate-600">
                Flow:{' '}
                <span className="font-bold text-slate-900">
                  {hover.pt.flowRateLps.toFixed(2)} L/s
                </span>
              </p>
              <p className="text-slate-600">
                Level:{' '}
                <span className="font-bold text-slate-900">
                  {hover.pt.waterLevelM.toFixed(3)} m
                </span>
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-4 border-t border-slate-200/80 pt-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="font-medium text-slate-700">
                {sensorId}
                {sensorName ? ` (${sensorName})` : ''}:
              </span>
              <span className="font-bold text-slate-900">
                {(currentFlowLps ?? lastCoord?.pt?.flowRateLps ?? 0).toFixed(2)}{' '}
                L/s
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
