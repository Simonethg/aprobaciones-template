// POST { nota } — Ops action (bot bearer token or session) after reviewing an item in "verificar".
import { NextResponse } from 'next/server';
import { readJsonBody } from '@/lib/limits';
import { APPROVER_NAME } from '@/lib/actor';
import { whoIs } from '@/lib/auth';
import { getItem, saveItem, applyArchivar } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(req, { params }) {
  const who = await whoIs();
  if (!who) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  const item = await getItem((await params).id);
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  let body;
  try { body = await readJsonBody(req); } catch (e) { return NextResponse.json({ error: e.message }, { status: e.status || 400 }); }
  try {
    applyArchivar(item, body?.nota, who === 'session' ? APPROVER_NAME : 'ops');
    await saveItem(item);
    return NextResponse.json({ item });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: /only works on items|already archived/.test(e.message) ? 409 : 400 });
  }
}
