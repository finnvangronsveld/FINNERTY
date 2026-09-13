import 'server-only';
import { isDemo } from './config';
export async function readLimitedText(request: Request, limit = 1024) {
  if (Number(request.headers.get('content-length') ?? 0) > limit)
    throw new Error('REQUEST_TOO_LARGE');
  const reader = request.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > limit) {
        await reader.cancel();
        throw new Error('REQUEST_TOO_LARGE');
      }
      body += decoder.decode(chunk.value, { stream: true });
    }
    return body + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}
export function privateJson(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || (request.headers.get('sec-fetch-site') ?? 'same-origin') !== 'same-origin')
    return false;
  try {
    if (process.env.APP_URL) return origin === new URL(process.env.APP_URL).origin;
    const parsed = new URL(origin);
    return (
      isDemo() &&
      ['127.0.0.1', 'localhost'].includes(parsed.hostname) &&
      parsed.host === request.headers.get('host')
    );
  } catch {
    return false;
  }
}
