import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  SEED_GOALS,
  applyGoalUpdate,
  goalCaption,
  inGoalView,
  isGoalDone,
  markerPercent,
  newGoalFromInput,
  progressPercent,
} from './metas.js';

test('starter goals start at 0 and do not invent sales', () => {
  assert.equal(SEED_GOALS.length, 3);
  for (const g of SEED_GOALS) {
    assert.equal(g.actual, 0, g.id);
    assert.equal(g.percent, 0, g.id);
    assert.equal(progressPercent(g), 0, g.id);
    assert.equal(isGoalDone(g), false, g.id);
  }
  const videos = SEED_GOALS.find((g) => g.id === 'videos-aprobados');
  assert.equal(videos.total, 0);
  assert.equal(videos.kind, 'ratio');
  const catalogo = SEED_GOALS.find((g) => g.id === 'ventas-catalogo');
  assert.equal(catalogo.meta, 0);
  assert.match(goalCaption(catalogo), /USD 0/);
  const tienda = SEED_GOALS.find((g) => g.id === 'ventas-tienda');
  assert.equal(tienda.actual, 0);
  assert.equal(tienda.minimo, 100);
  assert.equal(tienda.meta, 500);
  assert.equal(markerPercent(tienda), 20);
});

test('editing a goal changes progress and a new goal starts at 0', () => {
  const videos = { ...SEED_GOALS.find((g) => g.id === 'videos-aprobados') };
  applyGoalUpdate(videos, { actual: 4, total: 10 });
  assert.equal(progressPercent(videos), 40);
  assert.equal(inGoalView(videos, 'curso'), true);
  applyGoalUpdate(videos, { actual: 10 });
  assert.equal(isGoalDone(videos), true);
  assert.equal(inGoalView(videos, 'cumplidas'), true);
  applyGoalUpdate(videos, { actual: -3 });
  assert.equal(videos.actual, 0);

  const created = newGoalFromInput({ titulo: 'Another', kind: 'money', actual: 999, meta: 100, unidad: 'USD' });
  assert.equal(created.actual, 0);
  assert.equal(created.percent, 0);
  assert.equal(created.meta, 100);
  assert.throws(() => newGoalFromInput({ titulo: '   ' }), /Missing title/);
});

test('the shop goal shows amount and percent separately', () => {
  const tienda = { ...SEED_GOALS.find((g) => g.id === 'ventas-tienda') };
  applyGoalUpdate(tienda, { actual: 150, percent: 20 });
  assert.equal(progressPercent(tienda), 30);
  assert.match(goalCaption(tienda), /150/);
  assert.match(goalCaption(tienda), /20%/);
  assert.equal(markerPercent(tienda), 20);
});

test('goal POST, PATCH and DELETE accept a session or bot token and return 401 without auth', () => {
  const list = readFileSync(new URL('../app/api/metas/route.js', import.meta.url), 'utf8');
  const patch = readFileSync(new URL('../app/api/metas/[id]/route.js', import.meta.url), 'utf8');
  const ui = readFileSync(new URL('../app/Goals.js', import.meta.url), 'utf8');
  const dict = readFileSync(new URL('./i18n.js', import.meta.url), 'utf8');
  const post = list.slice(list.indexOf('export async function POST'));
  const del = patch.slice(patch.indexOf('export async function DELETE'));
  const guard = /if \(!\(await whoIs\(\)\)\) return unauthorized\(\)/;
  assert.match(list, /status: 401/);
  assert.match(post, guard);
  assert.doesNotMatch(post, /!== 'session'/);
  assert.match(patch, guard);
  assert.match(patch, /status: 401/);
  assert.doesNotMatch(patch, /!== 'session'/);
  assert.match(del, guard);
  assert.match(del, /deleteGoal/);
  assert.match(del, /status: 404/);
  assert.match(ui, /aria-label=\{t\('goal\.delete'\)\}/);
  assert.match(ui, /goal\.deleteConfirm/);
  assert.match(dict, /Borrar meta/);
  assert.match(dict, /Delete goal/);
  assert.match(dict, /¿Borrar esta meta\?/);
  assert.match(dict, /Delete this goal\?/);
  assert.match(ui, /method: 'DELETE'/);
});
