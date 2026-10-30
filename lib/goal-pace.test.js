import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { goalPace } from './metas-model.js';

const now = Date.parse('2026-10-15T12:00:00-03:00');

test('pace uses the deadline and does not invent a total', () => {
  const goal = { kind: 'ratio', unidad: 'classes', actual: 2, total: 10, fechaLimite: '2026-10-21' };
  assert.equal(goalPace(goal, now), '8 classes left in 6 days: 1.3 per day');
  assert.equal(goalPace({ ...goal, unidad: 'clases' }, now, 'es'), 'faltan 8 clases en 6 días: 1,3 por día');
  assert.equal(goalPace({ ...goal, fechaLimite: null }, now), null);
  assert.equal(goalPace({ ...goal, total: 0 }, now), null);
  assert.equal(goalPace({ ...goal, actual: 10 }, now), null);
  assert.equal(goalPace({ ...goal, fechaLimite: '2026-10-15' }, now), '8 classes left today');
  assert.equal(goalPace({ ...goal, fechaLimite: '2026-10-14' }, now), 'overdue: 8 classes left');
  assert.equal(
    goalPace({ kind: 'money', unidad: 'USD', actual: 1000, meta: 5000, fechaLimite: '2026-10-16' }, now),
    '4000 USD left in 1 day: 4000 per day',
  );
});

test('the goal card keeps the deadline editable', () => {
  const ui = readFileSync(new URL('../app/Goals.js', import.meta.url), 'utf8');
  const dict = readFileSync(new URL('./i18n.js', import.meta.url), 'utf8');
  assert.match(ui, /data-testid="goal-fecha"/);
  assert.match(ui, /data-testid="goal-pace"/);
  assert.match(ui, /no source connected/);
  assert.match(ui, /data-testid="goals-sync"/);
  assert.match(dict, /Fecha límite \(opcional\)/);
  assert.match(dict, /Optional deadline/);
  assert.match(dict, /Actualizar/);
  assert.match(dict, /Refresh/);
});
