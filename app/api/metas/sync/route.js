import { NextResponse } from 'next/server';
import { whoIs } from '@/lib/auth';
import { applyExternalToGoals, loadExternalActuals } from '@/lib/goal-sync';
import { listGoals, saveGoal } from '@/lib/metas';
import { listAllItems } from '@/lib/store';

export const dynamic = 'force-dynamic';
const unauthorized = () => NextResponse.json({ error: 'Not authorized' }, { status: 401 });

// Recalculates only goals that have a real source. A missing source does not change the number.
export async function POST() {
  if (!(await whoIs())) return unauthorized();
  const [goals, items] = await Promise.all([listGoals(), listAllItems()]);
  const external = await loadExternalActuals(process.env);
  const { goals: next, fuentes } = applyExternalToGoals(goals, items, external);
  const saved = [];
  for (const goal of next) {
    const prev = goals.find((g) => g.id === goal.id);
    if (prev && prev.actual !== goal.actual) saved.push(await saveGoal(goal));
    else saved.push(goal);
  }
  return NextResponse.json({ goals: saved, fuentes });
}
