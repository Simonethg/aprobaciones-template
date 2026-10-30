import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  applyExternalToGoals,
  countProjectVideos,
  gumroadConfigured,
  gumroadUsd,
  isProjectVideo,
  loadExternalActuals,
  matchedOrderUsd,
  sourceFlags,
  wooConfigured,
} from './goal-sync.js';

const videos = { id: 'videos-aprobados', actual: 4, total: 40, kind: 'ratio', updatedAt: '2020-01-01T00:00:00.000Z' };
const tienda = { id: 'ventas-tienda', actual: 12, meta: 500, kind: 'money-marker', updatedAt: '2020-01-01T00:00:00.000Z' };
const catalogo = { id: 'ventas-catalogo', actual: 7, kind: 'money', updatedAt: '2020-01-01T00:00:00.000Z' };

test('cuenta videos aprobados del proyecto demo y deja el total quieto', () => {
  const items = [
    { status: 'aprobado', tipo: 'video', proyecto: 'Proyecto A', titulo: 'Pieza 1' },
    { status: 'aprobado', tipo: 'video', proyecto: 'proyecto a', titulo: 'Pieza 2' },
    { status: 'aprobado', tipo: 'video', proyecto: 'Proyecto A', titulo: 'Práctica 1' },
    { status: 'aprobado', tipo: 'video', proyecto: 'Proyecto A', titulo: 'Practice cut' },
    { status: 'pendiente', tipo: 'video', proyecto: 'Proyecto A', titulo: 'Pieza 3' },
    { status: 'aprobado', tipo: 'guion', proyecto: 'Proyecto A', titulo: 'Texto' },
    { status: 'aprobado', tipo: 'video', proyecto: 'Newsletter', titulo: 'Pieza ajena' },
  ];
  assert.equal(isProjectVideo(items[2]), false);
  assert.equal(countProjectVideos(items), 2);
  const { goals, fuentes } = applyExternalToGoals(
    [videos, tienda, catalogo],
    items,
    { woo: { configured: false, usd: null }, gumroad: { configured: false, usd: null } },
    '2026-10-15T00:00:00.000Z',
  );
  const next = goals.find((g) => g.id === 'videos-aprobados');
  assert.equal(next.actual, 2);
  assert.equal(next.total, 40);
  assert.equal(goals.find((g) => g.id === 'ventas-tienda').actual, 12);
  assert.equal(goals.find((g) => g.id === 'ventas-catalogo').actual, 7);
  assert.equal(fuentes['videos-aprobados'], 'ok');
  assert.equal(fuentes['ventas-tienda'], 'sin fuente conectada');
  assert.equal(fuentes['ventas-catalogo'], 'sin fuente conectada');
});

test('Woo y Gumroad suman USD reales y no se consultan si falta la clave', async () => {
  assert.equal(matchedOrderUsd([
    { status: 'completed', currency: 'USD', line_items: [{ name: 'Demo Product', total: '20.50' }, { name: 'Otro', total: '100' }] },
    { status: 'processing', currency: 'USD', line_items: [{ name: 'Demo Product pack', sku: '', total: '9.5' }] },
    { status: 'completed', currency: 'ARS', line_items: [{ name: 'Demo Product', total: '99999' }] },
    { status: 'refunded', currency: 'USD', line_items: [{ name: 'Demo Product', total: '40' }] },
  ]), 30);
  assert.equal(gumroadUsd([
    { price: 2500, currency: 'usd', refunded: false },
    { price: 1000, currency: 'usd', refunded: true },
    { price: 5000, currency: 'eur', refunded: false },
  ]), 25);

  let calls = 0;
  const quiet = await loadExternalActuals({}, () => { calls += 1; throw new Error('no'); });
  assert.equal(calls, 0);
  assert.equal(quiet.woo.configured, false);
  assert.equal(quiet.woo.usd, null);
  assert.equal(quiet.gumroad.usd, null);
  assert.equal(wooConfigured({}), false);
  assert.equal(gumroadConfigured({}), false);
  assert.deepEqual(sourceFlags({}), {
    'videos-aprobados': true,
    'ventas-tienda': false,
    'ventas-catalogo': false,
  });

  const env = { WOO_URL: 'https://shop.example', WOO_KEY: 'ck_example', WOO_SECRET: 'cs_example', GUMROAD_TOKEN: 'gumroad_example' };
  const seen = [];
  const fake = async (url) => {
    const href = String(url);
    seen.push(href);
    assert.equal(href.includes('cs_example'), false);
    assert.equal(href.includes('gumroad_example'), href.includes('api.gumroad.com'));
    if (href.includes('wc/v3/orders')) {
      return { ok: true, json: async () => [{ status: 'completed', currency: 'USD', line_items: [{ name: 'Demo Product', total: '15' }] }] };
    }
    return { ok: true, json: async () => ({ success: true, sales: [{ price: 500, currency: 'usd' }] }) };
  };
  const loaded = await loadExternalActuals(env, fake);
  assert.equal(loaded.woo.usd, 15);
  assert.equal(loaded.gumroad.usd, 5);
  assert.equal(seen.length, 2);

  const failed = await loadExternalActuals(env, async () => { throw new Error('red'); });
  assert.equal(failed.woo.configured, true);
  assert.equal(failed.woo.usd, null);
  const kept = applyExternalToGoals([tienda], [], failed);
  assert.equal(kept.goals[0].actual, 12);
  assert.equal(kept.fuentes['ventas-tienda'], 'sin fuente conectada');
});

test('POST /api/metas/sync exige auth y no inventa la fuente', () => {
  const src = readFileSync(new URL('../app/api/metas/sync/route.js', import.meta.url), 'utf8');
  assert.match(src, /status: 401/);
  assert.match(src, /if \(!\(await whoIs\(\)\)\) return unauthorized\(\)/);
  assert.match(src, /loadExternalActuals/);
  assert.doesNotMatch(src, /WOO_KEY\s*=/);
});
