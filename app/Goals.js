'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { presentGoal } from '@/lib/demo-items';
import { goalCaption, goalPace, inGoalView, markerPercent, progressPercent } from '@/lib/metas-model';
import { useI18n } from './I18n';

const KINDS = ['percent', 'ratio', 'money', 'plain'];

function num(v) {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function sourceLine(goal, sources, syncFuentes) {
  const synced = syncFuentes?.[goal.id];
  if (synced && synced !== 'ok') return 'sin fuente conectada';
  if (sources && sources[goal.id] === false && synced !== 'ok') return 'sin fuente conectada';
  return '';
}

function GoalCard({ goal, onSaved, onDeleted, sources, syncFuentes }) {
  const { t, locale, errorText } = useI18n();
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [draft, setDraft] = useState(null);
  const pct = progressPercent(goal);
  const mark = markerPercent(goal);
  const caption = goalCaption(goal, locale);

  function start() {
    setDraft({
      titulo: goal.titulo,
      indicador: goal.indicador || '',
      actual: goal.actual ?? 0,
      total: goal.total ?? 0,
      meta: goal.meta ?? 0,
      minimo: goal.minimo ?? 0,
      percent: goal.percent ?? 0,
      fechaLimite: goal.fechaLimite || '',
    });
    setErr('');
    setEdit(true);
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    const body = { ...draft };
    for (const k of ['actual', 'total', 'meta', 'minimo', 'percent']) body[k] = num(body[k]);
    const r = await fetch(`/api/metas/${goal.id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(errorText(j.error) || t('goal.failSave')); return; }
    setEdit(false);
    onSaved(j.goal);
  }

  async function remove() {
    if (!window.confirm(t('goal.deleteConfirm'))) return;
    setBusy(true); setErr('');
    const r = await fetch(`/api/metas/${goal.id}`, { method: 'DELETE' });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(errorText(j.error) || t('goal.failDelete')); return; }
    onDeleted(goal.id);
  }

  const barLabel = `${goal.titulo}: ${caption}`;
  const pace = goalPace(goal, Date.now(), locale);
  const fuente = sourceLine(goal, sources, syncFuentes);

  return (
    <article className="card goal" data-testid="goal-card" data-goal-id={goal.id}>
      <button type="button" className="goal-delete" aria-label={t('goal.delete')} data-testid="goal-delete" onClick={remove} disabled={busy}>X</button>
      <div className="card-head">
        <h2>{goal.titulo}</h2>
        <span className="badge b-pendiente" data-testid="goal-pct">{pct}%</span>
      </div>
      {goal.indicador && <p className="goal-indicador">{goal.indicador}</p>}
      <p className="goal-caption" data-testid="goal-caption">{caption}</p>
      {pace && <p className="goal-pace" data-testid="goal-pace">{pace}</p>}
      {fuente && <p className="goal-source" data-testid="goal-source">{fuente === 'sin fuente conectada' ? t('source.missing') : fuente}</p>}
      <div
        className="goal-track"
        role="progressbar"
        aria-label={barLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        data-testid="goal-progress"
      >
        <div className="goal-fill" style={{ width: `${Math.min(100, pct)}%` }} />
        {mark != null && (
          <span className="goal-mark" style={{ left: `${mark}%` }} title={t('goal.minTitle', { n: goal.minimo })}>
            <span className="goal-mark-label">{t('goal.minShort', { n: goal.minimo })}</span>
          </span>
        )}
      </div>
      {edit ? (
        <form className="goal-edit" onSubmit={save}>
          <label htmlFor={`t-${goal.id}`}>{t('goal.title')}
            <input id={`t-${goal.id}`} value={draft.titulo} onChange={(e) => setDraft({ ...draft, titulo: e.target.value })} required />
          </label>
          <label htmlFor={`i-${goal.id}`}>{t('goal.measures')}
            <input id={`i-${goal.id}`} value={draft.indicador} onChange={(e) => setDraft({ ...draft, indicador: e.target.value })} />
          </label>
          {(goal.kind === 'percent' || goal.kind === 'plain') && (
            <label htmlFor={`a-${goal.id}`}>{t('goal.percent')}
              <input id={`a-${goal.id}`} data-testid="goal-actual" inputMode="decimal" value={draft.actual} onChange={(e) => setDraft({ ...draft, actual: e.target.value })} />
            </label>
          )}
          {goal.kind === 'ratio' && (
            <>
              <label htmlFor={`a-${goal.id}`}>{t('goal.doneCount')}
                <input id={`a-${goal.id}`} data-testid="goal-actual" inputMode="decimal" value={draft.actual} onChange={(e) => setDraft({ ...draft, actual: e.target.value })} />
              </label>
              <label htmlFor={`tot-${goal.id}`}>{t('goal.totalShort')}
                <input id={`tot-${goal.id}`} data-testid="goal-total" inputMode="decimal" value={draft.total} onChange={(e) => setDraft({ ...draft, total: e.target.value })} />
              </label>
            </>
          )}
          {(goal.kind === 'money' || goal.kind === 'money-marker') && (
            <>
              <label htmlFor={`a-${goal.id}`}>{t('goal.usdNow')}
                <input id={`a-${goal.id}`} data-testid="goal-actual" inputMode="decimal" value={draft.actual} onChange={(e) => setDraft({ ...draft, actual: e.target.value })} />
              </label>
              <label htmlFor={`m-${goal.id}`}>{t('goal.usdTarget')}
                <input id={`m-${goal.id}`} data-testid="goal-meta" inputMode="decimal" value={draft.meta} onChange={(e) => setDraft({ ...draft, meta: e.target.value })} />
              </label>
            </>
          )}
          {goal.kind === 'money-marker' && (
            <>
              <label htmlFor={`p-${goal.id}`}>{t('goal.percentSold')}
                <input id={`p-${goal.id}`} data-testid="goal-percent" inputMode="decimal" value={draft.percent} onChange={(e) => setDraft({ ...draft, percent: e.target.value })} />
              </label>
              <label htmlFor={`min-${goal.id}`}>{t('goal.minMark')}
                <input id={`min-${goal.id}`} data-testid="goal-minimo" inputMode="decimal" value={draft.minimo} onChange={(e) => setDraft({ ...draft, minimo: e.target.value })} />
              </label>
            </>
          )}
          <label htmlFor={`f-${goal.id}`}>{t('goal.deadlineOptional')}
            <input id={`f-${goal.id}`} type="date" data-testid="goal-fecha" value={draft.fechaLimite} onChange={(e) => setDraft({ ...draft, fechaLimite: e.target.value })} />
          </label>
          <div className="modrow">
            <button type="button" className="btn btn-ghost" onClick={() => setEdit(false)} disabled={busy}>{t('goal.cancel')}</button>
            <button type="submit" className="btn btn-ok" data-testid="goal-save" disabled={busy}>{t('goal.save')}</button>
          </div>
        </form>
      ) : (
        <div className="modrow">
          <button type="button" className="btn btn-ghost" data-testid="goal-edit" onClick={start}>{t('goal.edit')}</button>
        </div>
      )}
      {err && <div className="err" role="alert">{err}</div>}
    </article>
  );
}

export default function Goals({ goals, view, terms, sources }) {
  const { t, locale, errorText } = useI18n();
  const router = useRouter();
  const [list, setList] = useState(goals);
  useEffect(() => setList(goals), [goals]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ titulo: '', kind: 'percent', unidad: '%', indicador: '', total: '', meta: '', fechaLimite: '' });
  const [syncing, setSyncing] = useState(false);
  const [syncErr, setSyncErr] = useState('');
  const [syncFuentes, setSyncFuentes] = useState(null);

  const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const shown = list.filter((g) => inGoalView(g, view) && (terms || []).every((t) => norm(`${g.titulo}\n${g.indicador}`).includes(t)));

  function replace(goal) {
    setList((xs) => xs.map((g) => (g.id === goal.id ? goal : g)));
    router.refresh();
  }

  function removeFromList(id) {
    setList((xs) => xs.filter((g) => g.id !== id));
    router.refresh();
  }

  async function sync() {
    setSyncing(true); setSyncErr('');
    const r = await fetch('/api/metas/sync', { method: 'POST' });
    const j = await r.json().catch(() => ({}));
    setSyncing(false);
    if (!r.ok) { setSyncErr(errorText(j.error) || t('goal.failSync')); return; }
    if (Array.isArray(j.goals)) setList(j.goals);
    setSyncFuentes(j.fuentes || {});
    router.refresh();
  }

  async function create(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    const r = await fetch('/api/metas', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        titulo: form.titulo,
        kind: form.kind,
        unidad: form.unidad,
        indicador: form.indicador,
        total: form.total,
        meta: form.meta,
        fechaLimite: form.fechaLimite,
      }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(errorText(j.error) || t('goal.failSave')); return; }
    setList((xs) => [...xs, j.goal].sort((a, b) => (a.orden || 0) - (b.orden || 0)));
    setForm({ titulo: '', kind: 'percent', unidad: '%', indicador: '', total: '', meta: '', fechaLimite: '' });
    setOpen(false);
    router.refresh();
  }

  return (
    <div data-testid="goals">
      <div className="goal-toolbar">
        <button type="button" className="addbtn addbtn-inline" data-testid="goals-sync" onClick={sync} disabled={syncing}>
          {syncing ? t('goal.refreshing') : t('goal.refresh')}
        </button>
        {!open && (
          <button type="button" className="addbtn addbtn-inline" data-testid="add-goal" onClick={() => setOpen(true)}>{t('goal.add')}</button>
        )}
      </div>
      {syncErr && <div className="err" role="alert">{syncErr}</div>}
      {open ? (
        <form className="addform card" data-testid="add-goal-form" onSubmit={create}>
          <h2>{t('goal.new')}</h2>
          <label htmlFor="goal-titulo">{t('goal.title')}
            <input id="goal-titulo" data-testid="goal-titulo" required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </label>
          <label htmlFor="goal-kind">{t('goal.kind')}
            <select id="goal-kind" data-testid="goal-kind" value={form.kind} onChange={(e) => {
              const kind = e.target.value;
              const unidad = kind === 'percent' || kind === 'plain' ? '%' : kind === 'ratio' ? 'unidades' : 'USD';
              setForm({ ...form, kind, unidad });
            }}>
              {KINDS.map((k) => <option key={k} value={k}>{t(`kind.${k}`)}</option>)}
            </select>
          </label>
          <label htmlFor="goal-ind">{t('goal.measures')}
            <input id="goal-ind" value={form.indicador} onChange={(e) => setForm({ ...form, indicador: e.target.value })} placeholder={t('goal.placeholder')} />
          </label>
          <label htmlFor="goal-unidad">{t('goal.unit')}
            <input id="goal-unidad" value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} />
          </label>
          {form.kind === 'ratio' && (
            <label htmlFor="goal-total">{t('goal.total')}
              <input id="goal-total" inputMode="decimal" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} />
            </label>
          )}
          {form.kind === 'money' && (
            <label htmlFor="goal-meta">{t('goal.moneyMeta')}
              <input id="goal-meta" inputMode="decimal" value={form.meta} onChange={(e) => setForm({ ...form, meta: e.target.value })} />
            </label>
          )}
          <label htmlFor="goal-fecha">{t('goal.deadlineOptional')}
            <input id="goal-fecha" type="date" value={form.fechaLimite} onChange={(e) => setForm({ ...form, fechaLimite: e.target.value })} />
          </label>
          {err && <div className="err" role="alert">{err}</div>}
          <div className="modrow">
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)} disabled={busy}>{t('goal.cancel')}</button>
            <button type="submit" className="btn btn-ok" data-testid="goal-create" disabled={busy || !form.titulo.trim()}>{t('goal.save')}</button>
          </div>
        </form>
      ) : null}
      {shown.length === 0 ? (
        <div className="empty">{t('goal.empty')}</div>
      ) : shown.map((g) => (
        <GoalCard key={g.id} goal={presentGoal(g, locale)} onSaved={replace} onDeleted={removeFromList} sources={sources} syncFuentes={syncFuentes} />
      ))}
    </div>
  );
}
