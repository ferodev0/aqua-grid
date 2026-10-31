import { useEffect, useMemo, useState } from 'react';

function formatUpdatedAt(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function severityClass(severity) {
  if (severity === 'critical') return 'text-red-600';
  if (severity === 'warning') return 'text-amber-600';
  return 'text-teal-600';
}

function EventCard({ alert }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <span
          className={`text-[10px] font-bold uppercase tracking-wide ${severityClass(
            alert.severity
          )}`}
        >
          {alert.severity} · {alert.status}
        </span>
        <time className="text-xs text-slate-400">
          {formatUpdatedAt(alert.createdAt)}
        </time>
      </div>
      <p className="text-sm font-medium text-slate-700">{alert.title}</p>
      <p className="mt-0.5 text-xs text-slate-500">{alert.message}</p>
    </div>
  );
}

const PREVIEW_LIMIT = 2;

export function SensorEventsPanel({ alerts }) {
  const [isOpen, setIsOpen] = useState(false);

  const sortedAlerts = useMemo(
    () =>
      [...(alerts ?? [])].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [alerts]
  );

  const preview = sortedAlerts.slice(0, PREVIEW_LIMIT);
  const hasMore = sortedAlerts.length > PREVIEW_LIMIT;

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <div className="h-full min-h-[420px]">
      <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 shrink-0 text-lg font-semibold text-slate-800">
          Sensor events
        </h3>
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {sortedAlerts.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
              No alerts for this sensor yet.
            </div>
          ) : (
            <>
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
                {preview.map((alert) => (
                  <EventCard key={alert.id} alert={alert} />
                ))}
              </div>
              {hasMore && (
                <button
                  type="button"
                  onClick={() => setIsOpen(true)}
                  className="mt-auto w-full shrink-0 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-100"
                >
                  Daha fazla gör ({sortedAlerts.length - PREVIEW_LIMIT} more)
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sensor-events-modal-title"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl border border-slate-200 bg-white shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h4
                id="sensor-events-modal-title"
                className="text-lg font-semibold text-slate-800"
              >
                Sensor event log
              </h4>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                Close
              </button>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto p-5">
              {sortedAlerts.map((alert) => (
                <EventCard key={alert.id} alert={alert} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
