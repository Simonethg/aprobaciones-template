import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { APPROVER_NAME } from './actor.js';
import { historialDeProyecto } from './historial.js';

test('project history returns the approver decisions in order', () => {
  const items = [
    {
      id: 'bbbbbbbb',
      titulo: 'Draft 2',
      bot: 'Bot Demo',
      proyecto: 'Project A',
      history: [
        { status: 'pendiente', at: '2026-10-02T10:00:00.000Z', por: 'bot:Bot Demo', nota: 'Received' },
        { status: 'rechazado', at: '2026-10-03T10:00:00.000Z', por: APPROVER_NAME, nota: 'Too long' },
      ],
    },
    {
      id: 'aaaaaaaa',
      titulo: 'Draft 1',
      bot: 'Bot Demo',
      proyecto: 'project a',
      history: [
        { status: 'aprobado', at: '2026-10-01T10:00:00.000Z', por: APPROVER_NAME, nota: 'Ready' },
      ],
    },
    {
      id: 'cccccccc',
      titulo: 'Other',
      bot: 'X',
      proyecto: 'Newsletter',
      history: [
        { status: 'rechazado', at: '2026-10-01T11:00:00.000Z', por: APPROVER_NAME, nota: 'No' },
      ],
    },
  ];
  const rows = historialDeProyecto(items, 'Project A');
  assert.deepEqual(rows.map((r) => r.decision), ['aprobado', 'rechazado']);
  assert.equal(rows[0].nota, 'Ready');
  assert.equal(rows[1].nota, 'Too long');
  assert.equal(rows[1].bot, 'Bot Demo');
  assert.equal(historialDeProyecto(items, '   ').length, 0);
});

test('GET /api/historial requires auth', () => {
  const src = readFileSync(new URL('../app/api/historial/route.js', import.meta.url), 'utf8');
  assert.match(src, /status: 401/);
  assert.match(src, /if \(!\(await whoIs\(\)\)\) return unauthorized\(\)/);
  assert.match(src, /Missing "proyecto"/);
});
