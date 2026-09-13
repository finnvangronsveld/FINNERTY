import { createHmac } from 'node:crypto';
import { z } from 'zod';
import { safeEqual } from '../auth/crypto';
export function validateEventSignature(
  headers: Headers,
  raw: string,
  secret: string,
  now = Date.now(),
) {
  const id = headers.get('twitch-eventsub-message-id') ?? '';
  const timestamp = headers.get('twitch-eventsub-message-timestamp') ?? '';
  const signature = headers.get('twitch-eventsub-message-signature') ?? '';
  const millis = Date.parse(timestamp);
  if (
    !id ||
    id.length > 200 ||
    !Number.isFinite(millis) ||
    now - millis > 600_000 ||
    millis - now > 60_000 ||
    secret.length < 32 ||
    !/^sha256=[a-f0-9]{64}$/.test(signature)
  )
    return false;
  return safeEqual(
    signature,
    `sha256=${createHmac('sha256', secret)
      .update(id + timestamp + raw)
      .digest('hex')}`,
  );
}
export const eventSubSchema = z.object({
  challenge: z.string().max(300).optional(),
  subscription: z.object({
    id: z.string(),
    type: z.enum(['stream.online', 'stream.offline']),
    condition: z.object({ broadcaster_user_id: z.string() }),
    status: z.string().optional(),
  }),
  event: z.object({ broadcaster_user_id: z.string() }).optional(),
});
