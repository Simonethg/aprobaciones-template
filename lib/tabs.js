import { inHoy } from './hoy.js';

export const SECTIONS = [
  ['aprobaciones', 'Aprobaciones'],
  ['tareas', 'Tareas mías'],
  ['metas', 'Metas'],
];

export const TABS = [
  ['hoy', 'Hoy'],
  ['pendiente', 'Pendientes'],
  ['tareas', 'Tareas mías'],
  ['verificar', 'Por verificar'],
  ['para-ops', 'Para Ops'],
  ['modificar', 'Por modificar'],
  ['aprobado', 'Aprobados'],
  ['rechazado', 'Rechazados'],
  ['archivado', 'Archivados'],
  ['todos', 'Todos'],
];

// Filtros de la sección Aprobaciones. "Tareas mías" pasó a ser sección propia.
export const APPROVAL_TABS = TABS.filter(([k]) => k !== 'tareas');

export const TASK_VIEWS = [
  ['abiertas', 'Abiertas'],
  ['hechas', 'Hechas'],
  ['descartadas', 'Descartadas'],
  ['archivadas', 'Archivadas'],
  ['todas', 'Todas'],
];

export const GOAL_VIEWS = [
  ['todas', 'Todas'],
  ['curso', 'En curso'],
  ['cumplidas', 'Cumplidas'],
];

export const CLOSED = ['archivado', 'hecho', 'descartado'];

// ¿El ítem va en esta pestaña?
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
