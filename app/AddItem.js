'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from './I18n';

const TIPOS = ['guion', 'texto', 'video', 'audio', 'imagen', 'email', 'post', 'otro'];

export default function AddItem({ mode }) {
  const { t, errorText } = useI18n();
  const router = useRouter();
  const task = mode === 'tareas';
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({
    titulo: '', tipo: 'otro', proyecto: '', asignado: '', resumen: '', link: '', contenido: '', pasos: '', fechaLimite: '',
  });

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    const body = {
      origen: 'ui',
      titulo: form.titulo,
      tipo: task ? 'tarea-manual' : form.tipo,
      proyecto: form.proyecto,
      asignado: form.asignado,
      resumen: form.resumen,
      link: form.link,
      contenido: form.contenido,
      ...(task ? { pasos: form.pasos } : {}),
      ...(form.fechaLimite ? { fechaLimite: form.fechaLimite + ':00-03:00' } : {}),
    };
    const r = await fetch('/api/items', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    setBusy(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErr(errorText(j.error) || t('add.fail'));
      return;
    }
    setForm({ titulo: '', tipo: 'otro', proyecto: '', resumen: '', link: '', asignado: '', contenido: '', pasos: '', fechaLimite: '' });
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" className="addbtn" data-testid="add-item" onClick={() => setOpen(true)}>
        {t('add.open')}
      </button>
    );
  }

  return (
    <form className="addform card" data-testid="add-item-form" onSubmit={submit}>
      <h2>{task ? t('add.task') : t('add.item')}</h2>
      <label htmlFor="add-titulo">{t('add.title')}
        <input id="add-titulo" data-testid="add-titulo" required value={form.titulo} onChange={(e) => set('titulo', e.target.value)} />
      </label>
      {!task && (
        <label htmlFor="add-tipo">{t('add.type')}
          <select id="add-tipo" data-testid="add-tipo" value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
            {TIPOS.map((k) => <option key={k} value={k}>{t(`tipo.${k}`)}</option>)}
          </select>
        </label>
      )}
      <label htmlFor="add-proyecto">{t('add.project')}
        <input id="add-proyecto" data-testid="add-proyecto" value={form.proyecto} onChange={(e) => set('proyecto', e.target.value)} />
      </label>
      <label htmlFor="add-asignado">{t('add.assignee')}
        <input id="add-asignado" data-testid="add-asignado" maxLength={120} value={form.asignado} onChange={(e) => set('asignado', e.target.value)} />
      </label>
      <label htmlFor="add-fecha">{t('add.deadline')}
        <input id="add-fecha" data-testid="add-fecha" type="datetime-local" value={form.fechaLimite} onChange={(e) => set('fechaLimite', e.target.value)} />
      </label>
      {task ? (
        <label htmlFor="add-pasos">{t('add.steps')}
          <textarea id="add-pasos" data-testid="add-pasos" value={form.pasos} onChange={(e) => set('pasos', e.target.value)} />
        </label>
      ) : (
        <>
          <label htmlFor="add-resumen">{t('add.summary')}
            <textarea id="add-resumen" data-testid="add-resumen" maxLength={2000} value={form.resumen} onChange={(e) => set('resumen', e.target.value)} />
          </label>
          <label htmlFor="add-link">{t('add.link')}
            <input id="add-link" data-testid="add-link" type="url" inputMode="url" placeholder="https://drive.google.com/…" maxLength={2000} value={form.link} onChange={(e) => set('link', e.target.value)} />
          </label>
          <label htmlFor="add-contenido">{t('add.body')}
            <textarea id="add-contenido" data-testid="add-contenido" maxLength={2000} value={form.contenido} onChange={(e) => set('contenido', e.target.value)} />
          </label>
        </>
      )}
      {err && <div className="err" role="alert">{err}</div>}
      <div className="modrow">
        <button type="button" className="btn btn-ghost" onClick={() => { setOpen(false); setErr(''); }} disabled={busy}>{t('add.cancel')}</button>
        <button type="submit" className="btn btn-ok" data-testid="add-submit" disabled={busy || !form.titulo.trim()}>{t('add.save')}</button>
      </div>
    </form>
  );
}
