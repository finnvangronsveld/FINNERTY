import 'server-only';
/** Deliberately read-only transport. Raw responses NEVER pass to the browser or rewards. */
export function streamElementsReadOnly(jwt: string, request: typeof fetch = fetch) {
  async function read(path: string) {
    const response = await request(`https://api.streamelements.com/kappa/v2${path}`, {
      headers: { Authorization: `Bearer ${jwt}`, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      throw new Error(
        response.status === 429 ? 'STREAMELEMENTS_RATE_LIMIT' : 'STREAMELEMENTS_UNAVAILABLE',
      );
    return (await response.json()) as unknown;
  }
  return {
    channel: () => read('/channels/me'),
    watchtimePage: (channelId: string, offset: number, limit = 25) => {
      if (
        !/^[a-zA-Z0-9_-]+$/.test(channelId) ||
        !Number.isSafeInteger(offset) ||
        offset < 0 ||
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 100
      )
        throw new Error('INVALID_PROVIDER_QUERY');
      return read(
        `/points/${encodeURIComponent(channelId)}/watchtime?limit=${limit}&offset=${offset}`,
      );
    },
  };
}
