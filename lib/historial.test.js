import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { APPROVER_NAME } from './actor.js';
import { historialDeProyecto } from './historial.js';

test('el historial de un proyecto trae las decisiones de quien aprueba en orden', () => {
  const items = [
    {
      id: 'bbbbbbbb',
      titulo: 'Borrador 2',
      bot: 'Bot Demo',
      proyecto: 'Proyecto A',
      history: [
        { status: 'pendiente', at: '2026-10-02T10:00:00.000Z', por: 'bot:Bot Demo', nota: 'Recibido' },
        { status: 'rechazado', at: '2026-10-03T10:00:00.000Z', por: APPROVER_NAME, nota: 'Muy largo' },
      ],
    },
    {
      id: 'aaaaaaaa',
      titulo: 'Borrador 1',
      bot: 'Bot Demo',
      proyecto: 'proyecto a',
      history: [
        { status: 'aprobado', at: '2026-10-01T10:00:00.000Z', por: APPROVER_NAME, nota: 'Lista' },
      ],
    },
    {
      id: 'cccccccc',
      titulo: 'Otro',
      bot: 'X',
      proyecto: 'Newsletter',
      history: [
        { status: 'rechazado', at: '2026-10-01T11:00:00.000Z', por: APPROVER_NAME, nota: 'No' },
      ],
    },
  ];
  const rows = historialDeProyecto(items, 'Proyecto A');
  assert.deepEqual(rows.map((r) => r.decision), ['aprobado', 'rechazado']);
  assert.equal(rows[0].nota, 'Lista');
  assert.equal(rows[1].nota, 'Muy largo');
  assert.equal(rows[1].bot, 'Bot Demo');
  assert.equal(historialDeProyecto(items, '   ').length, 0);
});

test('GET /api/historial exige auth', () => {
  const src = readFileSync(new URL('../app/api/historial/route.js', import.meta.url), 'utf8');
  assert.match(src, /status: 401/);
  assert.match(src, /if \(!\(await whoIs\(\)\)\) return unauthorized\(\)/);
  assert.match(src, /Falta "proyecto"/);
});
