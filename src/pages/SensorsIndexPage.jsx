import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { StatusBadge } from '../components/sensors/StatusBadge';
import { useNetwork } from '../context/NetworkContext';

export function SensorsIndexPage() {
  const navigate = useNavigate();
  const { sensors, channelSegments } = useNetwork();

  const segmentName = (segmentId) =>
    channelSegments.find((s) => s.id === segmentId)?.name ?? segmentId;

  return (
    <AppLayout title="Sensors">
      <p className="mb-6 text-sm text-slate-500">
        Live demonstration stations from the shared simulation. Values update
        automatically; trigger crisis to exercise downstream reductions.
      </p>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Station</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3 text-right">Flow</th>
                <th className="px-4 py-3 text-right">Level</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {sensors.map((sensor) => (
                <tr
                  key={sensor.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(`/sensors/${sensor.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(`/sensors/${sensor.id}`);
                    }
                  }}
                  className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-teal-50/40 focus-visible:bg-teal-50/60 focus-visible:outline-none"
                >
                  <td className="px-4 py-3 font-mono text-teal-600">
                    {sensor.id}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {sensor.name}
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-slate-500">
                    {sensor.location.label}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-slate-500">
                    {segmentName(sensor.channelSegmentId)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-800">
                    {sensor.current.flowRateLps.toFixed(2)}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      L/s
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-800">
                    {sensor.current.waterLevelM.toFixed(3)}{' '}
                    <span className="text-xs font-normal text-slate-400">m</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={sensor.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppLayout>
  );
}
