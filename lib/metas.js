// Goal persistence. JSON only (Turso in production, local files in development).
// Media files are never stored.
import { promises as fs } from 'fs';
import path from 'path';
import { kvDelete, kvList, kvSet, remoteEnabled } from './kv.js';
import { GOAL_ID, KINDS, SEED_GOALS } from './metas-model.js';

export {
  KINDS,
  GOAL_ID,
  SEED_GOALS,
  progressRatio,
  progressPercent,
  markerPercent,
  goalPace,
  daysUntilGoal,
  normalizeGoalDate,
  isGoalDone,
  inGoalView,
  goalCaption,
  newGoalFromInput,
  applyGoalUpdate,
} from './metas-model.js';

const PREFIX = 'metas/';
// Stored under the same prefix as goals so one list sees it. It is not a goal.
const SEED_FLAG_KEY = 'metas/_seeded.json';
const SEED_FLAG_FILE = '_seeded.json';

function metasOpts() {
  return process.env.CRM_METAS_DIR ? { dir: process.env.CRM_METAS_DIR } : {};
}

function isSeedFlag(key) {
  return key === SEED_FLAG_KEY || key.endsWith('/' + SEED_FLAG_FILE) || key.endsWith(SEED_FLAG_FILE);
}

async function readLocalSeedFlag() {
  if (remoteEnabled()) return false;
  const file = process.env.CRM_METAS_SEED_FLAG;
  if (!file) return false;
  try {
    const value = JSON.parse(await fs.readFile(file, 'utf8'));
    return !!(value && value.seeded);
  } catch {
    return false;
  }
}

async function writeSeedFlag() {
  const payload = { seeded: true, at: new Date().toISOString() };
  if (!remoteEnabled() && process.env.CRM_METAS_SEED_FLAG) {
    const file = process.env.CRM_METAS_SEED_FLAG;
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(payload));
    return;
  }
  await kvSet(SEED_FLAG_KEY, payload, metasOpts());
}

async function readAll() {
  const rows = await kvList(PREFIX, metasOpts());
  const seededInList = rows.some((row) => isSeedFlag(row.key));
  const goals = rows.filter((row) => !isSeedFlag(row.key)).map((row) => row.value).filter(Boolean);
  return { goals, seeded: seededInList || await readLocalSeedFlag() };
}

async function writeGoal(goal) {
  if (!goal || !GOAL_ID.test(goal.id) || !goal.titulo || !KINDS.includes(goal.kind)) throw new Error('Meta inválida: no se guarda');
  await kvSet(PREFIX + goal.id + '.json', goal, metasOpts());
  return goal;
}

function sortGoals(all) {
  return [...all].sort((a, b) => (a.orden || 0) - (b.orden || 0) || String(a.titulo).localeCompare(String(b.titulo), 'es'));
}

export async function getGoal(id) {
  if (!GOAL_ID.test(id || '')) return null;
  const rows = await kvList(PREFIX, metasOpts());
  const row = rows.find((item) => item.key === PREFIX + id + '.json' || item.key.endsWith('/' + id + '.json') || item.key === id + '.json');
  return row?.value || null;
}

export async function deleteGoal(id) {
  if (!GOAL_ID.test(id || '')) return false;
  const existing = await getGoal(id);
  if (!existing) return false;
  await kvDelete(PREFIX + id + '.json', metasOpts());
  // A delete counts as "seed already happened", so an empty list does not recreate the starter goals.
  await writeSeedFlag();
  return true;
}

export async function saveGoal(goal) {
  return writeGoal(goal);
}

export async function listGoals() {
  const { goals, seeded } = await readAll();
  if (goals.length > 0 || seeded) return sortGoals(goals);
  const now = new Date().toISOString();
  const created = [];
  for (const seed of SEED_GOALS) {
    created.push(await writeGoal({ ...seed, updatedAt: now }));
  }
  await writeSeedFlag();
  return sortGoals(created);
}
