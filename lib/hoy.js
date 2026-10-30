// Daily queue. Dates are Argentina calendar days (UTC-3, no DST).
import { arParts } from './deadline.js';

const CLOSED = ['archivado', 'hecho', 'descartado'];
const DAY = 864e5;

function dayIndex(ms) {
  const p = arParts(ms);
  return Math.floor(Date.UTC(p.y, p.m - 1, p.d) / DAY);
}

// Overdue, today, or tomorrow. A missing or invalid date is not "due".
export function dueThroughTomorrow(iso, now = Date.now()) {
  if (!iso) return false;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return false;
  return dayIndex(ms) - dayIndex(now) <= 1;
}

// Hoy: due today/tomorrow (or overdue), waiting on her approval, stuck, or to revise.
// Manual tasks are her own work: they show up only when the date says so.
export function inHoy(it, now = Date.now()) {
  if (!it || CLOSED.includes(it.status)) return false;
  if (dueThroughTomorrow(it.fechaLimite, now)) return true;
  if (it.status === 'modificar' || it.status === 'verificar') return true;
  if (it.status === 'pendiente' && it.tipo !== 'tarea-manual') return true;
  return false;
}
