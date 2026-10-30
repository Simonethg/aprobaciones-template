// Only tasks, never content. Items carry short text and a link; files live in Drive.
// These limits keep each request and each stored document small, so free hosting
// tiers (function invocations, bandwidth, database rows) last.

export const MAX_BODY_BYTES = 16 * 1024; // 16 KB per request
export const NOTE_MAX = 2000; // summary, note, comment, reply
export const TITLE_MAX = 300;
export const LINK_MAX = 2000;
export const STEP_MAX = 300;
export const STEPS_MAX = 20;

// data: URIs, or long runs of base64 characters (an encoded file pasted as text).
const DATA_URI_RE = /data:[a-z0-9.+-]+\/[a-z0-9.+-]+[^,]{0,100},/i;
const BASE64_RUN_RE = /[A-Za-z0-9+/=_-]{400,}/;

export function looksLikeEmbeddedFile(s) {
  return typeof s === 'string' && (DATA_URI_RE.test(s) || BASE64_RUN_RE.test(s));
}

function httpError(message, status) {
  const e = new Error(message);
  e.status = status;
  return e;
}

// Walks every string in a JSON value. Throws 422 when a file is embedded.
export function assertNoEmbeddedFiles(value, path = 'body') {
  if (typeof value === 'string') {
    if (looksLikeEmbeddedFile(value)) {
      throw httpError(`Embedded files are not accepted (data: URI or base64). Upload the file to Drive and send the link. Field: ${path}`, 422);
    }
    return;
  }
  if (Array.isArray(value)) { value.forEach((v, i) => assertNoEmbeddedFiles(v, `${path}[${i}]`)); return; }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) assertNoEmbeddedFiles(v, k);
  }
}

export function isHttpLink(s) {
  if (typeof s !== 'string' || !s) return false;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

const tooLarge = (max) => `Request body too large (limit ${Math.round(max / 1024)} KB). Send a short note and a Drive link, not the content.`;

// Reads a JSON body with a hard size cap. Only JSON is accepted: no multipart, no files.
// Returns the parsed value, or throws an Error with .status (400, 413, 415, 422).
export async function readJsonBody(req, max = MAX_BODY_BYTES) {
  const type = (req.headers.get('content-type') || '').toLowerCase();
  if (type && !type.includes('application/json')) {
    throw httpError('Only JSON is accepted (Content-Type: application/json). Files go to Drive; send the link.', 415);
  }
  const declared = Number(req.headers.get('content-length') || 0);
  if (declared > max) throw httpError(tooLarge(max), 413);
  const text = await req.text();
  if (Buffer.byteLength(text, 'utf8') > max) throw httpError(tooLarge(max), 413);
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { throw httpError('Invalid JSON', 400); }
  assertNoEmbeddedFiles(body);
  return body;
}
