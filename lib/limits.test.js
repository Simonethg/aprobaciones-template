import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_BODY_BYTES, NOTE_MAX, assertNoEmbeddedFiles, isHttpLink, looksLikeEmbeddedFile, readJsonBody } from './limits.js';
import { applyResubmit, newItemFromInput } from './store.js';

const req = (body, headers = { 'content-type': 'application/json' }) =>
  new Request('http://localhost/api/items', { method: 'POST', headers, body });

test('readJsonBody accepts a small task', async () => {
  const body = await readJsonBody(req(JSON.stringify({ titulo: 'Review video', link: 'https://drive.google.com/file/d/abc/view' })));
  assert.equal(body.titulo, 'Review video');
});

test('readJsonBody rejects bodies over 16 KB with 413', async () => {
  const big = JSON.stringify({ titulo: 'x', resumen: 'a '.repeat(MAX_BODY_BYTES) });
  await assert.rejects(readJsonBody(req(big)), (e) => e.status === 413 && /16 KB/.test(e.message));
});

test('readJsonBody rejects multipart and other non-JSON bodies with 415', async () => {
  await assert.rejects(readJsonBody(req('x', { 'content-type': 'multipart/form-data; boundary=x' })), (e) => e.status === 415);
});

test('readJsonBody rejects data: URIs and base64 blobs with 422', async () => {
  const dataUri = JSON.stringify({ titulo: 'x', contenido: 'data:image/png;base64,iVBORw0KGgo=' });
  await assert.rejects(readJsonBody(req(dataUri)), (e) => e.status === 422 && /Field: contenido/.test(e.message));
  const blob = JSON.stringify({ titulo: 'x', resumen: 'A'.repeat(500) });
  await assert.rejects(readJsonBody(req(blob)), (e) => e.status === 422);
});

test('readJsonBody rejects invalid JSON with 400', async () => {
  await assert.rejects(readJsonBody(req('{nope')), (e) => e.status === 400);
});

test('normal text and links are not mistaken for files', () => {
  assert.equal(looksLikeEmbeddedFile('See https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456/view for the draft.'), false);
  assert.doesNotThrow(() => assertNoEmbeddedFiles({ pasos: ['Open the doc', 'Approve it'] }));
});

test('isHttpLink only allows http(s)', () => {
  assert.equal(isHttpLink('https://drive.google.com/x'), true);
  assert.equal(isHttpLink('http://example.com'), true);
  for (const bad of ['javascript:alert(1)', 'data:text/html,hi', 'ftp://x', 'drive.google.com/x', '']) assert.equal(isHttpLink(bad), false);
});

test('items keep only short text: notes capped at 2,000 chars', () => {
  const item = newItemFromInput({ titulo: 'T', resumen: 'r '.repeat(3000), contenido: 'c '.repeat(3000), asignado: 'Ana' });
  assert.ok(item.resumen.length <= NOTE_MAX);
  assert.ok(item.contenido.length <= NOTE_MAX);
  assert.equal(item.asignado, 'Ana');
});

test('items reject non-http links and embedded files', () => {
  assert.throws(() => newItemFromInput({ titulo: 'T', link: 'javascript:alert(1)' }), /http/);
  assert.throws(() => newItemFromInput({ titulo: 'T', link: 'data:video/mp4;base64,AAAA' }), (e) => e.status === 422);
  const item = newItemFromInput({ titulo: 'T', link: 'https://drive.google.com/file/d/abc/view' });
  assert.throws(() => applyResubmit(item, { contenido: 'data:image/png;base64,AAAA' }), (e) => e.status === 422);
  assert.throws(() => applyResubmit(item, { link: 'file:///etc/passwd' }), /http/);
});
