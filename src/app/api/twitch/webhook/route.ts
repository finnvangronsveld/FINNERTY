import { after } from 'next/server';
import { eq } from 'drizzle-orm';
import { validateEventSignature, eventSubSchema } from '@/server/integrations/eventsub';
import { refreshStream } from '@/server/integrations/twitch-stream';
import { streamConfiguration } from '@/server/jobs';
import { getDb } from '@/server/db';
import { processedEvents, streamStates } from '@/server/db/schema';
import { readLimitedText } from '@/server/http';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  const config = streamConfiguration();
  const secret = process.env.EVENTSUB_SECRET;
  if (!config || !secret) return new Response(null, { status: 503 });
  let raw: string;
  try {
    raw = await readLimitedText(request, 64 * 1024);
  } catch {
    return new Response(null, { status: 413 });
  }
  if (!validateEventSignature(request.headers, raw, secret))
    return new Response(null, { status: 403 });
  try {
    const body = eventSubSchema.parse(JSON.parse(raw));
    if (
      body.subscription.condition.broadcaster_user_id !== config.broadcasterId ||
      (body.event && body.event.broadcaster_user_id !== config.broadcasterId)
    )
      return new Response(null, { status: 403 });
    const type = request.headers.get('twitch-eventsub-message-type');
    if (type === 'webhook_callback_verification')
      return body.challenge
        ? new Response(body.challenge, {
            headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' },
          })
        : new Response(null, { status: 400 });
    if (type !== 'notification' && type !== 'revocation')
      return new Response(null, { status: 400 });
    if (type === 'notification' && !body.event) return new Response(null, { status: 400 });
    const db = await getDb();
    const fresh = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(processedEvents)
        .values({ id: request.headers.get('twitch-eventsub-message-id')! })
        .onConflictDoNothing()
        .returning();
      if (!inserted.length) return false;
      await tx
        .update(streamStates)
        .set({
          nextCheckAt: new Date(0),
          ...(type === 'revocation' ? { errorCode: 'EVENTSUB_REVOKED' } : {}),
        })
        .where(eq(streamStates.broadcasterId, config.broadcasterId));
      return true;
    });
    // Read authoritative current status: delayed/offline events never overwrite a newer live event.
    if (fresh)
      after(async () => {
        try {
          await refreshStream(db, config);
        } catch {
          /* Scheduled recovery remains authoritative. */
        }
      });
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 400 });
  }
}
