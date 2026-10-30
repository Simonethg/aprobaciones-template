// Goal refresh. Numbers come only from a real source. A missing source does not change `actual`.

const DEFAULT_PROJECT = 'project a';
const DEFAULT_PRODUCT = 'demo product';

export function normText(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function videoGoalProject(env = process.env) {
  return normText(env?.VIDEO_GOAL_PROJECT || 'Project A') || DEFAULT_PROJECT;
}

export function productMatch(env = process.env) {
  return normText(env?.WOO_PRODUCT_MATCH || 'Demo Product') || DEFAULT_PRODUCT;
}

// Approved videos of the configured project. Practice cuts ("practice" or "práctica") are not counted.
export function isProjectVideo(item, env = process.env) {
  if (!item || item.status !== 'aprobado' || item.tipo !== 'video') return false;
  if (normText(item.proyecto) !== videoGoalProject(env)) return false;
  const text = normText(`${item.titulo || ''} ${item.resumen || ''}`);
  if (/\bpractic/.test(text)) return false;
  return true;
}

export function countProjectVideos(items, env = process.env) {
  return (items || []).filter((item) => isProjectVideo(item, env)).length;
}

export function wooConfigured(env = process.env) {
  return !!(env?.WOO_URL && env?.WOO_KEY && env?.WOO_SECRET && /^https:\/\//i.test(env.WOO_URL));
}

export function gumroadConfigured(env = process.env) {
  return !!env?.GUMROAD_TOKEN;
}

// Which automatic sources exist. Booleans only: never the secret values.
export function sourceFlags(env = process.env) {
  return {
    'videos-aprobados': true,
    'ventas-tienda': wooConfigured(env),
    'ventas-catalogo': gumroadConfigured(env),
  };
}

export function matchedOrderUsd(orders, env = process.env) {
  const match = productMatch(env);
  let sum = 0;
  for (const order of orders || []) {
    if (!order || !['completed', 'processing'].includes(order.status)) continue;
    if (String(order.currency || '').toUpperCase() !== 'USD') continue;
    for (const line of order.line_items || []) {
      const name = normText(`${line?.name || ''} ${line?.sku || ''}`);
      if (!name.includes(match)) continue;
      const n = Number(line.total);
      if (Number.isFinite(n) && n > 0) sum += n;
    }
  }
  return Math.round(sum * 100) / 100;
}

// Gumroad `price` is cents. Refunded or non-USD sales are skipped (no invented FX).
export function gumroadUsd(sales) {
  let sum = 0;
  for (const sale of sales || []) {
    if (!sale || sale.refunded || sale.chargedback || sale.disputed) continue;
    const currency = String(sale.currency || '').toLowerCase();
    if (currency !== 'usd') continue;
    const cents = Number(sale.price_cents != null ? sale.price_cents : sale.price);
    if (!Number.isFinite(cents) || cents <= 0) continue;
    const refunded = Number(sale.amount_refunded_cents || 0);
    const net = cents - (Number.isFinite(refunded) ? refunded : 0);
    if (net > 0) sum += net / 100;
  }
  return Math.round(sum * 100) / 100;
}

function wooUrl(env, page) {
  const url = new URL(String(env.WOO_URL).replace(/\/$/, '') + '/wp-json/wc/v3/orders');
  url.searchParams.set('status', 'completed,processing');
  url.searchParams.set('per_page', '100');
  url.searchParams.set('page', String(page));
  return url;
}

async function fetchWooOrders(env, fetchImpl) {
  const auth = Buffer.from(`${env.WOO_KEY}:${env.WOO_SECRET}`).toString('base64');
  const orders = [];
  for (let page = 1; page <= 5; page++) {
    const res = await fetchImpl(wooUrl(env, page), {
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error('WooCommerce did not respond');
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    orders.push(...batch);
    if (batch.length < 100) break;
  }
  return orders;
}

async function fetchGumroadSales(env, fetchImpl) {
  const sales = [];
  let pageKey = '';
  for (let i = 0; i < 5; i++) {
    const url = new URL('https://api.gumroad.com/v2/sales');
    url.searchParams.set('access_token', env.GUMROAD_TOKEN);
    if (pageKey) url.searchParams.set('page_key', pageKey);
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('Gumroad did not respond');
    const body = await res.json();
    if (!body || body.success === false) throw new Error('Gumroad did not respond');
    if (Array.isArray(body.sales)) sales.push(...body.sales);
    pageKey = body.next_page_key || '';
    if (!pageKey) break;
  }
  return sales;
}

// usd stays null when the source is missing or the read failed. Callers must not write a number then.
export async function loadExternalActuals(env = process.env, fetchImpl = fetch) {
  const woo = { configured: wooConfigured(env), usd: null };
  const gumroad = { configured: gumroadConfigured(env), usd: null };
  if (woo.configured) {
    try { woo.usd = matchedOrderUsd(await fetchWooOrders(env, fetchImpl), env); } catch { woo.usd = null; }
  }
  if (gumroad.configured) {
    try { gumroad.usd = gumroadUsd(await fetchGumroadSales(env, fetchImpl)); } catch { gumroad.usd = null; }
  }
  return { woo, gumroad };
}

function putActual(goals, id, actual, now) {
  const goal = goals.find((g) => g.id === id);
  if (!goal || actual == null || !Number.isFinite(actual)) return;
  if (goal.actual === actual) return;
  goal.actual = actual;
  goal.updatedAt = now;
}

// `fuentes[id]` is 'ok' or 'no source connected'. Only 'ok' may change `actual`.
export function applyExternalToGoals(goals, items, external, now = new Date().toISOString(), env = process.env) {
  const next = (goals || []).map((g) => ({ ...g }));
  const fuentes = {};
  const ext = external || {};

  if (next.some((g) => g.id === 'videos-aprobados')) {
    putActual(next, 'videos-aprobados', countProjectVideos(items, env), now);
    fuentes['videos-aprobados'] = 'ok';
  }

  const wooOk = !!(ext.woo && ext.woo.configured && ext.woo.usd != null);
  fuentes['ventas-tienda'] = wooOk ? 'ok' : 'no source connected';
  if (wooOk) putActual(next, 'ventas-tienda', ext.woo.usd, now);

  const gumOk = !!(ext.gumroad && ext.gumroad.configured && ext.gumroad.usd != null);
  fuentes['ventas-catalogo'] = gumOk ? 'ok' : 'no source connected';
  if (gumOk) putActual(next, 'ventas-catalogo', ext.gumroad.usd, now);

  return { goals: next, fuentes };
}
