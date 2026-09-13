import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createDemoSession, currentDemoUser, hashToken, SESSION_COOKIE } from '@/server/auth/demo';
import { getDemoDb } from '@/server/db';
import { sessions } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { isDemo } from '@/server/config';
import { privateJson, sameOrigin } from '@/server/http';
export async function POST(request: Request) {
  if (!isDemo()) return privateJson({ error: 'Niet beschikbaar.' }, 404);
  if (!sameOrigin(request)) return privateJson({ error: 'Ongeldige aanvraag.' }, 403);
  const previous = (await cookies()).get(SESSION_COOKIE)?.value;
  const result = await createDemoSession(await currentDemoUser());
  if (previous)
    await (await getDemoDb()).delete(sessions).where(eq(sessions.tokenHash, hashToken(previous)));
  const response = NextResponse.json(
    { ok: true },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
  response.cookies.set(SESSION_COOKIE, result.token, {
    httpOnly: true,
    secure: false,
    sameSite: 'strict',
    path: '/',
    maxAge: 86400,
  });
  return response;
}
