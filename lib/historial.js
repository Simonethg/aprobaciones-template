// Approver decisions for one project, oldest first, so a bot can learn from rejections.
import { APPROVER_NAME } from './actor.js';
const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const DECISIONS = ['pendiente', 'verificar', 'para-ops', 'modificar', 'aprobado', 'rechazado', 'hecho', 'descartado', 'archivado'];

export function historialDeProyecto(items, proyecto) {
  const want = norm(proyecto);
  if (!want) return [];
  const rows = [];
  for (const item of items || []) {
    if (norm(item?.proyecto) !== want) continue;
    for (const h of item.history || []) {
      if (!h || h.por !== APPROVER_NAME) continue;
      if (!DECISIONS.includes(h.status)) continue;
      if (!h.at) continue;
      rows.push({
        at: h.at,
        itemId: item.id,
        titulo: item.titulo || '',
        bot: item.bot || '',
        decision: h.status,
        nota: h.nota || '',
      });
    }
  }
  rows.sort((a, b) => String(a.at).localeCompare(String(b.at)) || String(a.itemId).localeCompare(String(b.itemId)));
  return rows;
}
