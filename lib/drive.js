// Utilidades para links de Google Drive (cliente y servidor).
export const DRIVE_ID_RE = /^[A-Za-z0-9_-]{20,80}$/;

// Devuelve { id, kind } para links de Drive/Docs, o null.
// kind: 'file' (drive.google.com/file/d, open?id, uc?id, usercontent) | 'document' | 'spreadsheets' | 'presentation'
export function parseDriveLink(link) {
  let u;
  try { u = new URL(link); } catch { return null; }
  const host = u.hostname.toLowerCase();
  if (host === 'drive.google.com' || host === 'drive.usercontent.google.com') {
    const m = /\/file\/d\/([A-Za-z0-9_-]+)/.exec(u.pathname);
    const id = m ? m[1] : u.searchParams.get('id');
    if (id && DRIVE_ID_RE.test(id) && !u.pathname.includes('/folders/')) return { id, kind: 'file' };
    return null;
  }
  if (host === 'docs.google.com') {
    const m = /^\/(document|spreadsheets|presentation)\/d\/([A-Za-z0-9_-]+)/.exec(u.pathname);
    if (m && DRIVE_ID_RE.test(m[2])) return { id: m[2], kind: m[1] };
  }
  return null;
}

export function isDriveFolder(link) {
  try { const u = new URL(link); return u.hostname === 'drive.google.com' && u.pathname.includes('/folders/'); } catch { return false; }
}

// Links http(s) de Drive/Docs que aparecen dentro de un texto.
export function driveLinksIn(text) {
  const out = [];
  for (const raw of String(text || '').match(/https?:\/\/(?:drive|docs)\.google\.com\/[^\s<>"')]+/g) || []) {
    const link = raw.replace(/[.,;:]+$/, '');
    if (!out.includes(link)) out.push(link);
  }
  return out;
}

const EXT_MIME = {
  mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', mkv: 'video/x-matroska',
  mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav', ogg: 'audio/ogg', opus: 'audio/ogg', flac: 'audio/flac',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif',
  pdf: 'application/pdf',
};

// Drive suele servir MP4 como "application/mp4" o "application/octet-stream": lo normalizamos
// por extensión para que <video>/<audio>/<img> lo reproduzcan.
export function normalizeMime(contentType, filename) {
  const ct = String(contentType || '').split(';')[0].trim().toLowerCase();
  const ext = (/\.([a-z0-9]{2,5})$/i.exec(filename || '') || [])[1]?.toLowerCase();
  if (/^(video|audio|image)\//.test(ct)) return ct;
  if (ct === 'application/mp4') return ext && EXT_MIME[ext]?.startsWith('audio/') ? EXT_MIME[ext] : 'video/mp4';
  if (ext && EXT_MIME[ext]) return EXT_MIME[ext];
  return ct || 'application/octet-stream';
}

export function filenameFromDisposition(cd) {
  if (!cd) return '';
  const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(cd);
  if (star) { try { return decodeURIComponent(star[1].trim().replace(/^"|"$/g, '')); } catch {} }
  const m = /filename="?([^";]+)"?/i.exec(cd);
  return m ? m[1] : '';
}
