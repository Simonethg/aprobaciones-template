import { NextResponse } from 'next/server';
import { whoIs } from '@/lib/auth';
import { listEventos } from '@/lib/eventos';

export const dynamic = 'force-dynamic';
const unauthorized = () => NextResponse.json({ error: 'Not authorized' }, { status: 401 });

// Each bot reads only its own events. Bot bearer auth: 401 without a token.
export async function GET(req) {
  if ((await whoIs()) !== 'bot') return unauthorized();
  const sp = new URL(req.url).searchParams;
  const bot = (sp.get('bot') || '').trim();
  const since = (sp.get('since') || '').trim();
  if (!bot) return NextResponse.json({ error: 'Missing "bot"' }, { status: 400 });
  if (since && Number.isNaN(Date.parse(since))) {
    return NextResponse.json({ error: 'Invalid "since"' }, { status: 400 });
  }
  const eventos = await listEventos({ bot, since });
  return NextResponse.json({ eventos });
}
