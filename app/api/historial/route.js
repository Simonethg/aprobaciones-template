import { NextResponse } from 'next/server';
import { whoIs } from '@/lib/auth';
import { historialDeProyecto } from '@/lib/historial';
import { listAllItems } from '@/lib/store';

export const dynamic = 'force-dynamic';
const unauthorized = () => NextResponse.json({ error: 'Not authorized' }, { status: 401 });

// Approver decisions and comments for one project, oldest first.
export async function GET(req) {
  if (!(await whoIs())) return unauthorized();
  const proyecto = (new URL(req.url).searchParams.get('proyecto') || '').trim();
  if (!proyecto) return NextResponse.json({ error: 'Missing "proyecto"' }, { status: 400 });
  const items = await listAllItems();
  return NextResponse.json({ proyecto, historial: historialDeProyecto(items, proyecto) });
}
