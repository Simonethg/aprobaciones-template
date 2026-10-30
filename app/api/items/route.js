import { NextResponse } from 'next/server';
import { whoIs } from '@/lib/auth';
import { listItems, newItemFromInput, saveItem, STATUSES } from '@/lib/store';

export const dynamic = 'force-dynamic';
const unauthorized = () => NextResponse.json({ error: 'Not authorized' }, { status: 401 });

export async function GET(req) {
  if (!(await whoIs())) return unauthorized();
  // Default "todos" omits archivado. Bots list the archive with ?status=archivado.
  const status = new URL(req.url).searchParams.get('status') || 'todos';
  if (status !== 'todos' && !STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status. Use: ' + [...STATUSES, 'todos'].join(', ') }, { status: 400 });
  }
  const bot = new URL(req.url).searchParams.get('bot');
  let items = await listItems(status);
  if (bot) items = items.filter((i) => i.bot === bot);
  return NextResponse.json({ items });
}

export async function POST(req) {
  if (!(await whoIs())) return unauthorized();
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  try {
    const item = await saveItem(newItemFromInput(body || {}));
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
