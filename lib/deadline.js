// Fechas límite (fechaLimite). Argentina es UTC-3 fijo (sin horario de verano).
export const AR_OFFSET_MIN = -180;
const pad = (n) => String(n).padStart(2, '0');

// Partes de la fecha en hora argentina.
export function arParts(ms) {
  const d = new Date(ms + AR_OFFSET_MIN * 60000);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes() };
}

// ms -> "2026-10-11T23:59:00-03:00"
export function toArIso(ms) {
  const p = arParts(ms);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}:00-03:00`;
}

// Acepta ISO 8601 con hora (con o sin zona; sin zona = hora argentina). null/'' = sin fecha.
export function normalizeFechaLimite(v) {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string') throw new Error('"fechaLimite" debe ser texto ISO 8601, ej. 2026-10-11T23:59:00-03:00');
  const s = v.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) throw new Error('"fechaLimite" debe incluir fecha y hora, ej. 2026-10-11T23:59:00-03:00');
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(s);
  const ms = Date.parse(hasZone ? s : s + (s.length === 16 ? ':00' : '') + '-03:00');
  if (isNaN(ms)) throw new Error('"fechaLimite" inválida');
  return toArIso(ms);
}

// "datetime-local" (YYYY-MM-DDTHH:mm, hora AR) <-> ISO
export const toLocalInput = (iso) => (iso ? toArIso(Date.parse(iso)).slice(0, 16) : '');

// Pendientes: primero los que tienen fechaLimite (la más próxima primero), luego por llegada.
export function sortByUrgency(items) {
  return [...items].sort((a, b) => {
    const fa = a.fechaLimite ? Date.parse(a.fechaLimite) : NaN;
    const fb = b.fechaLimite ? Date.parse(b.fechaLimite) : NaN;
    if (!isNaN(fa) && !isNaN(fb) && fa !== fb) return fa - fb;
    if (!isNaN(fa) && isNaN(fb)) return -1;
    if (isNaN(fa) && !isNaN(fb)) return 1;
    return String(a.fechaLlegada).localeCompare(String(b.fechaLlegada));
  });
}

const DAY = 864e5;
function dayIndex(ms) { const p = arParts(ms); return Math.floor(Date.UTC(p.y, p.m - 1, p.d) / DAY); }

function relative(diff, locale) {
  const a = Math.abs(diff);
  const en = locale === 'en';
  let t;
  if (a < 60000) t = en ? 'less than 1 min' : 'menos de 1 min';
  else if (a < 3600000) t = `${Math.round(a / 60000)} min`;
  else if (a < 2 * DAY) t = `${Math.round(a / 3600000)} h`;
  else t = en ? `${Math.round(a / DAY)} days` : `${Math.round(a / DAY)} días`;
  if (en) return diff >= 0 ? `in ${t}` : `${t} ago`;
  return diff >= 0 ? `en ${t}` : `hace ${t}`;
}

// { level: 'rojo'|'naranja'|'gris', label: 'Vence hoy 23:59', rel: 'en 5 h' }
// locale defaults to Spanish so existing callers keep the original wording.
export function deadlineInfo(iso, now = Date.now(), locale = 'es') {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (isNaN(ms)) return null;
  const diff = ms - now;
  const p = arParts(ms);
  const hhmm = `${pad(p.h)}:${pad(p.mi)}`;
  const dd = dayIndex(ms) - dayIndex(now);
  const en = locale === 'en';
  const when = dd === 0 ? `${en ? 'today' : 'hoy'} ${hhmm}` : dd === 1 ? `${en ? 'tomorrow' : 'mañana'} ${hhmm}` : dd === -1 ? `${en ? 'yesterday' : 'ayer'} ${hhmm}` : `${pad(p.d)}/${pad(p.m)} ${hhmm}`;
  const level = diff <= DAY ? 'rojo' : diff <= 3 * DAY ? 'naranja' : 'gris';
  const label = diff < 0
    ? (en ? `Overdue (${when})` : `Vencido (${when})`)
    : (en ? `Due ${when}` : `Vence ${when}`);
  return { level, overdue: diff < 0, label, rel: relative(diff, locale) };
}
