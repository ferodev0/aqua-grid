import { Link } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { StatusBadge } from '../components/sensors/StatusBadge';

const DEMO_SENSORS = [
  {
    id: 'S01',
    name: 'Upper Channel',
    location: 'Upper Valley Intake (Illustrative)',
    status: 'normal',
  },
  {
    id: 'S02',
    name: 'Central Channel',
    location: 'Central Town Aqueduct Section (Illustrative)',
    status: 'normal',
  },
  {
    id: 'S03',
    name: 'Village Approach',
    location: 'Orchard & Village Distribution Approach (Illustrative)',
    status: 'normal',
  },
  {
    id: 'S04',
    name: 'Lower Channel',
    location: 'Lower Agricultural Outlying Section (Illustrative)',
    status: 'normal',
  },
];

export function SensorsIndexPage() {
  return (
    <AppLayout title="Sensors">
      <p className="mb-6 text-sm text-slate-500">
        Demonstration monitoring stations. Open a station for the detail view
        skeleton (live simulation not wired yet).
      </p>

      <section className="grid gap-4 sm:grid-cols-2">
        {DEMO_SENSORS.map((sensor) => (
          <Link
            key={sensor.id}
            to={`/sensors/${sensor.id}`}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-teal-600">{sensor.id}</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-800">
                  {sensor.name}
                </h3>
              </div>
              <StatusBadge status={sensor.status} />
            </div>
            <p className="mt-3 text-sm text-slate-500">{sensor.location}</p>
          </Link>
        ))}
      </section>
    </AppLayout>
  );
}
