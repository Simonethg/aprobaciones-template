'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import ItemCard from './ItemCard';
import AddItem from './AddItem';
import Goals from './Goals';
import { sortByUrgency } from '@/lib/deadline';
import { APPROVAL_TABS, GOAL_VIEWS, SECTIONS, TASK_VIEWS, URGENCY_TABS, CLOSED, inTab, inTaskView } from '@/lib/tabs';
import { presentItem } from '@/lib/demo-items';
import { LangSwitch, useI18n } from './I18n';
import ProjectHistory from './ProjectHistory';
import ThemeToggle from './ThemeToggle';

// Test projects never show up in the project filter.
const HIDDEN_PROJECTS = ['test', 'tests', 'pruebas'];

// Lowercase without accents, so searching "guion" also finds "Guión".
const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function haystack(it) {
  return norm([
    it.titulo, it.resumen, it.contenido, it.proyecto, it.bot, it.tipo, it.nota,
    it.noDecidido?.nota, ...(it.history || []).map((h) => h.nota),
  ].join('\n'));
}

const NO_PROJ = '__sin__';
const projKey = (p) => norm(p).replace(/\s+/g, ' ').trim() || NO_PROJ;
const LS_KEY = 'aprob.proyecto';

export default function Board({ items, goals, initialSection, initialTab, initialTaskView, initialGoalView, sources, now: serverNow }) {
  const { t, locale } = useI18n();
  const [section, setSection] = useState(initialSection);
  const [tab, setTab] = useState(initialTab);
  const [taskView, setTaskView] = useState(initialTaskView);
  const [goalView, setGoalView] = useState(initialGoalView);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [scope, setScope] = useState('tab'); // 'tab' | 'todos'
  const [now, setNow] = useState(serverNow);
  const [proj, setProj] = useState('todos');
  const [hist, setHist] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    let id = '';
    try { id = sessionStorage.getItem('crm-focus-item') || ''; } catch { return; }
    if (!id) return;
    try { sessionStorage.removeItem('crm-focus-item'); } catch { /* ignore */ }
    const el = document.querySelector(`article[data-item-id="${CSS.escape(id)}"]`);
    if (!el) return;
    el.classList.add('card-next');
    el.scrollIntoView({ block: 'start' });
    const btn = el.querySelector('[data-testid="decidir-aprobar"]');
    if (btn) btn.focus();
    else el.focus();
    const drop = () => el.classList.remove('card-next');
    el.addEventListener('keydown', drop, { once: true });
    el.addEventListener('pointerdown', drop, { once: true });
  }, [items]);

  useEffect(() => { try { const v = localStorage.getItem(LS_KEY); if (v) setProj(v); } catch {} }, []);
  function pickProj(k) { setProj(k); setHist(false); try { localStorage.setItem(LS_KEY, k); } catch {} }

  // Distinct projects (no duplicates from case or accents). The label is the most common spelling.
  // The badge counts status "pendiente" only. A "Test" project and projects with no open items stay hidden.
  const projects = useMemo(() => {
    const m = new Map();
    for (const it of items) {
      const k = projKey(it.proyecto);
      const e = m.get(k) || { k, n: 0, open: 0, names: {} };
      if (it.status === 'pendiente') e.n++;
      if (!CLOSED.includes(it.status)) e.open++;
      const nm = (it.proyecto || '').trim() || t('project.none');
      e.names[nm] = (e.names[nm] || 0) + 1;
      m.set(k, e);
    }
    return [...m.values()].filter((e) => e.open > 0 && !HIDDEN_PROJECTS.includes(e.k))
      .map((e) => ({ k: e.k, n: e.n, label: Object.entries(e.names).sort((a, b) => b[1] - a[1])[0][0] }))
      .sort((a, b) => (a.k === NO_PROJ) - (b.k === NO_PROJ) || a.label.localeCompare(b.label, locale));
  }, [items, t, locale]);
  const projOk = proj === 'todos' || projects.some((p) => p.k === proj);
  const activeProj = projOk ? proj : 'todos';

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60000); setNow(Date.now()); return () => clearInterval(t); }, []);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement?.tagName || '')) { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const terms = norm(q).split(/\s+/).filter(Boolean);
  const indexed = useMemo(() => items.map((it) => [it, haystack(it)]), [items]);
  const matches = indexed
    .filter(([it, h]) => (activeProj === 'todos' || projKey(it.proyecto) === activeProj) && terms.every((t) => h.includes(t)))
    .map(([it]) => it);

  const approvalCounts = Object.fromEntries(APPROVAL_TABS.map(([k]) => [k, matches.filter((i) => inTab(i, k, now)).length]));
  const taskCounts = Object.fromEntries(TASK_VIEWS.map(([k]) => [k, matches.filter((i) => inTaskView(i, k)).length]));
  const effTab = terms.length && scope === 'todos' && section === 'aprobaciones' ? 'todos' : tab;

  let shown = [];
  if (section === 'aprobaciones') {
    shown = matches.filter((i) => inTab(i, effTab, now));
    if (URGENCY_TABS.includes(effTab)) shown = sortByUrgency(shown);
  } else if (section === 'tareas') {
    shown = matches.filter((i) => inTaskView(i, taskView));
    if (taskView === 'abiertas') shown = sortByUrgency(shown);
  }

  function writeUrl(next) {
    const q = new URLSearchParams();
    q.set('seccion', next.section);
    if (next.section === 'aprobaciones') q.set('tab', next.tab);
    if (next.section === 'tareas') q.set('vista', next.taskView);
    if (next.section === 'metas') q.set('vista', next.goalView);
    window.history.replaceState(null, '', `/?${q}`);
  }

  function pickSection(k) {
    setSection(k);
    setHist(false);
    if (scope === 'todos') setScope('tab');
    writeUrl({ section: k, tab, taskView, goalView });
  }
  function pickTab(k) {
    setTab(k);
    if (scope === 'todos') setScope('tab');
    writeUrl({ section: 'aprobaciones', tab: k, taskView, goalView });
  }
  function pickTask(k) {
    setTaskView(k);
    writeUrl({ section: 'tareas', tab, taskView: k, goalView });
  }
  function pickGoal(k) {
    setGoalView(k);
    writeUrl({ section: 'metas', tab, taskView, goalView: k });
  }
  function closeSearch() { setQ(''); setOpen(false); setScope('tab'); }

  const filterLabel = section === 'tareas' ? t(`task.${taskView}`) : t(`tab.${tab}`);

  const pendingCount = approvalCounts.pendiente || 0;

  return (
    <>
      <a className="skip" href="#contenido">{t('skip.content')}</a>
      <header className="topbar">
        <div className="topbar-inner">
          <nav className="sections" aria-label={t('nav.sections')}>
            <span className="dot" aria-hidden="true" />
            {SECTIONS.map(([k]) => (
              <button
                key={k}
                type="button"
                data-testid={`section-${k}`}
                aria-current={k === section ? 'page' : undefined}
                className={'section' + (k === section ? ' active' : '')}
                onClick={() => pickSection(k)}
              >
                {t(`section.${k}`)}
                {k === 'aprobaciones' && (
                  <span className="section-badge" data-testid="pending-count" aria-label={t('pending.aria', { n: pendingCount })}>{pendingCount}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="topbar-right">
            <LangSwitch />
            <ThemeToggle />
            <button type="button" className={'searchbtn' + (open ? ' on' : '')} aria-label={t('search.label')} title={t('search.title')}
              onClick={() => (open ? closeSearch() : setOpen(true))}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            </button>
            <form action="/api/logout" method="post"><button className="logout">{t('logout')}</button></form>
          </div>
        </div>
        {open && (
          <div className="searchbar">
            <input ref={inputRef} type="search" value={q} onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && closeSearch()}
              placeholder={section === 'metas' ? t('search.placeholder.goals') : t('search.placeholder.items')}
              aria-label={t('search.label')} />
            {section === 'aprobaciones' && (
              <div className="scope">
                <button type="button" className={scope === 'tab' ? 'on' : ''} onClick={() => setScope('tab')}>
                  {t('search.scopeTab', { label: filterLabel })}
                </button>
                <button type="button" className={scope === 'todos' ? 'on' : ''} onClick={() => setScope('todos')}>{t('search.scopeAll')}</button>
              </div>
            )}
          </div>
        )}
        {section !== 'metas' && (
          <div className="projbar">
            <select value={activeProj} onChange={(e) => pickProj(e.target.value)} aria-label={t('project.label')}
              className={activeProj !== 'todos' ? 'on' : ''}>
              <option value="todos">{t('project.all')}</option>
              {projects.map((p) => <option key={p.k} value={p.k}>{p.n ? `${p.label} (${p.n})` : p.label}</option>)}
            </select>
            {activeProj !== 'todos' && (
              <>
                <button type="button" className="linkbtn light histbtn" data-testid="project-history" onClick={() => setHist((v) => !v)}>
                  {hist ? t('project.historyClose') : t('project.history')}
                </button>
                <button type="button" className="linkbtn light" onClick={() => pickProj('todos')}>{t('project.clear')}</button>
              </>
            )}
          </div>
        )}
        <nav className="tabs" aria-label={section === 'metas' ? t('nav.filters.goals') : section === 'tareas' ? t('nav.filters.tasks') : t('nav.filters.approvals')}>
          {section === 'aprobaciones' && APPROVAL_TABS.map(([k]) => (
            <a key={k} href={`/?seccion=aprobaciones&tab=${k}`} onClick={(e) => { e.preventDefault(); pickTab(k); }}
              data-testid={`filter-${k}`}
              className={'tab' + (k === effTab ? ' active' : '') + (k === 'verificar' && approvalCounts[k] ? ' alert' : '')}>
              {t(`tab.${k}`)}<span className="n">{approvalCounts[k]}</span>
            </a>
          ))}
          {section === 'tareas' && TASK_VIEWS.map(([k]) => (
            <a key={k} href={`/?seccion=tareas&vista=${k}`} onClick={(e) => { e.preventDefault(); pickTask(k); }}
              data-testid={`filter-${k}`}
              className={'tab' + (k === taskView ? ' active' : '')}>
              {t(`task.${k}`)}<span className="n">{taskCounts[k]}</span>
            </a>
          ))}
          {section === 'metas' && GOAL_VIEWS.map(([k]) => (
            <a key={k} href={`/?seccion=metas&vista=${k}`} onClick={(e) => { e.preventDefault(); pickGoal(k); }}
              data-testid={`filter-${k}`}
              className={'tab' + (k === goalView ? ' active' : '')}>
              {t(`goalView.${k}`)}
            </a>
          ))}
        </nav>
      </header>
      <main id="contenido" tabIndex={-1}>
        {section !== 'metas' && <AddItem mode={section} />}
        {terms.length > 0 && section === 'aprobaciones' && (
          <div className="searchinfo">
            {t('search.info', {
              n: shown.length,
              word: shown.length === 1 ? t('search.one') : t('search.many'),
              q: q.trim(),
              where: effTab === 'todos' ? t('search.whereAll') : t('search.whereTab', { label: t(`tab.${effTab}`) }),
            })}
            {effTab !== 'todos' && matches.length > shown.length && (
              <> · <button type="button" className="linkbtn" onClick={() => setScope('todos')}>{t('search.seeAll', { n: matches.length })}</button></>
            )}
          </div>
        )}
        {section === 'metas' ? (
          <Goals goals={goals} view={goalView} terms={terms} sources={sources} />
        ) : hist && activeProj !== 'todos' ? (
          <ProjectHistory proyecto={projects.find((p) => p.k === activeProj)?.label || ''} onClose={() => setHist(false)} />
        ) : shown.length === 0 ? (
          <div className="empty">{terms.length ? t('empty.search') : t('empty.items')}</div>
        ) : shown.map((it) => <ItemCard key={it.id} item={presentItem(it, locale)} now={now} />)}
      </main>
    </>
  );
}
