// Goal math. No disk or network access, so the browser can import it too.
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

// Progress from 0 to 1. With no denominator the bar stays at 0 instead of inventing a target.
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

// Where the minimum marker sits on the goal scale (0 to 100). null when it does not apply.
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

function money(n, locale = 'en') {
  const x = clampNum(n);
  const [int, dec] = x.toFixed(2).split('.');
  const es = locale === 'es';
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, es ? '.' : ',');
  return dec === '00' ? grouped : `${grouped}${es ? ',' : '.'}${dec}`;
}

// Caption under the bar. Uses only the stored numbers.
export function goalCaption(goal, locale = 'en') {
  const m = (n) => money(n, locale);
  if (goal.kind === 'ratio') {
    const unidad = goal.unidad || (locale === 'es' ? 'unidades' : 'units');
    return `${m(goal.actual)} / ${m(goal.total)} ${unidad}`;
  }
  if (goal.kind === 'percent' || goal.kind === 'plain') return `${m(goal.actual)}%`;
  if (goal.kind === 'money-marker') {
    if (locale === 'es') {
      return `USD ${m(goal.actual)} vendidos · ${m(goal.percent)}% · mínimo USD ${m(goal.minimo)} · meta USD ${m(goal.meta)}`;
    }
    return `USD ${m(goal.actual)} sold · ${m(goal.percent)}% · minimum USD ${m(goal.minimo)} · goal USD ${m(goal.meta)}`;
  }
  const unidad = goal.unidad || 'USD';
  if (clampNum(goal.meta) > 0) return `${unidad} ${m(goal.actual)} / ${m(goal.meta)}`;
  return `${unidad} ${m(goal.actual)}`;
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
  if (typeof v !== 'string') throw new Error('Invalid fechaLimite');
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v.trim());
  if (!m) throw new Error('Invalid fechaLimite');
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    throw new Error('Invalid fechaLimite');
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

// "8 classes left in 6 days: 1.3 per day". Null when there is no date or nothing left to count.
function formatNum(n, locale) {
  const rounded = Math.round(n * 10) / 10;
  const text = Math.abs(rounded - Math.round(rounded)) < 1e-9 ? String(Math.round(rounded)) : rounded.toFixed(1);
  return locale === 'es' ? text.replace('.', ',') : text;
}

export function goalPace(goal, now = Date.now(), locale = 'en') {
  if (!goal?.fechaLimite) return null;
  const days = daysUntilGoal(goal.fechaLimite, now);
  const left = goalRemaining(goal);
  if (days == null || left == null || left <= 0) return null;
  const unidad = goal.unidad || (locale === 'es' ? 'unidades' : 'units');
  const cuanto = formatNum(left, locale);
  if (locale !== 'es') {
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
    titulo: 'Approved videos for Project A',
    kind: 'ratio',
    unidad: 'videos',
    indicador: 'Approved videos / total',
  }),
  baseGoal({
    id: 'ventas-tienda',
    orden: 2,
    titulo: 'Shop sales (demo)',
    kind: 'money-marker',
    minimo: 100,
    meta: 500,
    unidad: 'USD',
    indicador: 'Sample percent and amount',
  }),
  baseGoal({
    id: 'ventas-catalogo',
    orden: 3,
    titulo: 'Catalog sales (demo)',
    kind: 'money',
    unidad: 'USD',
    indicador: 'Sample USD',
  }),
];

export function newGoalFromInput(input, orden = Date.now()) {
  const titulo = clean(input?.titulo, 200);
  if (!titulo) throw new Error('Missing title');
  let kind = clean(input?.kind, 20);
  if (!KINDS.includes(kind)) kind = 'percent';
  const id = `m${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
  const unidad = clean(input?.unidad, 40) || (kind === 'percent' || kind === 'plain' ? '%' : kind === 'ratio' ? 'units' : 'USD');
  const goal = baseGoal({
    id,
    orden,
    titulo,
    kind,
    unidad,
    indicador: clean(input?.indicador, 160) || 'Progress',
    updatedAt: new Date().toISOString(),
  });
  // Progress starts at 0. Target, total and minimum may come from the form because they set the scale.
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
    if (!titulo) throw new Error('Missing title');
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

