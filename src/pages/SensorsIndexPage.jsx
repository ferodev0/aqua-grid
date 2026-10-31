import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { StatusBadge } from '../components/sensors/StatusBadge';
import { useLanguage } from '../context/LanguageContext';
import { useNetwork } from '../context/NetworkContext';

export function SensorsIndexPage() {
  const navigate = useNavigate();
  const { t, tSensorName, tSensorLocation, tSegmentName } = useLanguage();
  const { sensors, channelSegments } = useNetwork();
  const [query, setQuery] = useState('');

  const segmentName = (segmentId) => {
    const seg = channelSegments.find((s) => s.id === segmentId);
    return tSegmentName(segmentId, seg?.name);
  };

  const filteredSensors = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sensors;
    return sensors.filter(
      (sensor) =>
        sensor.id.toLowerCase().includes(q) ||
        sensor.name.toLowerCase().includes(q) ||
        tSensorName(sensor).toLowerCase().includes(q)
    );
  }, [sensors, query, tSensorName]);

  return (
    <AppLayout title={t('sensors.title')} denseHeader>
      <p className="mb-4 text-sm text-slate-500">
        {t('sensors.subtitle')}
      </p>

      <label className="relative mb-4 block w-full max-w-md">
        <span className="sr-only">{t('sensors.searchAria')}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('sensors.searchPlaceholder')}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
        />
        <svg
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
          />
        </svg>
      </label>

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
              {filteredSensors.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    {t('sensors.noMatch', { query: query.trim() })}
                  </td>
                </tr>
              ) : (
                filteredSensors.map((sensor) => (
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
                      <span className="text-xs font-normal text-slate-400">
                        m
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={sensor.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppLayout>
  );
}
