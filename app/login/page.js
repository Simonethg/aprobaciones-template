'use client';
import { useState } from 'react';
import { LangSwitch, useI18n } from '../I18n';
import ThemeToggle from '../ThemeToggle';

export default function Login() {
  const { t, errorText } = useI18n();
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    const r = await fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code }) });
    if (r.ok) { window.location.href = '/'; return; }
    const j = await r.json().catch(() => ({}));
    setErr(errorText(j.error) || t('login.fallback')); setBusy(false); setCode('');
  }
  return (
    <div className="login-wrap">
      <div className="login-tools"><LangSwitch /><ThemeToggle /></div>
      <a className="skip" href="#acceso">{t('skip.form')}</a>
      <form className="login" id="acceso" onSubmit={submit}>
        <div className="bar" />
        <h1>{t('app.title')}</h1>
        <p>{t('login.prompt')}</p>
        <input type="password" inputMode="numeric" autoComplete="current-password" autoFocus
          value={code} onChange={(e) => setCode(e.target.value)} aria-label={t('login.code')} />
        {err && <div className="err" role="alert">{err}</div>}
        <button className="btn btn-ok" disabled={busy || !code}>{busy ? t('login.checking') : t('login.enter')}</button>
      </form>
    </div>
  );
}
