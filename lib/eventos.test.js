import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

const dir = await mkdtemp(path.join(tmpdir(), 'crm-eventos-'));
process.env.CRM_EVENTOS_DIR = dir;
delete process.env.TURSO_DATABASE_URL;
delete process.env.TURSO_AUTH_TOKEN;

const { appendEvento, decisionFromStatus, listEventos } = await import('./eventos.js');

test.after(async () => {
  await rm(dir, { recursive: true, force: true });
});

test('each bot reads its own decisions and since does not repeat the last one', async () => {
  assert.equal(decisionFromStatus('aprobado'), 'aprobar');
  assert.equal(decisionFromStatus('modificar'), 'modificar');
  assert.equal(decisionFromStatus('rechazado'), 'rechazar');
  assert.equal(decisionFromStatus('verificar'), null);

  await appendEvento({
    bot: 'Bot Demo',
    itemId: 'item-demo001',
    titulo: 'Draft 1',
    proyecto: 'Project A',
    decision: 'rechazar',
    nota: 'El cierre no cierra',
    at: '2026-10-15T12:00:00.000Z',
  });
  await appendEvento({
    bot: 'Otro',
    itemId: 'item-otro001',
    titulo: 'Mail',
    proyecto: 'Newsletter',
    decision: 'aprobar',
    nota: 'Va',
    at: '2026-10-15T13:00:00.000Z',
  });
  await appendEvento({
    bot: 'Bot Demo',
    itemId: 'item-demo002',
    titulo: 'Borrador 2',
    proyecto: 'Project A',
    decision: 'aprobar',
    nota: '',
    at: '2026-10-15T14:00:00.000Z',
  });

  const own = await listEventos({ bot: 'Bot Demo' });
  assert.deepEqual(own.map((e) => e.decision), ['rechazar', 'aprobar']);
  assert.equal(own[0].item.id, 'item-demo001');
  assert.equal(own[0].nota, 'El cierre no cierra');
  assert.equal(own[0].bot, 'Bot Demo');

  const after = await listEventos({ bot: 'Bot Demo', since: own[0].at });
  assert.deepEqual(after.map((e) => e.item.id), ['item-demo002']);
  assert.deepEqual(await listEventos({ bot: 'Nobody' }), []);
});

test('GET /api/eventos is bot-only and lists by prefix', () => {
  const route = readFileSync(new URL('../app/api/eventos/route.js', import.meta.url), 'utf8');
  const lib = readFileSync(new URL('./eventos.js', import.meta.url), 'utf8');
  assert.match(route, /!== 'bot'/);
  assert.match(route, /status: 401/);
  assert.match(route, /Missing "bot"/);
  assert.match(lib, /kvList\(PREFIX/);
  assert.match(lib, /eventos\//);
  assert.doesNotMatch(lib, /@netlify\/blobs/);
});
