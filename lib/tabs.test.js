import assert from 'node:assert/strict';
import test from 'node:test';
import { APPROVAL_TABS, SECTIONS, inTab, inTaskView } from './tabs.js';

test('Today is the first Approvals tab', () => {
  assert.equal(APPROVAL_TABS[0][0], 'hoy');
  assert.equal(APPROVAL_TABS[0][1], 'Today');
  const now = Date.parse('2026-10-15T15:00:00-03:00');
  assert.equal(inTab({ status: 'pendiente', tipo: 'guion' }, 'hoy', now), true);
  assert.equal(inTab({ status: 'aprobado', tipo: 'guion' }, 'hoy', now), false);
});

test('the three sections replace the title and Approvals keeps its filters', () => {
  assert.deepEqual(SECTIONS.map(([, label]) => label), ['Approvals', 'My tasks', 'Goals']);
  const labels = APPROVAL_TABS.map(([, label]) => label);
  assert.ok(labels.includes('Pending'));
  assert.ok(labels.includes('To verify'));
  assert.equal(labels.includes('My tasks'), false);
});

test('My tasks filters only look at manual tasks', () => {
  const open = { tipo: 'tarea-manual', status: 'pendiente' };
  const done = { tipo: 'tarea-manual', status: 'hecho' };
  const script = { tipo: 'guion', status: 'pendiente' };
  assert.equal(inTaskView(open, 'abiertas'), true);
  assert.equal(inTaskView(done, 'abiertas'), false);
  assert.equal(inTaskView(done, 'hechas'), true);
  assert.equal(inTaskView(script, 'todas'), false);
});
