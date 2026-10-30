import { NextResponse } from 'next/server';
import { whoIs } from '@/lib/auth';
import { applyGoalUpdate, deleteGoal, getGoal, saveGoal } from '@/lib/metas';

export const dynamic = 'force-dynamic';
const unauthorized = () => NextResponse.json({ error: 'No autorizado' }, { status: 401 });

export async function PATCH(req, { params }) {
  if (!(await whoIs())) return unauthorized();
  const goal = await getGoal((await params).id);
  if (!goal) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  try {
    await saveGoal(applyGoalUpdate(goal, body || {}));
    return NextResponse.json({ goal });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(_req, { params }) {
  if (!(await whoIs())) return unauthorized();
  const removed = await deleteGoal((await params).id);
  if (!removed) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
