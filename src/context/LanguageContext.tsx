import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  LANGUAGE_OPTIONS,
  TRANSLATIONS,
  type SupportedLanguage,
} from '../i18n/translations';
import type { AquaAlert } from '../simulation/types';

const STORAGE_KEY = 'aqua_grid_lang';

function getInitialLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'tr' || saved === 'el') {
      return saved;
    }
  } catch {
    // ignore storage errors
  }
  return 'en';
}

function interpolate(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    params[key] !== undefined ? String(params[key]) : `{${key}}`
  );
}

export interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  languageOptions: typeof LANGUAGE_OPTIONS;
  t: (key: string, params?: Record<string, string | number>) => string;
  tSensorName: (sensor: { id: string; name: string }) => string;
  tSensorLocation: (sensor: {
    id: string;
    location: { label: string };
  }) => string;
  tSegmentName: (segmentId: string, fallbackName?: string) => string;
  tAlert: (alert: AquaAlert) => { title: string; message: string };
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const parent = useContext(LanguageContext);
  const [language, setLanguageState] =
    useState<SupportedLanguage>(getInitialLanguage);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const dict = TRANSLATIONS[language] ?? TRANSLATIONS.en;
      const raw = dict[key] ?? TRANSLATIONS.en[key] ?? key;
      return interpolate(raw, params);
    },
    [language]
  );

  const tSensorName = useCallback(
    (sensor: { id: string; name: string }): string => {
      const key = `sensor.${sensor.id}.name`;
      const dict = TRANSLATIONS[language] ?? TRANSLATIONS.en;
      return dict[key] ?? sensor.name;
    },
    [language]
  );

  const tSensorLocation = useCallback(
    (sensor: { id: string; location: { label: string } }): string => {
      const key = `sensor.${sensor.id}.location`;
      const dict = TRANSLATIONS[language] ?? TRANSLATIONS.en;
      return dict[key] ?? sensor.location.label;
    },
    [language]
  );

  const tSegmentName = useCallback(
    (segmentId: string, fallbackName?: string): string => {
      const key = `segment.${segmentId}.name`;
      const dict = TRANSLATIONS[language] ?? TRANSLATIONS.en;
      return dict[key] ?? fallbackName ?? segmentId;
    },
    [language]
  );

  const tAlert = useCallback(
    (alert: AquaAlert): { title: string; message: string } => {
      if (language === 'en') {
        return { title: alert.title, message: alert.message };
      }

      if (alert.id === 'ALT-SYS-INIT') {
        return {
          title: t('alert.init.title'),
          message: t('alert.init.message'),
        };
      }
      if (alert.id.startsWith('ALT-SYS-CRISIS-')) {
        return {
          title: t('alert.crisis.title'),
          message: t('alert.crisis.message'),
        };
      }
      if (alert.id.startsWith('ALT-SYS-RESET-')) {
        return {
          title: t('alert.reset.title'),
          message: t('alert.reset.message'),
        };
      }

      // Dynamic sensor alert: ALT-SENSOR-S03-...
      if (alert.id.startsWith('ALT-SENSOR-')) {
        const sensorId = alert.sensorIds[0] ?? 'S03';
        const sensorName = t(`sensor.${sensorId}.name`);
        if (language === 'tr') {
          if (alert.severity === 'critical') {
            return {
              title: `${sensorId} (${sensorName}) istasyonunda belirgin debi düşüşü`,
              message: `${sensorName} (${sensorId}) istasyonunda beklenmeyen mansap debi ve seviye düşüşü gözlemlendi — saha incelemesi önerilir.`,
            };
          }
          return {
            title: `${sensorId} (${sensorName}) istasyonunda referans altı debi`,
            message: `${sensorName} (${sensorId}) istasyonundaki simüle debi referans değerin altına geriledi. Kesiti izleyin ve düşüş sürerse inceleyin.`,
          };
        }
        if (language === 'el') {
          if (alert.severity === 'critical') {
            return {
              title: `Σημαντική μείωση ροής στον σταθμό ${sensorId} (${sensorName})`,
              message: `Παρατηρήθηκε μη αναμενόμενη μείωση ροής και στάθμης στον σταθμό ${sensorName} (${sensorId}) — συνιστάται επιτόπια επιθεώρηση.`,
            };
          }
          return {
            title: `Ροή κάτω από τη βάση στον σταθμό ${sensorId} (${sensorName})`,
            message: `Η προσομοιωμένη ροή στον σταθμό ${sensorName} (${sensorId}) μειώθηκε κάτω από την τιμή αναφοράς. Παρακολουθήστε το τμήμα.`,
          };
        }
      }

      // Dynamic segment alert: ALT-SEG-SEG-03-...
      if (alert.id.startsWith('ALT-SEG-')) {
        const upId = alert.sensorIds[0] ?? 'S02';
        const downId = alert.sensorIds[1] ?? 'S03';
        const segName = alert.channelSegmentId
          ? tSegmentName(alert.channelSegmentId)
          : '';
        if (language === 'tr') {
          return {
            title: `${upId} ile ${downId} arasında olağandışı debi azalması tespit edildi`,
            message: `${segName} boyunca yapılan karşılaştırmada ${upId} referans değere yakınken mansaptaki ${downId} istasyonunda belirgin düşüş saptandı. Olası kayıp, su çekimi veya yönlendirme — saha incelemesi önerilir.`,
          };
        }
        if (language === 'el') {
          return {
            title: `Εντοπίστηκε ασυνήθιστη μείωση ροής μεταξύ ${upId} και ${downId}`,
            message: `Η σύγκριση στο τμήμα ${segName} δείχνει απόκλιση μεταξύ του ανάντη σταθμού ${upId} και του κατάντη σταθμού ${downId}. Πιθανή απώλεια, υδροληψία ή εκτροπή — συνιστάται επιθεώρηση.`,
          };
        }
      }

      return { title: alert.title, message: alert.message };
    },
    [language, t, tSegmentName]
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      languageOptions: LANGUAGE_OPTIONS,
      t,
      tSensorName,
      tSensorLocation,
      tSegmentName,
      tAlert,
    }),
    [
      language,
      setLanguage,
      t,
      tSensorName,
      tSensorLocation,
      tSegmentName,
      tAlert,
    ]
  );

  if (parent) {
    return <>{children}</>;
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Fallback to English if used outside provider
    return {
      language: 'en',
      setLanguage: () => {},
      languageOptions: LANGUAGE_OPTIONS,
      t: (key, params) =>
        interpolate(TRANSLATIONS.en[key] ?? key, params),
      tSensorName: (s) => s.name,
      tSensorLocation: (s) => s.location.label,
      tSegmentName: (id, fallback) => fallback ?? id,
      tAlert: (alert) => ({ title: alert.title, message: alert.message }),
    };
  }
  return ctx;
}
