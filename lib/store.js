// JSON documents only. Local files in development; Turso when configured.
// One document per item (items/<id>.json). Media is never stored: only text and links.
import { APPROVER_NAME } from './actor.js';
import { normalizeFechaLimite, sortByUrgency } from './deadline.js';
import { demoItems } from './demo-items.js';
import { kvGet, kvList, kvSet } from './kv.js';

const PREFIX = 'items/';
const SEED_KEY = 'items/_seeded.json';

export const STATUSES = ['pendiente', 'verificar', 'para-ops', 'modificar', 'aprobado', 'rechazado', 'hecho', 'descartado', 'archivado'];
// Closed states stay out of "todos" (All). The app shows them under Archived.
export const CLOSED = ['archivado', 'hecho', 'descartado'];
// Statuses the signed-in person can set from the app (PATCH with a session).
export const SESSION_STATUSES = ['pendiente', 'verificar', 'para-ops', 'modificar', 'aprobado', 'rechazado', 'hecho', 'descartado', 'archivado'];
export const TIPOS = ['guion', 'texto', 'video', 'audio', 'imagen', 'email', 'post', 'tarea', 'tarea-manual', 'otro'];

function itemsOpts() {
  return process.env.CRM_ITEMS_DIR ? { dir: process.env.CRM_ITEMS_DIR } : {};
}

function isSeedKey(key) {
  return key === SEED_KEY || key.endsWith('/_seeded.json') || key.endsWith('_seeded.json');
}

async function readAllRaw() {
  const rows = await kvList(PREFIX, itemsOpts());
  return rows.filter((row) => !isSeedKey(row.key)).map((row) => row.value).filter(Boolean);
}

async function ensureDemoItems() {
  const existing = await readAllRaw();
  if (existing.length) return;
  const flagged = await kvGet(SEED_KEY, itemsOpts());
  if (flagged?.seeded) return;
  for (const item of demoItems()) await saveItem(item);
  await kvSet(SEED_KEY, { seeded: true, at: new Date().toISOString() }, itemsOpts());
}

export async function getItem(id) {
  if (!/^[a-z0-9-]{6,64}$/i.test(id)) return null;
  const rows = await kvList(PREFIX, itemsOpts());
  const row = rows.find((item) => item.key === PREFIX + id + '.json' || item.key.endsWith('/' + id + '.json'));
  return row?.value || null;
}

export async function saveItem(item) {
  // Never overwrite a real item with an empty or invalid document.
  if (!item || !item.id || !item.titulo || !item.status) throw new Error('Invalid item: not saved');
  await kvSet(PREFIX + item.id + '.json', item, itemsOpts());
  return item;
}

function sortItems(all) {
  return [...all].sort((a, b) => String(a.fechaLlegada).localeCompare(String(b.fechaLlegada))); // oldest first
}

// Default queue ("todos" or no filter) hides archivado/hecho/descartado so the active list stays lean.
// Pass status "archivado" to read the archive. Every other status is an exact match.
export function selectItems(all, status) {
  const items = sortItems(all);
  if (!status || status === 'todos') return items.filter((i) => !CLOSED.includes(i.status));
  const out = items.filter((i) => i.status === status);
  return status === 'pendiente' ? sortByUrgency(out) : out;
}

export async function listAllItems() {
  await ensureDemoItems();
  return sortItems(await readAllRaw());
}

export async function listItems(status) {
  await ensureDemoItems();
  return selectItems(await readAllRaw(), status);
}

function httpError(message, status) {
  const e = new Error(message);
  e.status = status;
  return e;
}

const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Steps of a manual task: an array of strings, or one string with a step per line.
function cleanPasos(v) {
  if (typeof v === 'string') v = v.split(/\r?\n/);
  if (!Array.isArray(v)) return undefined;
  return v.map((x) => clean(typeof x === 'string' ? x : '', 2000).replace(/^\d+[.)]\s+/, '')).filter(Boolean).slice(0, 50);
}

export function newItemFromInput(input) {
  const titulo = clean(input.titulo, 300);
  if (!titulo) throw new Error('Missing "titulo"');
  let tipo = clean(input.tipo, 20).toLowerCase();
  if (!TIPOS.includes(tipo)) tipo = 'otro';
  const now = new Date().toISOString();
  let fecha = now;
  if (input.fechaLlegada && !isNaN(Date.parse(input.fechaLlegada))) fecha = new Date(input.fechaLlegada).toISOString();
  const link = clean(input.link, 2000);
  if (link && !/^https?:\/\//i.test(link)) throw new Error('"link" must start with http:// or https://');
  const fechaLimite = normalizeFechaLimite(input.fechaLimite);
  const id = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
  const fromUi = input.origen === 'ui';
  const bot = clean(input.bot, 120) || (fromUi ? APPROVER_NAME : 'unknown');
  return {
    id, titulo, tipo,
    bot,
    proyecto: clean(input.proyecto, 120),
    fechaLlegada: fecha,
    fechaLimite,
    link,
    resumen: clean(input.resumen, 4000),
    contenido: clean(input.contenido, 100000),
    ...(cleanPasos(input.pasos)?.length ? { pasos: cleanPasos(input.pasos) } : {}),
    status: 'pendiente',
    nota: '',
    updatedAt: now,
    history: [{ status: 'pendiente', at: now, por: fromUi ? APPROVER_NAME : 'bot:' + bot, nota: fromUi ? 'Created in the app' : 'Received' }],
  };
}

export function applyStatus(item, status, nota, por) {
  if (!SESSION_STATUSES.includes(status)) throw new Error('Invalid status');
  const n = clean(nota, 10000);
  if (status === 'modificar' && !n) throw new Error('Write what needs to change');
  if (status === 'rechazado' && !n) throw new Error('Write the reason for rejection');
  const now = new Date().toISOString();
  item.status = status;
  // Keep nota for modificar/rechazado/archivado so the reason stays visible in the UI and via GET.
  item.nota = (status === 'modificar' || status === 'rechazado' || status === 'archivado') ? n : (n || '');
  item.updatedAt = now;
  if (status !== 'pendiente') delete item.noDecidido;
  // Optional comment when approving or marking done. Bots read it back as item.respuesta.
  if ((status === 'aprobado' || status === 'hecho') && n) { item.respuesta = n; item.respuestaAt = now; }
  item.history = [...(item.history || []), { status, at: now, por, nota: n || (status === 'verificar' ? APPROVER_NAME + ' thinks this was already decided. Ops will check the conversation history' : '') }];
  return item;
}

// Changes only the deadline, not the status. v: ISO 8601, or null/'' to clear it.
export function applyFechaLimite(item, v, por) {
  const f = normalizeFechaLimite(v);
  if ((item.fechaLimite || null) === f) return item;
  const now = new Date().toISOString();
  item.fechaLimite = f;
  item.updatedAt = now;
  item.history = [...(item.history || []), { status: item.status, at: now, por, nota: f ? 'Deadline: ' + f : 'Deadline removed' }];
  return item;
}

// Ops (bot) confirms it was already decided and archives the item. A note is required.
export function applyArchivar(item, nota, por) {
  const n = clean(nota, 10000);
  if (!n) throw new Error('Missing "nota" (for example: "Decided on 10/10: ...")');
  if (item.status === 'archivado') throw new Error('The item is already archived');
  const now = new Date().toISOString();
  item.status = 'archivado';
  item.nota = n;
  delete item.noDecidido;
  item.updatedAt = now;
  item.history = [...(item.history || []), { status: 'archivado', at: now, por, nota: n }];
  return item;
}

// Ops (bot) checked and it was not decided: back to pending with a red banner. Only from "verificar".
export function applyNoDecidido(item, nota, por) {
  const n = clean(nota, 10000);
  if (!n) throw new Error('Missing "nota"');
  if (item.status !== 'verificar') throw new Error('This only works on items in "verificar" (current status: ' + item.status + ')');
  const now = new Date().toISOString();
  item.status = 'pendiente';
  item.nota = n;
  item.noDecidido = { nota: n, at: now, por };
  item.updatedAt = now;
  item.history = [...(item.history || []), { status: 'pendiente', at: now, por, nota: 'Not decided: ' + n }];
  return item;
}

// The bot resubmits a revised version: fields are updated and the status goes back to "pendiente".
export function applyResubmit(item, input) {
  const CONTENT = ['titulo', 'resumen', 'contenido', 'link', 'proyecto', 'tipo'];
  const hasFecha = Object.prototype.hasOwnProperty.call(input, 'fechaLimite');
  // Deadline-only change: not a resubmit, and the status stays.
  if (hasFecha && !input.status && !input.pasos && !CONTENT.some((k) => typeof input[k] === 'string')) return applyFechaLimite(item, input.fechaLimite, 'bot:' + item.bot);
  if (hasFecha) item.fechaLimite = normalizeFechaLimite(input.fechaLimite);
  const pasos = cleanPasos(input.pasos);
  if (pasos) item.pasos = pasos;
  // Ops answers a "para-ops" task: status "hecho" (done) or "pendiente" (back to the approver), with a note.
  if (typeof input.status === 'string' && input.status) {
    if (item.status !== 'para-ops') throw httpError('"status" on PUT is only accepted for items in "para-ops" (current status: ' + item.status + ')', 409);
    if (!['hecho', 'pendiente'].includes(input.status)) throw httpError('With "para-ops", "status" must be "hecho" or "pendiente"', 400);
    const n = clean(input.nota, 10000);
    if (!n) throw httpError('Missing "nota": say what you did or what you found', 400);
    const now = new Date().toISOString();
    item.status = input.status;
    item.nota = n;
    item.opsRespuesta = { nota: n, at: now };
    item.updatedAt = now;
    item.history = [...(item.history || []), { status: input.status, at: now, por: 'ops', nota: 'Ops reply: ' + n }];
    return item;
  }
  for (const k of ['titulo', 'resumen', 'contenido', 'link', 'proyecto']) {
    if (typeof input[k] === 'string') item[k] = clean(input[k], k === 'contenido' ? 100000 : 4000);
  }
  if (item.link && !/^https?:\/\//i.test(item.link)) throw new Error('"link" must start with http:// or https://');
  if (typeof input.tipo === 'string' && TIPOS.includes(input.tipo.toLowerCase())) item.tipo = input.tipo.toLowerCase();
  const now = new Date().toISOString();
  item.status = 'pendiente';
  delete item.noDecidido;
  item.updatedAt = now;
  item.history = [...(item.history || []), { status: 'pendiente', at: now, por: 'bot:' + item.bot, nota: clean(input.nota, 4000) || 'Resubmitted with changes' }];
  return item;
}

function archiveNote(input) {
  if (typeof input.nota === 'string') return clean(input.nota, 10000);
  if (typeof input.reason === 'string') return clean(input.reason, 10000);
  return '';
}

// Bot archive. The shared BOT_API_TOKEN does not identify the caller, so `bot`
// is required and must match item.bot (same cleaning rules as create).
// Optional reason is stored on item.nota and in history. Does not delete the item.
// Repeat calls with the same note are a no-op. Returns { changed }.
export function applyArchive(item, input) {
  const body = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const bot = clean(body.bot, 120);
  if (!bot) {
    throw httpError('Missing "bot". The token does not name the bot, so send the same name the item was created with.', 400);
  }
  if (bot !== item.bot) {
    throw httpError('You can only archive items from your own bot.', 403);
  }
  const nota = archiveNote(body);
  if (item.status === 'archivado' && (!nota || nota === (item.nota || ''))) {
    return { changed: false };
  }
  const now = new Date().toISOString();
  item.status = 'archivado';
  item.nota = nota;
  item.updatedAt = now;
  item.history = [...(item.history || []), {
    status: 'archivado',
    at: now,
    por: 'bot:' + bot,
    nota: nota || 'Archived',
  }];
  return { changed: true };
}
