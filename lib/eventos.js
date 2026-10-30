// Decision events for bots. JSON only. Never stores media.
import { kvList, kvSet } from './kv.js';

const PREFIX = 'eventos/';
const ID_OK = /^[a-z0-9-]{6,64}$/i;
const DECISIONS = ['aprobar', 'modificar', 'rechazar'];

function opts() {
  return process.env.CRM_EVENTOS_DIR ? { dir: process.env.CRM_EVENTOS_DIR } : {};
}

export function decisionFromStatus(status) {
  if (status === 'aprobado') return 'aprobar';
  if (status === 'modificar') return 'modificar';
  if (status === 'rechazado') return 'rechazar';
  return null;
}

export async function appendEvento(input) {
  const decision = input?.decision;
  if (!DECISIONS.includes(decision)) throw new Error('Decisión inválida');
  if (!ID_OK.test(input?.itemId || '')) throw new Error('Ítem inválido');
  const at = input.at && !Number.isNaN(Date.parse(input.at)) ? new Date(input.at).toISOString() : new Date().toISOString();
  const ts = Date.parse(at);
  const evento = {
    id: `${ts}-${input.itemId}`,
    at,
    bot: String(input.bot || '').slice(0, 120),
    item: {
      id: input.itemId,
      titulo: String(input.titulo || '').slice(0, 300),
      proyecto: String(input.proyecto || '').slice(0, 120),
    },
    decision,
    nota: String(input.nota || '').slice(0, 10000),
  };
  await kvSet(PREFIX + evento.id + '.json', evento, opts());
  return evento;
}

async function readAll() {
  const rows = await kvList(PREFIX, opts());
  return rows.map((row) => row.value).filter(Boolean);
}

// `since` is exclusive: events strictly after that instant. Empty since returns the bot's whole log.
export async function listEventos({ bot, since } = {}) {
  const name = String(bot || '');
  const sinceMs = since ? Date.parse(since) : null;
  const rows = await readAll();
  return rows
    .filter((e) => e && e.bot === name)
    .filter((e) => sinceMs == null || Date.parse(e.at) > sinceMs)
    .sort((a, b) => String(a.at).localeCompare(String(b.at)) || String(a.id).localeCompare(String(b.id)));
}
