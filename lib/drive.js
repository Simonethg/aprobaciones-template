// Google Drive link helpers (client and server).
export const DRIVE_ID_RE = /^[A-Za-z0-9_-]{20,80}$/;

// Returns { id, kind } for Drive or Docs links, or null.
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

// Drive or Docs http(s) links found inside a block of text.
export function driveLinksIn(text) {
  const out = [];
  for (const raw of String(text || '').match(/https?:\/\/(?:drive|docs)\.google\.com\/[^\s<>"')]+/g) || []) {
    const link = raw.replace(/[.,;:]+$/, '');
    if (!out.includes(link)) out.push(link);
  }
  return out;
}
