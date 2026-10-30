import { cookies, headers } from 'next/headers';
import { COOKIE_NAME, verifySessionValue, verifyBotToken } from './session';

// Checked again in every route (defense in depth on top of the middleware).
export async function whoIs() {
  const c = await cookies();
  if (await verifySessionValue(c.get(COOKIE_NAME)?.value)) return 'session';
  const h = await headers();
  if (verifyBotToken(h.get('authorization'))) return 'bot';
  return null;
}
