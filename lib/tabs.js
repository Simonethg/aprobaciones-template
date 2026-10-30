import { inHoy } from './hoy.js';

export const SECTIONS = [
  ['aprobaciones', 'Approvals'],
  ['tareas', 'My tasks'],
  ['metas', 'Goals'],
];

export const TABS = [
  ['hoy', 'Today'],
  ['pendiente', 'Pending'],
  ['tareas', 'My tasks'],
  ['verificar', 'To verify'],
  ['para-ops', 'For Ops'],
  ['modificar', 'Changes requested'],
  ['aprobado', 'Approved'],
  ['rechazado', 'Rejected'],
  ['archivado', 'Archived'],
  ['todos', 'All'],
];

// Filters for the Approvals section. "My tasks" is its own section now.
// Keys are the API status values; labels here are English defaults (the UI reads them from lib/i18n.js).
export const APPROVAL_TABS = TABS.filter(([k]) => k !== 'tareas');

export const TASK_VIEWS = [
  ['abiertas', 'Open'],
  ['hechas', 'Done'],
  ['descartadas', 'Discarded'],
  ['archivadas', 'Archived'],
  ['todas', 'All'],
];

export const GOAL_VIEWS = [
  ['todas', 'All'],
  ['curso', 'In progress'],
  ['cumplidas', 'Done'],
];

export const CLOSED = ['archivado', 'hecho', 'descartado'];

// Does the item belong in this tab?
export function inTab(it, tab, now = Date.now()) {
  if (tab === 'hoy') return inHoy(it, now);
  if (tab === 'todos') return !CLOSED.includes(it.status);
  if (tab === 'archivado') return CLOSED.includes(it.status);
  if (tab === 'tareas') return it.tipo === 'tarea-manual' && !CLOSED.includes(it.status);
  return it.status === tab;
}
export const URGENCY_TABS = ['hoy', 'pendiente', 'tareas'];

export function inTaskView(it, view) {
  if (it.tipo !== 'tarea-manual') return false;
  if (view === 'todas') return true;
  if (view === 'abiertas') return !CLOSED.includes(it.status);
  if (view === 'hechas') return it.status === 'hecho';
  if (view === 'descartadas') return it.status === 'descartado';
  if (view === 'archivadas') return it.status === 'archivado';
  return false;
}
