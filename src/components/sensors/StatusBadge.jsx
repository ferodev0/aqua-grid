/** Matches DashboardLayout STATUS_BADGE_STYLES */
const STATUS_STYLES = {
  normal: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-100 text-amber-800 border-amber-300',
  critical: 'bg-red-100 text-red-700 border-red-300',
  offline: 'bg-slate-200 text-slate-600 border-slate-300',
};

export function StatusBadge({ status = 'normal' }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.offline;

  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold uppercase ${style}`}
    >
      {status}
    </span>
  );
}
