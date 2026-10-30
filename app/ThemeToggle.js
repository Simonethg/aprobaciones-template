'use client';
import { useEffect, useState } from 'react';
import { useI18n } from './I18n';

function readTheme() {
  const set = document.documentElement.getAttribute('data-theme');
  if (set === 'light' || set === 'dark') return set;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState('light');
  useEffect(() => { setTheme(readTheme()); }, []);

  function toggle() {
    const next = readTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('aprob.theme', next); } catch { /* private mode */ }
    setTheme(next);
  }

  const { t } = useI18n();
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      className="theme-toggle"
      data-testid="theme-toggle"
      aria-pressed={dark}
      onClick={toggle}
    >
      {dark ? t('theme.toLight') : t('theme.toDark')}
    </button>
  );
}
