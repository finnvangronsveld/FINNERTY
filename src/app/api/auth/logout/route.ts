import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb } from '@/server/db';
import { sessions } from '@/server/db/schema';
import { hash } from '@/server/auth/crypto';
import { sessionCookieName } from '@/server/auth/session';
import { privateJson, sameOrigin } from '@/server/http';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: 'Ongeldige aanvraag.' }, 403);
  const name = sessionCookieName();
  const token = (await cookies()).get(name)?.value;
  if (token) await (await getDb()).delete(sessions).where(eq(sessions.tokenHash, hash(token)));
  const response = NextResponse.json(
    { ok: true },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
  response.cookies.delete(name);
  return response;
}
