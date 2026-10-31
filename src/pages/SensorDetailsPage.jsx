import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { StatusBadge } from '../components/sensors/StatusBadge';

const KNOWN_IDS = ['S01', 'S02', 'S03', 'S04'];

const PLACEHOLDERS = {
  S01: {
    name: 'Upper Channel',
    status: 'normal',
    location: 'Upper Valley Intake (Illustrative)',
    channel: 'SEG-01 — Upper Feeder Section',
    upstream: null,
    downstream: 'S02',
  },
  S02: {
    name: 'Central Channel',
    status: 'normal',
    location: 'Central Town Aqueduct Section (Illustrative)',
    channel: 'SEG-02 — Upper-to-Central Transit',
    upstream: 'S01',
    downstream: 'S03',
  },
  S03: {
    name: 'Village Approach',
    status: 'normal',
    location: 'Orchard & Village Distribution Approach (Illustrative)',
    channel: 'SEG-03 — Central-to-Village Distribution',
    upstream: 'S02',
    downstream: 'S04',
  },
  S04: {
    name: 'Lower Channel',
    status: 'normal',
    location: 'Lower Agricultural Outlying Section (Illustrative)',
    channel: 'SEG-04 — Outlying Lower Reach',
    upstream: 'S03',
    downstream: null,
  },
};

const TIME_RANGES = [
  { id: '1h', label: '1H' },
  { id: '24h', label: '24H' },
  { id: '7d', label: '7D' },
];

const METRICS = [
  { label: 'Flow rate', value: '—', unit: 'L/s' },
  { label: 'Water level', value: '—', unit: 'm' },
  { label: 'Flow velocity', value: '—', unit: 'm/s' },
  { label: 'Battery', value: '—', unit: '%' },
  { label: 'Signal', value: '—', unit: '%' },
];

export function SensorDetailsPage() {
  const { sensorId } = useParams();
  const [range, setRange] = useState('24h');
  const known = KNOWN_IDS.includes(sensorId);
  const data = PLACEHOLDERS[sensorId];

  if (!known || !data) {
    return (
      <AppLayout title="Sensor Details">
        <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-500">Sensor not found</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-800">
            No station matches this ID
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            <span className="font-mono text-slate-700">
              {sensorId || '(empty)'}
            </span>{' '}
            is not a known demonstration sensor.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/sensors/S03"
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              Open sample (S03)
            </Link>
            <Link
              to="/sensors"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Sensor list
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Sensor Details">
      <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link to="/sensors" className="hover:text-teal-700">
          Sensors
        </Link>
        <span aria-hidden>/</span>
        <span className="font-mono text-slate-700">{sensorId}</span>
        <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
          UI skeleton — no live data
        </span>
      </nav>

      {/* Overview — dashboard card language */}
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-500">Sensor station</p>
            <h3 className="mt-1 text-2xl font-semibold text-slate-800">
              {data.name}
            </h3>
            <p className="mt-1 font-mono text-sm text-teal-600">{sensorId}</p>
          </div>
          <StatusBadge status={data.status} />
        </div>
        <p className="mt-4 text-sm text-slate-600">
          <span className="text-slate-500">Location: </span>
          {data.location}
          <span className="ml-2 rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500">
            Illustrative
          </span>
        </p>
        <p className="mt-1 text-sm text-slate-600">
          <span className="text-slate-500">Channel: </span>
          {data.channel}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Last update: Pending shared simulation
        </p>
      </section>

      <section className="mb-6 flex flex-wrap gap-4">
        {METRICS.map((metric) => (
          <div
            key={metric.label}
            className="min-w-[140px] flex-1 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h4 className="mb-2 text-sm font-medium text-slate-500">
              {metric.label}
            </h4>
            <div className="text-3xl font-bold text-slate-800">
              {metric.value}
              <span className="ml-1 text-sm font-medium text-slate-400">
                {metric.unit}
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* Chart | side panels — dashboard adjacent layout */}
      <section className="flex min-h-[450px] flex-col gap-3 lg:flex-row">
        <div className="flex flex-[2] flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-800">
              Telemetry over time
            </h3>
            <div className="inline-flex overflow-hidden rounded border border-slate-200 bg-slate-100 text-xs text-slate-600">
              {TIME_RANGES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setRange(item.id)}
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
          <div className="grid flex-1 gap-3 md:grid-cols-2">
            {['Flow rate (L/s)', 'Water level (m)'].map((label) => (
              <div
                key={label}
                className="flex min-h-[200px] items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400"
              >
                [ {label} chart placeholder ]
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <div className="flex flex-1 flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-800">
              Device metadata
            </h3>
            <dl className="flex flex-col gap-3 overflow-y-auto">
              {[
                ['Sensor type', 'Ultrasonic level + flow estimate (demo)'],
                ['Installation', '2026-01-15 (demonstration)'],
                ['Reporting interval', '2.5 s (simulated)'],
                ['Channel segment', data.channel],
                ['Upstream', data.upstream ?? '—'],
                ['Downstream', data.downstream ?? '—'],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                >
                  <dt className="text-xs text-slate-400">{label}</dt>
                  <dd className="mt-1 text-sm text-slate-600">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex flex-1 flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-800">
              Sensor events
            </h3>
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="mb-1 block text-xs text-slate-400">
                  YYYY-MM-DD HH:MM
                </span>
                <span className="text-sm text-slate-600">
                  [ Placeholder — will use getSensorAlerts() ]
                </span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="mb-1 block text-xs text-slate-400">
                  YYYY-MM-DD HH:MM
                </span>
                <span className="text-sm text-slate-600">
                  Example: unusual flow reduction — inspection recommended
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </AppLayout>
  );
}
