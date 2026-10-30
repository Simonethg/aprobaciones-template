import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const dir = await mkdtemp(path.join(tmpdir(), 'crm-metas-'));
const flag = path.join(dir, 'seed-flag.json');
process.env.CRM_METAS_DIR = path.join(dir, 'goals');
process.env.CRM_METAS_SEED_FLAG = flag;
delete process.env.TURSO_DATABASE_URL;
delete process.env.TURSO_AUTH_TOKEN;

const { SEED_GOALS, deleteGoal, getGoal, listGoals, saveGoal } = await import('./metas.js');

test.after(async () => {
  await rm(dir, { recursive: true, force: true });
});

test('the seed runs once and a deleted goal does not come back', async () => {
  const first = await listGoals();
  assert.equal(first.length, SEED_GOALS.length);
  const id = first[0].id;
  assert.equal(await deleteGoal(id), true);
  assert.equal(await getGoal(id), null);
  const second = await listGoals();
  assert.equal(second.length, SEED_GOALS.length - 1);
  assert.equal(second.some((g) => g.id === id), false);

  for (const goal of second) assert.equal(await deleteGoal(goal.id), true);
  const empty = await listGoals();
  assert.deepEqual(empty, []);
  assert.equal(await deleteGoal(id), false);
  assert.equal(await deleteGoal('no'), false);

  const fresh = await mkdtemp(path.join(tmpdir(), 'crm-metas-keep-'));
  process.env.CRM_METAS_DIR = path.join(fresh, 'goals');
  process.env.CRM_METAS_SEED_FLAG = path.join(fresh, 'seed-flag.json');
  try {
    await saveGoal({
      id: 'propia-meta',
      titulo: 'Propia',
      kind: 'percent',
      actual: 0,
      orden: 1,
    });
    const listed = await listGoals();
    assert.deepEqual(listed.map((g) => g.id), ['propia-meta']);
    assert.equal(await deleteGoal('propia-meta'), true);
    assert.deepEqual(await listGoals(), []);
  } finally {
    await rm(fresh, { recursive: true, force: true });
  }
});

test('delete targets metas/<id>.json and the flag is not read with get', () => {
  const src = readFileSync(new URL('./metas.js', import.meta.url), 'utf8');
  assert.match(src, /const PREFIX = 'metas\/'/);
  assert.match(src, /kvDelete\(PREFIX \+ id \+ '\.json'/);
  assert.match(src, /metas\/_seeded\.json/);
  assert.match(src, /!isSeedFlag\(row\.key\)/);
  assert.doesNotMatch(src, /\.get\(SEED_FLAG_KEY/);
  assert.doesNotMatch(src, /flags\/metas-seeded\.json/);
  assert.doesNotMatch(src, /@netlify\/blobs/);
});
