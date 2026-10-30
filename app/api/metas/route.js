import { NextResponse } from 'next/server';
import { readJsonBody } from '@/lib/limits';
import { whoIs } from '@/lib/auth';
import { listGoals, newGoalFromInput, saveGoal } from '@/lib/metas';

export const dynamic = 'force-dynamic';
const unauthorized = () => NextResponse.json({ error: 'Not authorized' }, { status: 401 });

export async function GET() {
  if (!(await whoIs())) return unauthorized();
  const goals = await listGoals();
  return NextResponse.json({ goals });
}

export async function POST(req) {
  if (!(await whoIs())) return unauthorized();
  let body;
  try { body = await readJsonBody(req); } catch (e) { return NextResponse.json({ error: e.message }, { status: e.status || 400 }); }
  try {
    const goal = await saveGoal(newGoalFromInput(body || {}));
    return NextResponse.json({ goal }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
