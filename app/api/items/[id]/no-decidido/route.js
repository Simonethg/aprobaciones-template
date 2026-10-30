// POST { nota } — Ops action (bot bearer token or session) after reviewing an item in "verificar".
import { NextResponse } from 'next/server';
import { APPROVER_NAME } from '@/lib/actor';
import { whoIs } from '@/lib/auth';
import { getItem, saveItem, applyNoDecidido } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(req, { params }) {
  const who = await whoIs();
  if (!who) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const item = await getItem((await params).id);
  if (!item) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  try {
    applyNoDecidido(item, body?.nota, who === 'session' ? APPROVER_NAME : 'ops');
    await saveItem(item);
    return NextResponse.json({ item });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: /Solo se puede|ya está/.test(e.message) ? 409 : 400 });
  }
}
