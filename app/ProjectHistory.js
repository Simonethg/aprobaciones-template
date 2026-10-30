'use client';
import { useEffect, useState } from 'react';
import { APPROVER_NAME } from '@/lib/actor';
import { useI18n } from './I18n';

const TZ = 'America/Argentina/Buenos_Aires';

export default function ProjectHistory({ proyecto, onClose }) {
  const { t, locale, errorText } = useI18n();
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const fmt = (iso) => new Date(iso).toLocaleString(locale === 'es' ? 'es-AR' : 'en-GB', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' });

  useEffect(() => {
    let alive = true;
    setRows(null);
    setErr('');
    fetch(`/api/historial?proyecto=${encodeURIComponent(proyecto)}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'fail');
        return j.historial || [];
      })
      .then((list) => { if (alive) setRows(list); })
      .catch((e) => { if (alive) setErr(e.message === 'fail' ? t('history.fail') : (errorText(e.message) || t('history.fail'))); });
    return () => { alive = false; };
  }, [proyecto, t, errorText]);

  return (
    <section className="card" data-testid="historial" aria-label={t('history.aria', { proyecto })}>
      <div className="card-head">
        <h2>{t('history.title', { proyecto })}</h2>
        <button type="button" className="btn btn-ghost" onClick={onClose}>{t('history.close')}</button>
      </div>
      <p className="goal-indicador">{t('history.blurb', { name: APPROVER_NAME })}</p>
      {err && <div className="err" role="alert">{err}</div>}
      {rows === null && !err && <p className="goal-indicador">{t('history.loading')}</p>}
      {rows && rows.length === 0 && <div className="empty">{t('history.empty')}</div>}
      {rows && rows.length > 0 && (
        <ol className="hist-list">
          {rows.map((row, i) => (
            <li key={`${row.at}-${row.itemId}-${i}`}>
              <span className="chip">{fmt(row.at)}</span>
              {' '}
              <strong>{t(`status.${row.decision}`) === `status.${row.decision}` ? row.decision : t(`status.${row.decision}`)}</strong>
              {' · '}
              {row.titulo}
              {row.bot ? ` · ${row.bot}` : ''}
              {row.nota ? <div className="nota">{row.nota}</div> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
