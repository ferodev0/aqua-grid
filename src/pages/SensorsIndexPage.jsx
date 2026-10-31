import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { StatusBadge } from '../components/sensors/StatusBadge';
import { useLanguage } from '../context/LanguageContext';
import { useNetwork } from '../context/NetworkContext';
import { KNOWN_VILLAGES } from '../simulation/demoData';

export function SensorsIndexPage() {
  const navigate = useNavigate();
  const {
    t,
    tSensorName,
    tSensorLocation,
    tSensorVillage,
    tSensorArea,
    tVillage,
    tSegmentName,
  } = useLanguage();
  const { sensors, channelSegments } = useNetwork();
  const [query, setQuery] = useState('');

  const segmentName = (segmentId) => {
    const seg = channelSegments.find((s) => s.id === segmentId);
    return tSegmentName(segmentId, seg?.name);
  };

  const filteredSensors = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sensors;
    return sensors.filter((sensor) => {
      const haystack = [
        sensor.id,
        sensor.name,
        tSensorName(sensor),
        tSensorLocation(sensor),
        tSensorVillage(sensor),
        tSensorArea(sensor),
        sensor.village,
        sensor.area,
        sensor.location?.label,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [
    sensors,
    query,
    tSensorName,
    tSensorLocation,
    tSensorVillage,
    tSensorArea,
  ]);

  const villageGroups = useMemo(() => {
    const map = new Map();
    for (const sensor of filteredSensors) {
      const village = sensor.village || sensor.location?.village || 'Unknown';
      if (!map.has(village)) map.set(village, []);
      map.get(village).push(sensor);
    }

    const knownOrder = KNOWN_VILLAGES.filter((v) => map.has(v));
    const extras = [...map.keys()].filter((v) => !KNOWN_VILLAGES.includes(v));
    return [...knownOrder, ...extras].map((village) => ({
      village,
      sensors: map.get(village),
    }));
  }, [filteredSensors]);

  const openSensor = (sensorId) => navigate(`/sensors/${sensorId}`);

  const villageLabel = (village) =>
    village === 'Unknown' ? t('dashboard.unknownVillage') : tVillage(village);

  const stationCountLabel = (count) =>
    count === 1
      ? t('sensors.stationCountOne')
      : t('sensors.stationCount', { count: String(count) });

  return (
    <AppLayout title={t('sensors.title')} denseHeader>
      <p className="mb-4 text-sm text-slate-500">{t('sensors.subtitle')}</p>

      <label className="relative mb-6 block w-full max-w-md">
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

      {villageGroups.length === 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 shadow-sm">
          {t('sensors.noMatch', { query: query.trim() })}
        </section>
      ) : (
        <div className="space-y-8">
          {villageGroups.map((group) => (
            <section key={group.village}>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-slate-800">
                  {t('sensors.villageGroup', {
                    village: villageLabel(group.village),
                  })}
                </h2>
                <span className="text-xs font-medium text-slate-500">
                  {stationCountLabel(group.sensors.length)}
                </span>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[880px] table-fixed border-collapse text-left text-sm">
                    <colgroup>
                      <col className="w-[72px]" />
                      <col className="w-[160px]" />
                      <col className="w-[220px]" />
                      <col className="w-[220px]" />
                      <col className="w-[100px]" />
                      <col className="w-[100px]" />
                      <col className="w-[108px]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-3 text-left">
                          {t('sensors.table.id')}
                        </th>
                        <th className="px-4 py-3 text-left">
                          {t('sensors.table.station')}
                        </th>
                        <th className="px-4 py-3 text-left">
                          {t('sensors.table.area')}
                        </th>
                        <th className="px-4 py-3 text-left">
                          {t('sensors.table.channel')}
                        </th>
                        <th className="px-4 py-3 text-center">
                          {t('sensors.table.flow')}
                        </th>
                        <th className="px-4 py-3 text-center">
                          {t('sensors.table.level')}
                        </th>
                        <th className="px-4 py-3 text-center">
                          {t('sensors.table.status')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.sensors.map((sensor) => (
                        <tr
                          key={sensor.id}
                          role="link"
                          tabIndex={0}
                          onClick={() => openSensor(sensor.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              openSensor(sensor.id);
                            }
                          }}
                          className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-teal-50/40 focus-visible:bg-teal-50/60 focus-visible:outline-none"
                        >
                          <td className="truncate px-4 py-3 text-left font-mono text-teal-600">
                            {sensor.id}
                          </td>
                          <td className="truncate px-4 py-3 text-left font-semibold text-slate-800">
                            {tSensorName(sensor)}
                          </td>
                          <td
                            className="truncate px-4 py-3 text-left text-slate-500"
                            title={tSensorArea(sensor)}
                          >
                            {tSensorArea(sensor)}
                          </td>
                          <td
                            className="truncate px-4 py-3 text-left text-slate-500"
                            title={segmentName(sensor.channelSegmentId)}
                          >
                            {segmentName(sensor.channelSegmentId)}
                          </td>
                          <td className="px-4 py-3 text-center font-medium tabular-nums text-slate-800">
                            {sensor.current.flowRateLps.toFixed(2)}{' '}
                            <span className="text-xs font-normal text-slate-400">
                              L/s
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-medium tabular-nums text-slate-800">
                            {sensor.current.waterLevelM.toFixed(3)}{' '}
                            <span className="text-xs font-normal text-slate-400">
                              m
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="inline-flex justify-center">
                              <StatusBadge status={sensor.status} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
