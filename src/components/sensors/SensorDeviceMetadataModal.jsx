import { useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';

export function SensorDeviceMetadataModal({
  open,
  onClose,
  sensor,
  segment,
}) {
  const { t, tSegmentName } = useLanguage();

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open || !sensor) return null;

  const rows = [
    [t('metadata.sensorType'), t('metadata.sensorTypeVal')],
    [t('metadata.installation'), t('metadata.installationVal')],
    [t('metadata.reportingInterval'), t('metadata.reportingIntervalVal')],
    [
      t('metadata.battery'),
      sensor.current.batteryPercent != null
        ? `${sensor.current.batteryPercent}%`
        : '—',
    ],
    [
      t('metadata.signalStrength'),
      sensor.current.signalPercent != null
        ? `${sensor.current.signalPercent}%`
        : '—',
    ],
    [
      t('metadata.channelSegment'),
      tSegmentName(sensor.channelSegmentId, segment?.name),
    ],
    [t('metadata.upstream'), segment?.upstreamSensorId ?? '—'],
    [t('metadata.downstream'), segment?.downstreamSensorId ?? '—'],
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="device-metadata-modal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-xl border border-slate-200 bg-white shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h4
              id="device-metadata-modal-title"
              className="text-lg font-semibold text-slate-800"
            >
              {t('metadata.title')}
            </h4>
            <p className="mt-0.5 text-xs text-slate-400">
              {t('metadata.subtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            {t('common.close')}
          </button>
        </div>
        <dl className="flex flex-col gap-3 overflow-y-auto p-5">
          {rows.map(([label, value]) => (
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
    </div>
  );
}
