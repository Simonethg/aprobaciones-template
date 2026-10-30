import assert from 'node:assert/strict';
import test from 'node:test';
import { demoItems, presentItem } from './demo-items.js';

const ALLOWED = new Set(['Proyecto A', 'Newsletter', 'Videos']);

test('los ítems de demostración son pocos y ficticios', () => {
  const items = demoItems(Date.parse('2026-10-30T15:00:00Z'));
  assert.ok(items.length >= 3 && items.length <= 5);
  const blob = JSON.stringify(items);
  assert.doesNotMatch(blob, /@/);
  assert.doesNotMatch(blob, /drive\.google/i);
  assert.doesNotMatch(blob, /simoneth/i);
  assert.doesNotMatch(blob, /gmail/i);
  assert.doesNotMatch(blob, /vercel\.app/i);
  assert.doesNotMatch(blob, /netlify\.app/i);
  for (const item of items) assert.ok(ALLOWED.has(item.proyecto), item.proyecto);
  assert.ok(items.some((item) => item.status === 'pendiente'));
  assert.ok(items.some((item) => item.tipo === 'tarea-manual'));
  assert.ok(items.some((item) => item.tipo === 'video'));
  assert.ok(items.some((item) => item.tipo === 'post'));
  const post = items.find((item) => item.id === 'demo-post-001');
  assert.match(post.titulo, /Welcome post/);
  assert.match(post.titulo, /Post de bienvenida/);
  assert.equal(presentItem(post, 'en').titulo, 'Welcome post (demo)');
  assert.equal(presentItem(post, 'es').titulo, 'Post de bienvenida (demo)');
});
