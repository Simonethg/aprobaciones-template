'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseDriveLink, driveLinksIn, isDriveFolder } from '@/lib/drive';
import { deadlineInfo, toLocalInput } from '@/lib/deadline';
import { nextItemId } from '@/lib/next-item';
import { useI18n } from './I18n';

const CLOSED = ['archivado', 'hecho', 'descartado'];
const TZ = 'America/Argentina/Buenos_Aires';
const fmt = (iso, locale) => new Date(iso).toLocaleString(locale === 'en' ? 'en-GB' : 'es-AR', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' });

function DriveFrame({ src, label, open, hint }) {
  return (
    <details className="preview" open={open}>
      <summary>{label}</summary>
      <iframe title={label} src={src} allow="autoplay; fullscreen" loading="lazy" referrerPolicy="no-referrer" />
      <div className="hint">{hint}</div>
    </details>
  );
}

// Drive files stay on Drive. The preview is the public embed, not a copy stored here.
function DriveFilePreview({ id, tipo }) {
  const { t } = useI18n();
  const frame = `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`;
  const mediaTipo = ['video', 'audio', 'imagen'].includes(tipo);
  return <DriveFrame src={frame} label={t('item.drivePreview')} hint={t('item.driveHint')} open={mediaTipo} />;
}

function Preview({ link, tipo, titulo }) {
  const { t } = useI18n();
  if (!link) return null;
  let u;
  try { u = new URL(link); } catch { return null; }
  const p = u.pathname.toLowerCase();
  const label = titulo || t('item.preview');
  if (/\.(mp3|wav|ogg|m4a|aac|flac|opus)$/.test(p)) return <div className="preview"><audio controls preload="none" src={link} aria-label={label} /></div>;
  if (/\.(mp4|webm|mov|m4v)$/.test(p)) return <div className="preview"><video controls preload="metadata" playsInline src={link} aria-label={label} /></div>;
  if (/\.(png|jpe?g|gif|webp|avif|svg)$/.test(p)) return <div className="preview"><img src={link} alt={label} loading="lazy" /></div>;
  const d = parseDriveLink(link);
  if (d?.kind === 'file') return <DriveFilePreview key={d.id} id={d.id} tipo={tipo} />;
  if (d) return <DriveFrame src={`https://docs.google.com/${d.kind}/d/${encodeURIComponent(d.id)}/preview`} label={t('item.docsPreview')} hint={t('item.driveHint')} />;
  return null;
}

// Botones «Abrir en Drive» para el link principal y los links de Drive del resumen.
function DriveButtons({ item }) {
  const { t } = useI18n();
  const links = [];
  for (const l of [item.link, ...driveLinksIn(item.resumen)]) {
    if (l && (parseDriveLink(l) || isDriveFolder(l)) && !links.includes(l)) links.push(l);
  }
  if (!links.length) return null;
  return (
    <div className="drivebtns">
      {links.map((l, i) => (
        <a key={l} className="btn-drive" href={l} target="_blank" rel="noopener noreferrer">
          {t('item.driveOpen')}{links.length > 1 ? ` (${i + 1})` : ''}
        </a>
      ))}
    </div>
  );
}

// Fecha límite: badge + editor con selector de fecha y hora (hora argentina).
function Deadline({ item, now, onSave, busy }) {
  const { t, locale } = useI18n();
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState(toLocalInput(item.fechaLimite));
  const info = deadlineInfo(item.fechaLimite, now, locale);
  if (edit) {
    return (
      <div className="dl-edit">
        <label>{t('item.deadlineLabel')}
          <input type="datetime-local" value={val} onChange={(e) => setVal(e.target.value)} />
        </label>
        <div className="modrow">
          <button type="button" className="btn btn-ghost" onClick={() => setEdit(false)} disabled={busy}>{t('item.cancel')}</button>
          {item.fechaLimite && <button type="button" className="btn btn-ghost" onClick={async () => { if (await onSave(null)) setEdit(false); }} disabled={busy}>{t('item.deadlineClear')}</button>}
          <button type="button" className="btn btn-ok" onClick={async () => { if (await onSave(val ? val + ':00-03:00' : null)) setEdit(false); }} disabled={busy}>{t('item.save')}</button>
        </div>
      </div>
    );
  }
  return (
    <div className="dl-row">
      {info && (
        <span className={`dl dl-${info.level}`} suppressHydrationWarning>
          ⏰ {info.label} <span className="dl-rel">· {info.rel}</span>
        </span>
      )}
      <button className="linkbtn" onClick={() => { setVal(toLocalInput(item.fechaLimite)); setEdit(true); }}>
        {info ? t('item.deadlineChange') : t('item.deadlineAdd')}
      </button>
    </div>
  );
}

// Texto con URLs clicables.
function Linkify({ text }) {
  const parts = String(text || '').split(/(https?:\/\/[^\s<>"]+)/g);
  return parts.map((p, i) => {
    if (!/^https?:\/\//.test(p)) return p;
    const m = /^(.*?)([.,;:!?)\]]*)$/.exec(p);
    return <span key={i}><a href={m[1]} target="_blank" rel="noopener noreferrer">{m[1]}</a>{m[2]}</span>;
  });
}

// Markdown mínimo: líneas "1. …" / "- …" como lista numerada; el resto como párrafos; URLs clicables.
function MarkdownLite({ text }) {
  const blocks = [];
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    const li = /^(?:\d+[.)]|[-*•])\s+(.*)$/.exec(line);
    if (li) {
      const last = blocks[blocks.length - 1];
      if (last?.type === 'ol') last.items.push(li[1]); else blocks.push({ type: 'ol', items: [li[1]] });
    } else if (line) blocks.push({ type: 'p', text: line });
  }
  return (
    <div className="mdlite">
      {blocks.map((b, i) => b.type === 'ol'
        ? <ol key={i}>{b.items.map((t, j) => <li key={j}><Linkify text={t} /></li>)}</ol>
        : <p key={i}><Linkify text={b.text} /></p>)}
    </div>
  );
}

function rememberNext(currentId) {
  const cards = [...document.querySelectorAll('article[data-item-id]')];
  const next = nextItemId(cards.map((el) => el.getAttribute('data-item-id')), currentId);
  try {
    if (next) sessionStorage.setItem('crm-focus-item', next);
    else sessionStorage.removeItem('crm-focus-item');
  } catch { /* private mode */ }
}

function useActions(item, router) {
  const { t, errorText } = useI18n();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function patch(body) {
    setBusy(true); setErr('');
    const r = await fetch(`/api/items/${item.id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    setBusy(false);
    if (!r.ok) { const j = await r.json().catch(() => ({})); setErr(errorText(j.error) || t('item.fail')); return false; }
    router.refresh();
    return true;
  }
  return { busy, err, patch };
}

function History({ item }) {
  const { t, locale } = useI18n();
  return (
    <details className="hist">
      <summary>{t('item.history', { n: (item.history || []).length })}</summary>
      <ul>
        {(item.history || []).map((h, i) => (
          <li key={i}>{fmt(h.at, locale)} — <strong>{t(`status.${h.status}`)}</strong>{h.por ? ` (${h.por})` : ''}{h.nota ? `: ${h.nota}` : ''}</li>
        ))}
      </ul>
    </details>
  );
}

function StatusNotes({ item, mode }) {
  const { t, locale } = useI18n();
  if (mode) return null;
  return (
    <>
      {item.status === 'pendiente' && item.noDecidido && (
        <div className="nodecidido">
          <strong>{t('item.notDecided')}</strong>
          {item.noDecidido.nota && <div>{item.noDecidido.nota}</div>}
        </div>
      )}
      {item.opsRespuesta && item.status !== 'para-ops' && (
        <div className="nota ops"><strong>{t('item.opsReply', { when: fmt(item.opsRespuesta.at, locale) })}</strong>{'\n'}<Linkify text={item.opsRespuesta.nota} /></div>
      )}
      {item.status === 'modificar' && item.nota && (
        <div className="nota"><strong>{item.tipo === 'tarea-manual' ? t('item.comment') : t('item.changes')}</strong>{'\n'}{item.nota}</div>
      )}
      {item.status === 'verificar' && (
        <div className="nota verif">{t('item.verifyNote')}</div>
      )}
      {item.status === 'para-ops' && (
        <div className="nota verif"><strong>{t('item.opsWillTry')}</strong>{item.nota ? '\n' + item.nota : ''}</div>
      )}
      {['archivado', 'descartado'].includes(item.status) && item.nota && !item.opsRespuesta && (
        <div className="nota archivo" data-testid="archive-note"><strong>{item.status === 'descartado' ? t('item.discarded') : t('item.archiveNote')}</strong>{'\n'}{item.nota}</div>
      )}
      {item.respuesta && ['aprobado', 'hecho'].includes(item.status) && (
        <div className="nota ops"><strong>{t('item.yourReply')}</strong>{'\n'}<Linkify text={item.respuesta} /></div>
      )}
      {item.status === 'rechazado' && item.nota && (
        <div className="nota rechazo"><strong>{t('item.rejectLabel')}</strong>{'\n'}{item.nota}</div>
      )}
    </>
  );
}

// Tarea manual: solo título + vencimiento; al tocar se despliegan los pasos y las acciones.
const TASK_ACTIONS = [
  ['hecho', 'task.done', 'btn-ok', 'task.doneHint'],
  ['descartado', 'task.discard', 'btn-no', 'task.discardHint'],
  ['para-ops', 'task.askOps', 'btn-mod', 'task.opsHint'],
];

function TaskCard({ item, now }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { busy, err, patch } = useActions(item, router);
  const [mode, setMode] = useState(null);
  const [nota, setNota] = useState('');
  const dl = deadlineInfo(item.fechaLimite, now, locale);
  const closed = CLOSED.includes(item.status);
  const act = TASK_ACTIONS.find(([k]) => k === mode);
  return (
    <article className={`card task${dl && !closed ? ' card-dl-' + dl.level : ''}`} data-testid="item-card" data-status={item.status}>
      <details>
        <summary className="task-sum">
          <span className="task-title">{item.titulo}</span>
          <span className="task-badges">
            {dl && !closed && <span className={`dl dl-${dl.level}`} suppressHydrationWarning>⏰ {dl.label} <span className="dl-rel">· {dl.rel}</span></span>}
            {item.status !== 'pendiente' && <span className={`badge b-${item.status}`} data-testid="item-status">{t(`status.${item.status}`)}</span>}
          </span>
        </summary>
        <div className="task-body">
          <div className="meta">
            <span className="chip tipo">{t('tipo.tarea')}</span>
            {item.proyecto && <span className="chip">📁 {item.proyecto}</span>}
            <span className="chip">🤖 {item.bot}</span>
          </div>
          <Deadline key={item.fechaLimite || 'none'} item={item} now={now} onSave={(f) => patch({ fechaLimite: f })} busy={busy} />
          <StatusNotes item={item} mode={mode} />
          {item.resumen && <MarkdownLite text={item.resumen} />}
          {item.pasos?.length > 0 && (
            <div className="mdlite pasos"><ol>{item.pasos.map((t, j) => <li key={j}><Linkify text={t} /></li>)}</ol></div>
          )}
          {item.contenido && <MarkdownLite text={item.contenido} />}
          {item.link && <div className="linkrow">🔗 <a href={item.link} target="_blank" rel="noopener noreferrer">{item.link}</a></div>}
          {act ? (
            <>
              <textarea value={nota} onChange={(e) => setNota(e.target.value)} placeholder={t(act[3])} aria-label={t(act[3])} autoFocus />
              <div className="modrow">
                <button type="button" className="btn btn-ghost" onClick={() => setMode(null)} disabled={busy}>{t('item.cancel')}</button>
                <button type="button" className={`btn ${act[2]}`} onClick={async () => { if (await patch({ status: act[0], nota })) { setMode(null); setNota(''); } }} disabled={busy}>{t('item.confirm', { label: t(act[1]) })}</button>
              </div>
            </>
          ) : closed ? (
            <div className="actions actions-one">
              <button type="button" className="btn btn-ghost btn-unarchive" data-testid="unarchive" onClick={() => patch({ status: 'pendiente' })} disabled={busy}>{t('item.backPending')}</button>
            </div>
          ) : (
            <div className="actions">
              {TASK_ACTIONS.map(([k, labelKey, cls]) => (
                <button type="button" key={k} className={`btn ${cls}`} onClick={() => { setNota(''); setMode(k); }} disabled={busy || item.status === k}>{t(labelKey)}</button>
              ))}
            </div>
          )}
          {err && <div className="err" role="alert">{err}</div>}
          <History item={item} />
        </div>
      </details>
    </article>
  );
}

export default function ItemCard({ item, now }) {
  if (item.tipo === 'tarea-manual') return <TaskCard item={item} now={now} />;
  return <ApprovalCard item={item} now={now} />;
}

function ApprovalCard({ item, now }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { busy, err, patch } = useActions(item, router);
  // null | 'aprobar' | 'modificar' | 'rechazar'
  const [mode, setMode] = useState(null);
  const [nota, setNota] = useState(
    item.status === 'modificar' || item.status === 'rechazado' ? (item.nota || '') : '',
  );
  const decide = async (status, n = '') => {
    const movesOn = status === 'aprobado' || status === 'modificar' || status === 'rechazado';
    if (movesOn) rememberNext(item.id);
    const ok = await patch({ status, nota: n });
    if (!ok && movesOn) {
      try { sessionStorage.removeItem('crm-focus-item'); } catch { /* ignore */ }
    }
    if (ok) setMode(null);
  };

  function openMode(m) {
    const same = (m === 'modificar' && item.status === 'modificar')
      || (m === 'rechazar' && item.status === 'rechazado');
    setNota(same ? (item.nota || '') : '');
    setMode(m);
  }

  const closed = CLOSED.includes(item.status);
  const dl = deadlineInfo(item.fechaLimite, now, locale);
  return (
    <article tabIndex={-1} className={`card${dl && !closed ? ' card-dl-' + dl.level : ''}`} data-testid="item-card" data-item-id={item.id} data-status={item.status}>
      <Preview link={item.link} tipo={item.tipo} titulo={item.titulo} />
      <DriveButtons item={item} />
      <div className="card-head">
        <h2>{item.titulo}</h2>
        <span className={`badge b-${item.status}`} data-testid="item-status">{t(`status.${item.status}`)}</span>
      </div>
      <div className="meta">
        <span className="chip tipo">{t(`tipo.${item.tipo}`) === `tipo.${item.tipo}` ? item.tipo : t(`tipo.${item.tipo}`)}</span>
        <span className="chip">🤖 {item.bot}</span>
        {item.proyecto && <span className="chip">📁 {item.proyecto}</span>}
        <span className="chip">🕒 {fmt(item.fechaLlegada, locale)}</span>
      </div>
      <Deadline key={item.fechaLimite || 'none'} item={item} now={now} onSave={(f) => patch({ fechaLimite: f })} busy={busy} />
      {item.resumen && <p className="resumen"><Linkify text={item.resumen} /></p>}
      {item.contenido && <div className="contenido">{item.contenido}</div>}
      {item.link && <div className="linkrow">🔗 <a href={item.link} target="_blank" rel="noopener noreferrer">{item.link}</a></div>}
      <StatusNotes item={item} mode={mode} />

      {mode === 'aprobar' ? (
        <>
          <label className="sr-only" htmlFor={`nota-${item.id}`}>{t('item.commentLabel')}</label>
          <textarea id={`nota-${item.id}`} value={nota} onChange={(e) => setNota(e.target.value)} placeholder={t('item.commentOptional')} aria-label={t('item.commentOptional')} autoFocus />
          <div className="modrow">
            <button type="button" className="btn btn-ghost" onClick={() => setMode(null)} disabled={busy}>{t('item.cancel')}</button>
            <button type="button" className="btn btn-ok" onClick={() => decide('aprobado', nota)} disabled={busy}>{t('item.confirmApprove')}</button>
          </div>
        </>
      ) : mode === 'modificar' ? (
        <>
          <textarea value={nota} onChange={(e) => setNota(e.target.value)} placeholder={t('item.whatChange')} aria-label={t('item.whatChangeAria')} autoFocus />
          <div className="modrow">
            <button type="button" className="btn btn-ghost" onClick={() => setMode(null)} disabled={busy}>{t('item.cancel')}</button>
            <button type="button" className="btn btn-mod" onClick={() => decide('modificar', nota)} disabled={busy || !nota.trim()}>{t('item.saveChanges')}</button>
          </div>
        </>
      ) : mode === 'rechazar' ? (
        <>
          <textarea value={nota} onChange={(e) => setNota(e.target.value)} placeholder={t('item.rejectReason')} aria-label={t('item.rejectReason')} autoFocus />
          <div className="modrow">
            <button type="button" className="btn btn-ghost" onClick={() => setMode(null)} disabled={busy}>{t('item.cancel')}</button>
            <button type="button" className="btn btn-no" onClick={() => decide('rechazado', nota)} disabled={busy || !nota.trim()}>{t('item.confirmReject')}</button>
          </div>
        </>
      ) : (
        <>
          {closed && (
            <div className="actions actions-one">
              <button type="button" className="btn btn-ghost btn-unarchive" data-testid="unarchive" onClick={() => decide('pendiente')} disabled={busy}>{t('item.backPending')}</button>
            </div>
          )}
          <div className="actions">
            <button type="button" className="btn btn-ok" data-testid="decidir-aprobar" onClick={() => openMode('aprobar')} disabled={busy || item.status === 'aprobado'}>{t('item.approve')}</button>
            <button type="button" className="btn btn-mod" data-testid="decidir-modificar" onClick={() => openMode('modificar')} disabled={busy}>{t('item.requestChanges')}</button>
            <button type="button" className="btn btn-no" data-testid="decidir-rechazar" onClick={() => openMode('rechazar')} disabled={busy || item.status === 'rechazado'}>{t('item.reject')}</button>
            {item.status !== 'verificar' && !closed && (
              <button type="button" className="btn btn-decid" onClick={() => decide('verificar')} disabled={busy}>{t('item.alreadyDecided')}</button>
            )}
          </div>
        </>
      )}
      {err && <div className="err" role="alert">{err}</div>}
      <History item={item} />
    </article>
  );
}
