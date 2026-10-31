import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { StatusBadge } from '../components/sensors/StatusBadge';
import { useLanguage } from '../context/LanguageContext';
import { useNetwork } from '../context/NetworkContext';

export function SensorsIndexPage() {
  const navigate = useNavigate();
  const { t, tSensorName, tSensorLocation, tSegmentName } = useLanguage();
  const { sensors, channelSegments } = useNetwork();

  const segmentName = (segmentId) => {
    const seg = channelSegments.find((s) => s.id === segmentId);
    return tSegmentName(segmentId, seg?.name);
  };

  return (
    <AppLayout title={t('sensors.title')}>
      <p className="mb-6 text-sm text-slate-500">
        {t('sensors.subtitle')}
      </p>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">{t('sensors.table.id')}</th>
                <th className="px-4 py-3">{t('sensors.table.station')}</th>
                <th className="px-4 py-3">{t('sensors.table.location')}</th>
                <th className="px-4 py-3">{t('sensors.table.channel')}</th>
                <th className="px-4 py-3 text-right">{t('sensors.table.flow')}</th>
                <th className="px-4 py-3 text-right">{t('sensors.table.level')}</th>
                <th className="px-4 py-3">{t('sensors.table.status')}</th>
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
                    {tSensorName(sensor)}
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-slate-500">
                    {tSensorLocation(sensor)}
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
