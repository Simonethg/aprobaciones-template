import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { APPROVER_NAME } from './actor.js';
import {
  STATUSES,
  applyArchive,
  applyArchivar,
  applyNoDecidido,
  applyResubmit,
  applyStatus,
  newItemFromInput,
  selectItems,
} from './store.js';

function sample(overrides = {}) {
  return {
    id: 'abc12345',
    titulo: 'Script',
    tipo: 'guion',
    bot: 'bot-alfa',
    proyecto: 'Campaign',
    fechaLlegada: '2026-01-01T00:00:00.000Z',
    link: '',
    resumen: '',
    contenido: 'original text',
    status: 'aprobado',
    nota: '',
    updatedAt: '2026-01-01T00:00:00.000Z',
    history: [{ status: 'pendiente', at: '2026-01-01T00:00:00.000Z', por: 'bot:bot-alfa', nota: 'Received' }],
    ...overrides,
  };
}

test('statuses keep the original four plus verificar, para-ops, hecho, descartado and archivado', () => {
  for (const s of ['pendiente', 'modificar', 'aprobado', 'rechazado', 'archivado', 'verificar', 'para-ops', 'hecho', 'descartado']) assert.ok(STATUSES.includes(s), s);
});

test('fechaLimite is normalized to Argentina time and pendientes sort by urgency', () => {
  const a = newItemFromInput({ titulo: 'A', fechaLimite: '2026-10-13T06:59:00Z' });
  assert.equal(a.fechaLimite, '2026-10-13T03:59:00-03:00');
  const b = newItemFromInput({ titulo: 'B', fechaLimite: '2026-10-11T23:59' });
  assert.equal(b.fechaLimite, '2026-10-11T23:59:00-03:00');
  assert.throws(() => newItemFromInput({ titulo: 'C', fechaLimite: '2026-10-11' }), /date and a time/);
  const all = [
    { id: 'sin', fechaLlegada: '2026-01-01', status: 'pendiente' },
    { id: 'tarde', fechaLlegada: '2026-03-01', status: 'pendiente', fechaLimite: a.fechaLimite },
    { id: 'pronto', fechaLlegada: '2026-04-01', status: 'pendiente', fechaLimite: b.fechaLimite },
  ];
  assert.deepEqual(selectItems(all, 'pendiente').map((i) => i.id), ['pronto', 'tarde', 'sin']);
});

test('verificar -> no-decidido returns to pendiente with a banner; archivar needs a note', () => {
  const item = sample({ status: 'pendiente' });
  applyStatus(item, 'verificar', '', APPROVER_NAME);
  assert.equal(item.status, 'verificar');
  applyNoDecidido(item, 'No hay mensajes sobre esto', 'ops');
  assert.equal(item.status, 'pendiente');
  assert.equal(item.noDecidido.nota, 'No hay mensajes sobre esto');
  assert.throws(() => applyNoDecidido(item, 'x', 'ops'), /verificar/);
  assert.throws(() => applyArchivar(item, '', 'ops'), /nota/);
  applyArchivar(item, 'Decidido el 10/10: va', 'ops');
  assert.equal(item.status, 'archivado');
  assert.equal(item.noDecidido, undefined);
});

test('PUT with only fechaLimite keeps the status; para-ops accepts a status answer from Ops', () => {
  const item = sample({ status: 'aprobado' });
  applyResubmit(item, { fechaLimite: '2026-10-12T02:30:00-03:00' });
  assert.equal(item.status, 'aprobado');
  assert.equal(item.fechaLimite, '2026-10-12T02:30:00-03:00');
  assert.throws(() => applyResubmit(item, { status: 'hecho', nota: 'x' }), (e) => e.status === 409);
  const t = newItemFromInput({ titulo: 'T', tipo: 'tarea-manual', pasos: ['1. uno', 'dos'] });
  assert.deepEqual(t.pasos, ['uno', 'dos']);
  applyStatus(t, 'para-ops', '', APPROVER_NAME);
  assert.throws(() => applyResubmit(t, { status: 'hecho' }), /nota/);
  const q = sample({ status: 'pendiente' });
  applyStatus(q, 'aprobado', 'Yes, use version B', APPROVER_NAME);
  assert.equal(q.respuesta, 'Yes, use version B');
  applyResubmit(t, { status: 'hecho', nota: 'Resuelto' });
  assert.equal(t.status, 'hecho');
  assert.equal(t.opsRespuesta.nota, 'Resuelto');
});

test('new items are still created as pendiente', () => {
  const item = newItemFromInput({ titulo: 'Hola', bot: ' bot-alfa ', tipo: 'guion' });
  assert.equal(item.status, 'pendiente');
  assert.equal(item.bot, 'bot-alfa');
  assert.equal(item.nota, '');
});

test('items created from the UI are attributed to the approver and start pending', () => {
  const item = newItemFromInput({ titulo: 'Anotar', tipo: 'tarea-manual', origen: 'ui', pasos: 'uno' });
  assert.equal(item.status, 'pendiente');
  assert.equal(item.bot, APPROVER_NAME);
  assert.equal(item.history[0].por, APPROVER_NAME);
  assert.equal(item.history[0].nota, 'Created in the app');
  assert.deepEqual(item.pasos, ['uno']);
});

test('archive stores the note, keeps history, and ignores other status fields', () => {
  const item = sample();
  const { changed } = applyArchive(item, { bot: 'bot-alfa', nota: 'Already approved in chat', status: 'aprobado' });
  assert.equal(changed, true);
  assert.equal(item.status, 'archivado');
  assert.equal(item.nota, 'Already approved in chat');
  assert.equal(item.contenido, 'original text');
  assert.equal(item.history.length, 2);
  assert.equal(item.history[0].status, 'pendiente');
  assert.equal(item.history[1].status, 'archivado');
  assert.equal(item.history[1].por, 'bot:bot-alfa');
  assert.equal(item.history[1].nota, 'Already approved in chat');
});

test('reason is an alias of nota, and nota wins when both are sent', () => {
  const withReason = sample();
  applyArchive(withReason, { bot: 'bot-alfa', reason: 'replaced by a newer version' });
  assert.equal(withReason.nota, 'replaced by a newer version');

  const both = sample();
  applyArchive(both, { bot: 'bot-alfa', nota: 'la nota', reason: 'el reason' });
  assert.equal(both.nota, 'la nota');
});

test('archive without a note is allowed and a repeat call does not duplicate history', () => {
  const item = sample({ status: 'pendiente' });
  const first = applyArchive(item, { bot: '  bot-alfa  ' });
  assert.equal(first.changed, true);
  assert.equal(item.status, 'archivado');
  assert.equal(item.nota, '');
  assert.equal(item.history.at(-1).nota, 'Archived');
  const again = applyArchive(item, { bot: 'bot-alfa' });
  assert.equal(again.changed, false);
  assert.equal(item.history.length, 2);
});

test('a later note updates an archived item; the same note does not', () => {
  const item = sample();
  applyArchive(item, { bot: 'bot-alfa', nota: 'v1' });
  const same = applyArchive(item, { bot: 'bot-alfa', nota: 'v1' });
  assert.equal(same.changed, false);
  assert.equal(item.history.length, 2);
  const next = applyArchive(item, { bot: 'bot-alfa', reason: 'v2' });
  assert.equal(next.changed, true);
  assert.equal(item.nota, 'v2');
  assert.equal(item.history.length, 3);
});

test('a bot cannot archive another bot item and must send its name', () => {
  const item = sample();
  assert.throws(() => applyArchive(item, { nota: 'x' }), (err) => err.status === 400);
  assert.throws(() => applyArchive(item, { bot: 'bot-beta', nota: 'x' }), (err) => err.status === 403);
  assert.equal(item.status, 'aprobado');
  assert.equal(item.contenido, 'original text');
});

test('bot name match uses the same 120-char cleaning as create', () => {
  const long = 'b'.repeat(130);
  const item = newItemFromInput({ titulo: 'Largo', bot: long });
  assert.equal(item.bot, 'b'.repeat(120));
  const { changed } = applyArchive(item, { bot: long, nota: 'done' });
  assert.equal(changed, true);
  assert.equal(item.status, 'archivado');
});

test('session can unarchive to pendiente; reject and modify still require a note', () => {
  const item = sample();
  applyStatus(item, 'archivado', 'saved', APPROVER_NAME);
  assert.equal(item.status, 'archivado');
  assert.equal(item.nota, 'saved');
  applyStatus(item, 'pendiente', '', APPROVER_NAME);
  assert.equal(item.status, 'pendiente');
  assert.equal(item.nota, '');
  assert.throws(() => applyStatus(item, 'rechazado', '   ', APPROVER_NAME), /reason for rejection/);
  assert.throws(() => applyStatus(item, 'modificar', '', APPROVER_NAME), /what needs to change/);
  assert.equal(item.status, 'pendiente');
  applyStatus(item, 'aprobado', '', APPROVER_NAME);
  assert.equal(item.status, 'aprobado');
});

test('PUT resubmit still resets any status, including archivado, to pendiente', () => {
  const item = sample({ status: 'archivado', nota: 'viejo' });
  applyResubmit(item, { nota: 'new version', titulo: 'Script 2' });
  assert.equal(item.status, 'pendiente');
  assert.equal(item.titulo, 'Script 2');
  assert.equal(item.history.at(-1).status, 'pendiente');
});

test('default views hide archived items; the archivado filter shows only them', () => {
  const all = [
    { id: 'old', fechaLlegada: '2026-01-01', status: 'archivado' },
    { id: 'mid', fechaLlegada: '2026-02-01', status: 'pendiente' },
    { id: 'new', fechaLlegada: '2026-03-01', status: 'aprobado' },
    { id: 'mod', fechaLlegada: '2026-01-15', status: 'modificar' },
    { id: 'hecho', fechaLlegada: '2026-01-16', status: 'hecho' },
  ];
  assert.deepEqual(selectItems(all, 'todos').map((i) => i.id), ['mod', 'mid', 'new']);
  assert.deepEqual(selectItems(all, undefined).map((i) => i.id), ['mod', 'mid', 'new']);
  assert.deepEqual(selectItems(all, 'pendiente').map((i) => i.id), ['mid']);
  assert.deepEqual(selectItems(all, 'archivado').map((i) => i.id), ['old']);
  assert.deepEqual(selectItems(all, 'aprobado').map((i) => i.id), ['new']);
});

test('archive route is bot-only and there is still no delete', () => {
  const archive = readFileSync(new URL('../app/api/items/[id]/archive/route.js', import.meta.url), 'utf8');
  const patch = readFileSync(new URL('../app/api/items/[id]/route.js', import.meta.url), 'utf8');
  assert.match(archive, /whoIs\(\)\) !== 'bot'/);
  assert.match(archive, /applyArchive/);
  assert.doesNotMatch(archive, /export async function DELETE/);
  assert.match(patch, /whoIs\(\)\) !== 'session'/);
  assert.match(patch, /applyStatus/);
  assert.doesNotMatch(patch, /export async function DELETE/);
  assert.match(patch, /applyResubmit/);
});
