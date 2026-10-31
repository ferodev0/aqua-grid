import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const TIME_RANGES = [
  { id: '1h', label: '1H' },
  { id: '24h', label: '24H' },
  { id: '7d', label: '7D' },
];

function formatTick(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function SensorTelemetryChart({ points, range, onRangeChange }) {
  const data = (points ?? []).map((p) => ({
    ...p,
    label: formatTick(p.timestamp),
  }));

  return (
    <div className="flex flex-[2] flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">
            Telemetry over time
          </h3>
          <p className="text-xs text-slate-400">
            Shared simulation history
          </p>
        </div>
        <div className="inline-flex overflow-hidden rounded border border-slate-200 bg-slate-100 text-xs text-slate-600">
          {TIME_RANGES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onRangeChange?.(item.id)}
              className={`px-2 py-1 ${
                range === item.id
                  ? 'bg-teal-600 font-semibold text-white'
                  : 'hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex min-h-[260px] flex-1 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
          Waiting for telemetry points…
        </div>
      ) : (
        <div className="min-h-[280px] w-full flex-1">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                minTickGap={24}
              />
              <YAxis
                yAxisId="flow"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                width={40}
                label={{
                  value: 'L/s',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#94a3b8',
                  fontSize: 11,
                }}
              />
              <YAxis
                yAxisId="level"
                orientation="right"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                width={40}
                label={{
                  value: 'm',
                  angle: 90,
                  position: 'insideRight',
                  fill: '#94a3b8',
                  fontSize: 11,
                }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  borderColor: '#e2e8f0',
                  fontSize: 12,
                }}
              />
              <Legend />
              <Line
                yAxisId="flow"
                type="monotone"
                dataKey="flowRateLps"
                name="Flow (L/s)"
                stroke="#0d9488"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="level"
                type="monotone"
                dataKey="waterLevelM"
                name="Level (m)"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
