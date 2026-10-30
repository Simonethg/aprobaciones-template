// JSON key-value store. Values are documents, never media files.
// Local files under .data/ work for `next dev`.
// Turso (libSQL, free tier) is used when TURSO_DATABASE_URL and TURSO_AUTH_TOKEN
// are both set, so deploys on Vercel Hobby and Netlify keep data without a paid blob store.
import { promises as fs } from 'fs';
import path from 'path';

function root() {
  return process.env.CRM_DATA_DIR || path.join(process.cwd(), '.data');
}

export function remoteEnabled() {
  return !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
}

let clientPromise;

async function client() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const { createClient } = await import('@libsql/client');
      const db = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      });
      await db.execute(`CREATE TABLE IF NOT EXISTS kv (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`);
      return db;
    })();
  }
  return clientPromise;
}

function assertKey(key) {
  if (typeof key !== 'string' || !key || key.includes('..') || key.startsWith('/') || key.includes('\\')) {
    throw new Error('Invalid key');
  }
}

function localPath(key, opts = {}) {
  assertKey(key);
  if (opts.dir) return path.join(opts.dir, path.basename(key));
  return path.join(root(), key);
}

export async function kvList(prefix, opts = {}) {
  assertKey(prefix.endsWith('/') ? prefix.slice(0, -1) + '/x' : prefix);
  if (remoteEnabled()) {
    const db = await client();
    const rs = await db.execute({
      sql: 'SELECT key, value FROM kv WHERE key LIKE ? ORDER BY key',
      args: [prefix + '%'],
    });
    return rs.rows.map((row) => ({ key: String(row.key), value: JSON.parse(String(row.value)) }));
  }
  const dir = opts.dir || path.join(root(), prefix.replace(/\/$/, ''));
  await fs.mkdir(dir, { recursive: true });
  const files = (await fs.readdir(dir)).filter((name) => name.endsWith('.json'));
  const out = [];
  for (const name of files) {
    const key = prefix.endsWith('/') ? prefix + name : prefix + '/' + name;
    const value = JSON.parse(await fs.readFile(path.join(dir, name), 'utf8'));
    out.push({ key, value });
  }
  return out;
}

export async function kvGet(key, opts = {}) {
  if (remoteEnabled()) {
    const db = await client();
    const rs = await db.execute({ sql: 'SELECT value FROM kv WHERE key = ?', args: [key] });
    if (!rs.rows[0]) return null;
    return JSON.parse(String(rs.rows[0].value));
  }
  try {
    return JSON.parse(await fs.readFile(localPath(key, opts), 'utf8'));
  } catch {
    return null;
  }
}

export async function kvSet(key, value, opts = {}) {
  const text = JSON.stringify(value);
  if (remoteEnabled()) {
    const db = await client();
    await db.execute({
      sql: 'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      args: [key, text],
    });
    return value;
  }
  const file = localPath(key, opts);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2));
  return value;
}

export async function kvDelete(key, opts = {}) {
  if (remoteEnabled()) {
    const db = await client();
    await db.execute({ sql: 'DELETE FROM kv WHERE key = ?', args: [key] });
    return;
  }
  await fs.unlink(localPath(key, opts)).catch(() => {});
}
