import { NextResponse } from 'next/server';
import { whoIs } from '@/lib/auth';
import { getItem, saveItem, applyArchive } from '@/lib/store';

export const dynamic = 'force-dynamic';
const unauthorized = () => NextResponse.json({ error: 'Not authorized' }, { status: 401 });

// Bot token only. Body: { bot, nota? } (reason is an alias of nota).
// Archives the item when bot matches item.bot. Cannot approve, reject, or delete.
// The signed-in person unarchives with PATCH { status: "pendiente" } on the item route.
export async function POST(req, { params }) {
  if ((await whoIs()) !== 'bot') return unauthorized();
  const item = await getItem((await params).id);
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  try {
    const { changed } = applyArchive(item, body || {});
    if (changed) await saveItem(item);
    return NextResponse.json({ item });
  } catch (e) {
    const status = Number.isInteger(e.status) ? e.status : 400;
    return NextResponse.json({ error: e.message }, { status });
  }
}
