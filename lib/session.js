// HMAC-signed session (Web Crypto, so it works in edge middleware and in Node).
export const COOKIE_NAME = 'aprob_session';
export const SESSION_DAYS = 30;

const enc = new TextEncoder();

function secretMaterial() {
  const s = process.env.SESSION_SECRET || '';
  const c = process.env.ACCESS_CODE || '';
  if (!s || !c) return null;
  // Includes the code, so changing ACCESS_CODE signs everyone out.
  return s + '|' + c;
}

async function hmac(msg) {
  const mat = secretMaterial();
  if (!mat) return null;
  const key = await crypto.subtle.importKey('raw', enc.encode(mat), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export async function createSessionValue() {
  const exp = Date.now() + SESSION_DAYS * 864e5;
  const sig = await hmac('v1.' + exp);
  return `v1.${exp}.${sig}`;
}

export async function verifySessionValue(value) {
  if (!value || typeof value !== 'string') return false;
  const [v, exp, sig] = value.split('.');
  if (v !== 'v1' || !exp || !sig) return false;
  if (!(Number(exp) > Date.now())) return false;
  const expected = await hmac('v1.' + exp);
  return !!expected && safeEqual(sig, expected);
}

export function verifyBotToken(authHeader) {
  const token = process.env.BOT_API_TOKEN || '';
  if (!token || !authHeader) return false;
  const m = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  return !!m && safeEqual(m[1].trim(), token);
}
