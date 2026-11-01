import { useLanguage } from '../../context/LanguageContext';

export function LanguageSwitcher() {
  const { language, setLanguage, languageOptions, t } = useLanguage();

  return (
    <div
      className="relative z-20 inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm dark:border-slate-600 dark:bg-slate-800"
      role="group"
      aria-label={t('lang.label')}
    >
      {languageOptions.map((opt) => {
        const active = language === opt.code;
        return (
          <button
            key={opt.code}
            type="button"
            onClick={() => setLanguage(opt.code)}
            title={opt.nativeName}
            aria-pressed={active}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
              active
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'
            }`}
          >
            {opt.shortLabel}
          </button>
        );
      })}
    </div>
  );
}
