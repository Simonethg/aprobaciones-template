import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { goalPace } from './metas-model.js';

const now = Date.parse('2026-10-15T12:00:00-03:00');

test('el ritmo usa la fecha y no inventa un total', () => {
  const goal = { kind: 'ratio', unidad: 'clases', actual: 2, total: 10, fechaLimite: '2026-10-21' };
  assert.equal(goalPace(goal, now), 'faltan 8 clases en 6 días: 1,3 por día');
  assert.equal(goalPace({ ...goal, fechaLimite: null }, now), null);
  assert.equal(goalPace({ ...goal, total: 0 }, now), null);
  assert.equal(goalPace({ ...goal, actual: 10 }, now), null);
  assert.equal(goalPace({ ...goal, fechaLimite: '2026-10-15' }, now), 'faltan 8 clases hoy');
  assert.equal(goalPace({ ...goal, fechaLimite: '2026-10-14' }, now), 'fecha vencida: faltan 8 clases');
  assert.equal(
    goalPace({ kind: 'money', unidad: 'USD', actual: 1000, meta: 5000, fechaLimite: '2026-10-16' }, now),
    'faltan 4000 USD en 1 día: 4000 por día',
  );
});

test('la tarjeta deja la fecha límite editable', () => {
  const ui = readFileSync(new URL('../app/Goals.js', import.meta.url), 'utf8');
  const dict = readFileSync(new URL('./i18n.js', import.meta.url), 'utf8');
  assert.match(ui, /data-testid="goal-fecha"/);
  assert.match(ui, /data-testid="goal-pace"/);
  assert.match(ui, /sin fuente conectada/);
  assert.match(ui, /data-testid="goals-sync"/);
  assert.match(dict, /Fecha límite \(opcional\)/);
  assert.match(dict, /Optional deadline/);
  assert.match(dict, /Actualizar/);
  assert.match(dict, /Refresh/);
});
