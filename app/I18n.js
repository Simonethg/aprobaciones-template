'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { detectLocale, t as translate, translateError } from '@/lib/i18n';

const Ctx = createContext(null);

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState('es');

  useEffect(() => {
    let stored = null;
    try { stored = localStorage.getItem('aprob.lang'); } catch { /* private mode */ }
    const next = detectLocale(navigator.language, stored);
    setLocaleState(next);
    document.documentElement.lang = next;
    document.title = translate(next, 'app.title');
  }, []);

  function setLocale(next) {
    if (next !== 'es' && next !== 'en') return;
    setLocaleState(next);
    document.documentElement.lang = next;
    document.title = translate(next, 'app.title');
    try { localStorage.setItem('aprob.lang', next); } catch { /* private mode */ }
  }

  const value = useMemo(() => ({
    locale,
    setLocale,
    t: (key, vars) => translate(locale, key, vars),
    errorText: (message) => (message ? translateError(locale, message) : ''),
  }), [locale]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useI18n outside provider');
  return ctx;
}

export function LangSwitch() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className="lang" role="group" aria-label={t('lang.group')}>
      <button type="button" data-testid="lang-es" className={locale === 'es' ? 'on' : ''} aria-pressed={locale === 'es'} onClick={() => setLocale('es')}>
        {t('lang.es')}
      </button>
      <button type="button" data-testid="lang-en" className={locale === 'en' ? 'on' : ''} aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>
        {t('lang.en')}
      </button>
    </div>
  );
}
