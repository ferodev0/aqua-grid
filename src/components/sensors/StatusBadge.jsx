const STATUS_STYLES = {
  normal: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
  offline: 'bg-slate-100 text-slate-500 border-slate-200',
};

export function StatusBadge({ status = 'normal' }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.offline;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${style}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {status}
    </span>
  );
}
