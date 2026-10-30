import { NextResponse } from 'next/server';
import { readJsonBody } from '@/lib/limits';
import { APPROVER_NAME } from '@/lib/actor';
import { whoIs } from '@/lib/auth';
import { appendEvento, decisionFromStatus } from '@/lib/eventos';
import { getItem, saveItem, applyStatus, applyResubmit, applyFechaLimite } from '@/lib/store';

export const dynamic = 'force-dynamic';
const unauthorized = () => NextResponse.json({ error: 'Not authorized' }, { status: 401 });

export async function GET(_req, { params }) {
  if (!(await whoIs())) return unauthorized();
  const item = await getItem((await params).id);
  return item ? NextResponse.json({ item }) : NextResponse.json({ error: 'Not found' }, { status: 404 });
}

// Signed-in decision only: { status: pendiente|verificar|para-ops|modificar|aprobado|rechazado|hecho|descartado|archivado, nota }
// and/or { fechaLimite: ISO 8601 | null } to set or clear the deadline.
// Unarchive with status "pendiente". Bots do not use PATCH (they archive with /archive or /archivar).
export async function PATCH(req, { params }) {
  if ((await whoIs()) !== 'session') return unauthorized();
  const item = await getItem((await params).id);
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  let body;
  try { body = await readJsonBody(req); } catch (e) { return NextResponse.json({ error: e.message }, { status: e.status || 400 }); }
  try {
    if (body && Object.prototype.hasOwnProperty.call(body, 'fechaLimite')) applyFechaLimite(item, body.fechaLimite, APPROVER_NAME);
    if (body?.status) applyStatus(item, body.status, body.nota, APPROVER_NAME);
    else if (!body || !Object.prototype.hasOwnProperty.call(body, 'fechaLimite')) throw new Error('Missing "status" or "fechaLimite"');
    await saveItem(item);
    const decision = decisionFromStatus(body?.status);
    if (decision) {
      const nota = item.respuesta || item.nota || '';
      await appendEvento({
        bot: item.bot,
        itemId: item.id,
        titulo: item.titulo,
        proyecto: item.proyecto,
        decision,
        nota,
        at: item.updatedAt,
      });
    }
    return NextResponse.json({ item });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}

// Bot resubmits a revision (status returns to "pendiente").
export async function PUT(req, { params }) {
  if (!(await whoIs())) return unauthorized();
  const item = await getItem((await params).id);
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  let body;
  try { body = await readJsonBody(req); } catch (e) { return NextResponse.json({ error: e.message }, { status: e.status || 400 }); }
  try {
    await saveItem(applyResubmit(item, body || {}));
    return NextResponse.json({ item });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: Number.isInteger(e.status) ? e.status : 400 }); }
}
