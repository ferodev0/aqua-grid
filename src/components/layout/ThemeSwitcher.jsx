import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

const THEME_OPTIONS = [
  {
    id: 'light',
    labelKey: 'theme.light',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    ),
  },
  {
    id: 'dark',
    labelKey: 'theme.dark',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    ),
  },
  {
    id: 'system',
    labelKey: 'theme.system',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    ),
  },
];

export function ThemeSwitcher({ collapsed = false }) {
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();

  if (collapsed) {
    const activeIndex = THEME_OPTIONS.findIndex((opt) => opt.id === theme);
    const currentOption =
      THEME_OPTIONS[activeIndex >= 0 ? activeIndex : 0];
    const nextOption =
      THEME_OPTIONS[(activeIndex + 1) % THEME_OPTIONS.length];

    return (
      <div className="flex flex-col items-center border-t border-slate-200 p-3 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setTheme(nextOption.id)}
          title={`${t('theme.title')}: ${t(currentOption.labelKey)}`}
          aria-label={`${t('theme.title')}: ${t(currentOption.labelKey)}`}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100 hover:text-teal-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-teal-400"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {currentOption.icon}
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-slate-200 p-3 dark:border-slate-800">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {t('theme.title')}
      </p>
      <div
        role="group"
        aria-label={t('theme.title')}
        className="grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800/90"
      >
        {THEME_OPTIONS.map((opt) => {
          const isActive = theme === opt.id;
          const label = t(opt.labelKey);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTheme(opt.id)}
              title={label}
              aria-pressed={isActive}
              className={`flex flex-col items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-[11px] font-semibold transition-all ${
                isActive
                  ? 'bg-white text-teal-700 shadow-sm dark:bg-slate-900 dark:text-teal-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {opt.icon}
              </svg>
              <span className="w-full truncate text-center leading-tight">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
