import assert from 'node:assert/strict';
import test from 'node:test';
import { dueThroughTomorrow, inHoy } from './hoy.js';

const now = Date.parse('2026-10-15T15:00:00-03:00');

test('Today gathers due items, pending approvals, and anything stuck or waiting for changes', () => {
  const dueToday = { status: 'aprobado', tipo: 'video', fechaLimite: '2026-10-15T23:59:00-03:00' };
  const dueTomorrow = { status: 'para-ops', tipo: 'guion', fechaLimite: '2026-10-16T09:00:00-03:00' };
  const overdue = { status: 'pendiente', tipo: 'tarea-manual', fechaLimite: '2026-10-14T09:00:00-03:00' };
  const nextWeek = { status: 'aprobado', tipo: 'video', fechaLimite: '2026-10-20T09:00:00-03:00' };
  const approval = { status: 'pendiente', tipo: 'guion' };
  const ownTask = { status: 'pendiente', tipo: 'tarea-manual' };
  const modificar = { status: 'modificar', tipo: 'video' };
  const verificar = { status: 'verificar', tipo: 'texto' };
  const closed = { status: 'archivado', tipo: 'guion', fechaLimite: '2026-10-15T23:59:00-03:00' };

  assert.equal(dueThroughTomorrow(dueToday.fechaLimite, now), true);
  assert.equal(dueThroughTomorrow(nextWeek.fechaLimite, now), false);
  assert.equal(inHoy(dueToday, now), true);
  assert.equal(inHoy(dueTomorrow, now), true);
  assert.equal(inHoy(overdue, now), true);
  assert.equal(inHoy(nextWeek, now), false);
  assert.equal(inHoy(approval, now), true);
  assert.equal(inHoy(ownTask, now), false);
  assert.equal(inHoy(modificar, now), true);
  assert.equal(inHoy(verificar, now), true);
  assert.equal(inHoy(closed, now), false);
});
