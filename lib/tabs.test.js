import assert from 'node:assert/strict';
import test from 'node:test';
import { APPROVAL_TABS, SECTIONS, inTab, inTaskView } from './tabs.js';

test('Hoy es la primera pestaña de Aprobaciones', () => {
  assert.equal(APPROVAL_TABS[0][0], 'hoy');
  assert.equal(APPROVAL_TABS[0][1], 'Hoy');
  const now = Date.parse('2026-10-15T15:00:00-03:00');
  assert.equal(inTab({ status: 'pendiente', tipo: 'guion' }, 'hoy', now), true);
  assert.equal(inTab({ status: 'aprobado', tipo: 'guion' }, 'hoy', now), false);
});

test('las tres secciones reemplazan el título y Aprobaciones conserva sus filtros', () => {
  assert.deepEqual(SECTIONS.map(([, label]) => label), ['Aprobaciones', 'Tareas mías', 'Metas']);
  const labels = APPROVAL_TABS.map(([, label]) => label);
  assert.ok(labels.includes('Pendientes'));
  assert.ok(labels.includes('Por verificar'));
  assert.equal(labels.includes('Tareas mías'), false);
});

test('los filtros de Tareas mías solo miran tareas manuales', () => {
  const abierta = { tipo: 'tarea-manual', status: 'pendiente' };
  const hecha = { tipo: 'tarea-manual', status: 'hecho' };
  const guion = { tipo: 'guion', status: 'pendiente' };
  assert.equal(inTaskView(abierta, 'abiertas'), true);
  assert.equal(inTaskView(hecha, 'abiertas'), false);
  assert.equal(inTaskView(hecha, 'hechas'), true);
  assert.equal(inTaskView(guion, 'todas'), false);
});
