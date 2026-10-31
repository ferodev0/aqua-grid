import { useLanguage } from '../../context/LanguageContext';

/** Matches DashboardLayout STATUS_BADGE_STYLES */
const STATUS_STYLES = {
  normal:
    'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700/60',
  warning:
    'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700/60',
  critical:
    'bg-red-100 text-red-700 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-700/60',
  offline:
    'bg-slate-200 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
};

export function StatusBadge({ status = 'normal' }) {
  const { t } = useLanguage();
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.offline;

  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold uppercase ${style}`}
    >
      {t(`status.${status}`)}
    </span>
  );
}
