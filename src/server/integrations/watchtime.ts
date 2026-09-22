import { z } from 'zod';
// This is OUR normalized contract, NOT a claimed StreamElements response schema.
export const normalizedWatchtimeSchema = z
  .object({
    providerAccountKey: z.string().min(1),
    twitchUserId: z.string().nullable(),
    providerUsername: z.string().min(1),
    watchtimeSeconds: z.bigint().nonnegative(),
    observedAt: z.date(),
  })
  .strict();
export type NormalizedWatchtime = z.infer<typeof normalizedWatchtimeSchema>;
export interface VerifiedWatchtimeAdapter {
  readPage(
    cursor: string | null,
  ): Promise<{ records: NormalizedWatchtime[]; nextCursor: string | null }>;
}
export async function collectWatchtime(adapter: VerifiedWatchtimeAdapter, maxPages = 100) {
  const records: NormalizedWatchtime[] = [];
  const cursors = new Set<string>();
  const identities = new Set<string>();
  let cursor: string | null = null;
  for (let page = 0; page < maxPages; page++) {
    const response = await adapter.readPage(cursor);
    for (const raw of response.records) {
      const record = normalizedWatchtimeSchema.parse(raw);
      if (identities.has(record.providerAccountKey)) throw new Error('DUPLICATE_PROVIDER_IDENTITY');
      identities.add(record.providerAccountKey);
      records.push(record);
    }
    if (response.nextCursor === null) return records;
    if (cursors.has(response.nextCursor)) throw new Error('PAGINATION_LOOP');
    cursors.add(response.nextCursor);
    cursor = response.nextCursor;
  }
  throw new Error('INCOMPLETE_PROVIDER_SCAN'); // Never interpret an incomplete scan as missing or zero.
}
/**
 * `GET /points/{channel}/watchtime?limit&offset`, verified read-only against the live API on
 * 2026-09-22: `{ _total, users: [{ username, minutes }] | null }`, sorted by minutes descending.
 * `users` is null past the end. Viewers are keyed by Twitch username only; minutes are cumulative.
 * The live list contains the odd row without a valid username (seen: an empty one); such a row can
 * never map to an account, so it is skipped instead of failing the whole scan.
 */
export const streamElementsWatchtimePageSchema = z.object({
  _total: z.number().int().nonnegative(),
  users: z
    .array(
      z.object({
        username: z.string().max(100),
        minutes: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
      }),
    )
    .nullable(),
});

export function parseStreamElementsWatchtimePage(raw: unknown, observedAt: Date) {
  const page = streamElementsWatchtimePageSchema.parse(raw);
  return {
    total: page._total,
    /** Rows read from this page, including skipped ones, so pagination advances correctly. */
    rows: page.users?.length ?? 0,
    records: (page.users ?? [])
      .filter((user) => /^[A-Za-z0-9_]{1,25}$/.test(user.username))
      .map((user) =>
        normalizedWatchtimeSchema.parse({
          providerAccountKey: user.username.toLowerCase(),
          twitchUserId: null,
          providerUsername: user.username,
          watchtimeSeconds: BigInt(user.minutes) * 60n,
          observedAt,
        }),
      ),
  };
}
