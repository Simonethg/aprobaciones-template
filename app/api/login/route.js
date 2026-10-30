import { NextResponse } from 'next/server';
import { COOKIE_NAME, SESSION_DAYS, createSessionValue, safeEqual } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const code = process.env.ACCESS_CODE;
  if (!code || !process.env.SESSION_SECRET) {
    return NextResponse.json({ error: 'Servidor sin configurar (ACCESS_CODE / SESSION_SECRET)' }, { status: 500 });
  }
  let submitted = '';
  const ct = req.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try { submitted = String((await req.json()).code || ''); } catch {}
  } else {
    const fd = await req.formData().catch(() => null);
    submitted = String(fd?.get('code') || '');
  }
  if (!safeEqual(submitted.trim(), code)) {
    await new Promise((r) => setTimeout(r, 1200)); // frena fuerza bruta
    return NextResponse.json({ error: 'Código incorrecto' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, await createSessionValue(), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/',
    maxAge: SESSION_DAYS * 86400,
  });
  return res;
}
