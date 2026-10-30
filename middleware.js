import { NextResponse } from 'next/server';
import { COOKIE_NAME, verifySessionValue, verifyBotToken } from './lib/session';

const PUBLIC = new Set(['/login', '/api/login', '/robots.txt']);

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.has(pathname)) return NextResponse.next();

  const okSession = await verifySessionValue(req.cookies.get(COOKIE_NAME)?.value);
  const isApi = pathname.startsWith('/api/');
  const okBot = isApi && verifyBotToken(req.headers.get('authorization'));

  if (okSession || okBot) {
    const headers = new Headers(req.headers);
    headers.set('x-aprob-auth', okSession ? 'session' : 'bot');
    return NextResponse.next({ request: { headers } });
  }
  if (isApi) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
