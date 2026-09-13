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
export function normalizeUnverifiedStreamElementsResponse(_raw: unknown): never {
  void _raw;
  throw new Error('STREAMELEMENTS_CONTRACT_NOT_VERIFIED');
}
