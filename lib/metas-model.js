// Cálculo de metas. Sin disco ni red: lo importa también el navegador.
import { arParts } from './deadline.js';

export const KINDS = ['ratio', 'percent', 'money', 'money-marker', 'plain'];
export const GOAL_ID = /^[a-z0-9-]{6,64}$/;
const DAY = 864e5;

const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function clampNum(v, max = 1e12) {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.').trim());
  if (!Number.isFinite(n)) return 0;
  return Math.min(max, Math.max(0, n));
}

// Avance 0..1. Si no hay denominador, la barra queda en 0: no se inventa una meta.
export function progressRatio(goal) {
  if (!goal) return 0;
  if (goal.kind === 'percent' || goal.kind === 'plain') return Math.min(1, clampNum(goal.actual, 100) / 100);
  if (goal.kind === 'ratio') {
    const total = clampNum(goal.total);
    return total > 0 ? Math.min(1, clampNum(goal.actual) / total) : 0;
  }
  const meta = clampNum(goal.meta);
  return meta > 0 ? Math.min(1, clampNum(goal.actual) / meta) : 0;
}

export function progressPercent(goal) {
  return Math.round(progressRatio(goal) * 1000) / 10;
}

// Posición 0..100 del marcador (mínimo) sobre la escala de la meta. null si no aplica.
export function markerPercent(goal) {
  if (!goal || goal.kind !== 'money-marker') return null;
  const meta = clampNum(goal.meta);
  if (meta <= 0) return null;
  return Math.min(100, Math.round((clampNum(goal.minimo) / meta) * 1000) / 10);
}

export function isGoalDone(goal) {
  if (goal.kind === 'percent' || goal.kind === 'plain') return clampNum(goal.actual, 100) >= 100;
  if (goal.kind === 'ratio') return clampNum(goal.total) > 0 && clampNum(goal.actual) >= clampNum(goal.total);
  return clampNum(goal.meta) > 0 && clampNum(goal.actual) >= clampNum(goal.meta);
}

export function inGoalView(goal, view) {
  if (view === 'cumplidas') return isGoalDone(goal);
  if (view === 'curso') return !isGoalDone(goal);
  return true;
}

function money(n) {
  const x = clampNum(n);
  const [ent, dec] = x.toFixed(2).split('.');
  const withDots = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return dec === '00' ? withDots : `${withDots},${dec}`;
}

// Texto del indicador. Usa solo los números guardados.
export function goalCaption(goal, locale = 'es') {
  if (goal.kind === 'ratio') {
    const unidad = goal.unidad || 'unidades';
    return `${money(goal.actual)} / ${money(goal.total)} ${unidad}`;
  }
  if (goal.kind === 'percent' || goal.kind === 'plain') return `${money(goal.actual)}%`;
  if (goal.kind === 'money-marker') {
    if (locale === 'en') {
      return `USD ${money(goal.actual)} sold · ${money(goal.percent)}% · minimum USD ${money(goal.minimo)} · goal USD ${money(goal.meta)}`;
    }
    return `USD ${money(goal.actual)} vendidos · ${money(goal.percent)}% · mínimo USD ${money(goal.minimo)} · meta USD ${money(goal.meta)}`;
  }
  const unidad = goal.unidad || 'USD';
  if (clampNum(goal.meta) > 0) return `${unidad} ${money(goal.actual)} / ${money(goal.meta)}`;
  return `${unidad} ${money(goal.actual)}`;
}

function baseGoal(partial) {
  return {
    actual: 0,
    total: 0,
    meta: 0,
    minimo: 0,
    percent: 0,
    unidad: '',
    indicador: '',
    fechaLimite: null,
    ...partial,
  };
}

// Optional goal deadline: calendar date YYYY-MM-DD, or null to clear. undefined = leave it.
export function normalizeGoalDate(v) {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  if (typeof v !== 'string') throw new Error('fechaLimite inválida');
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v.trim());
  if (!m) throw new Error('fechaLimite inválida');
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    throw new Error('fechaLimite inválida');
  }
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function dayIndexFromYmd(y, m, d) {
  return Math.floor(Date.UTC(y, m - 1, d) / DAY);
}

// Whole Argentina calendar days from today until fechaLimite. Negative if the date has passed.
export function daysUntilGoal(fecha, now = Date.now()) {
  const date = normalizeGoalDate(fecha);
  if (!date) return null;
  const [y, m, d] = date.split('-').map(Number);
  const today = arParts(now);
  return dayIndexFromYmd(y, m, d) - dayIndexFromYmd(today.y, today.m, today.d);
}

// Units still to go. null when the goal has no scale, so the pace is not invented.
export function goalRemaining(goal) {
  if (!goal) return null;
  if (goal.kind === 'percent' || goal.kind === 'plain') return Math.max(0, 100 - clampNum(goal.actual, 100));
  if (goal.kind === 'ratio') {
    const total = clampNum(goal.total);
    if (total <= 0) return null;
    return Math.max(0, total - clampNum(goal.actual));
  }
  const meta = clampNum(goal.meta);
  if (meta <= 0) return null;
  return Math.max(0, meta - clampNum(goal.actual));
}

// "faltan 8 clases en 6 días: 1,3 por día". Null when there is no date or nothing left to count.
function formatNum(n, locale) {
  const rounded = Math.round(n * 10) / 10;
  const text = Math.abs(rounded - Math.round(rounded)) < 1e-9 ? String(Math.round(rounded)) : rounded.toFixed(1);
  return locale === 'en' ? text : text.replace('.', ',');
}

export function goalPace(goal, now = Date.now(), locale = 'es') {
  if (!goal?.fechaLimite) return null;
  const days = daysUntilGoal(goal.fechaLimite, now);
  const left = goalRemaining(goal);
  if (days == null || left == null || left <= 0) return null;
  const unidad = goal.unidad || (locale === 'en' ? 'units' : 'unidades');
  const cuanto = formatNum(left, locale);
  if (locale === 'en') {
    if (days < 0) return `overdue: ${cuanto} ${unidad} left`;
    if (days === 0) return `${cuanto} ${unidad} left today`;
    const rate = formatNum(left / days, locale);
    const dias = days === 1 ? '1 day' : `${days} days`;
    return `${cuanto} ${unidad} left in ${dias}: ${rate} per day`;
  }
  if (days < 0) return `fecha vencida: faltan ${cuanto} ${unidad}`;
  if (days === 0) return `faltan ${cuanto} ${unidad} hoy`;
  const rate = formatNum(left / days, locale);
  const dias = days === 1 ? '1 día' : `${days} días`;
  return `faltan ${cuanto} ${unidad} en ${dias}: ${rate} por día`;
}

// Starter goals for the workshop. Every actual starts at 0. The money scale is a demo, not a real target.
export const SEED_GOALS = [
  baseGoal({
    id: 'videos-aprobados',
    orden: 1,
    titulo: 'Approved videos for Proyecto A · Videos aprobados de Proyecto A',
    kind: 'ratio',
    unidad: 'videos',
    indicador: 'Approved videos / total · Videos aprobados / total',
  }),
  baseGoal({
    id: 'ventas-tienda',
    orden: 2,
    titulo: 'Shop sales (demo) · Ventas de la tienda (demo)',
    kind: 'money-marker',
    minimo: 100,
    meta: 500,
    unidad: 'USD',
    indicador: 'Sample percent and amount · Porcentaje y monto de ejemplo',
  }),
  baseGoal({
    id: 'ventas-catalogo',
    orden: 3,
    titulo: 'Catalog sales (demo) · Ventas del catálogo (demo)',
    kind: 'money',
    unidad: 'USD',
    indicador: 'Sample USD · USD de ejemplo',
  }),
];

export function newGoalFromInput(input, orden = Date.now()) {
  const titulo = clean(input?.titulo, 200);
  if (!titulo) throw new Error('Falta el título');
  let kind = clean(input?.kind, 20);
  if (!KINDS.includes(kind)) kind = 'percent';
  const id = `m${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
  const unidad = clean(input?.unidad, 40) || (kind === 'percent' || kind === 'plain' ? '%' : kind === 'ratio' ? 'unidades' : 'USD');
  const goal = baseGoal({
    id,
    orden,
    titulo,
    kind,
    unidad,
    indicador: clean(input?.indicador, 160) || 'Avance',
    updatedAt: new Date().toISOString(),
  });
  // El avance arranca en 0. La meta/total/mínimo sí pueden venir del formulario (son la escala).
  if (kind === 'ratio') goal.total = clampNum(input?.total);
  if (kind === 'money' || kind === 'money-marker') goal.meta = clampNum(input?.meta);
  if (kind === 'money-marker') goal.minimo = clampNum(input?.minimo);
  if (input?.fechaLimite) goal.fechaLimite = normalizeGoalDate(input.fechaLimite);
  return goal;
}

export function applyGoalUpdate(goal, input) {
  const body = input && typeof input === 'object' ? input : {};
  if (typeof body.titulo === 'string') {
    const titulo = clean(body.titulo, 200);
    if (!titulo) throw new Error('Falta el título');
    goal.titulo = titulo;
  }
  if (typeof body.indicador === 'string') goal.indicador = clean(body.indicador, 160);
  if (typeof body.unidad === 'string') goal.unidad = clean(body.unidad, 40);
  if (body.kind && KINDS.includes(body.kind)) goal.kind = body.kind;
  const maxPercent = 100;
  if (body.actual !== undefined) goal.actual = clampNum(body.actual, goal.kind === 'percent' || goal.kind === 'plain' ? maxPercent : 1e12);
  if (body.total !== undefined) goal.total = clampNum(body.total);
  if (body.meta !== undefined) goal.meta = clampNum(body.meta);
  if (body.minimo !== undefined) goal.minimo = clampNum(body.minimo);
  if (body.percent !== undefined) goal.percent = clampNum(body.percent, maxPercent);
  if (Object.prototype.hasOwnProperty.call(body, 'fechaLimite')) goal.fechaLimite = normalizeGoalDate(body.fechaLimite);
  goal.updatedAt = new Date().toISOString();
  return goal;
}

