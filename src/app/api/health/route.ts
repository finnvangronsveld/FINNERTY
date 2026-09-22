import { isDemo } from '@/server/config';
import { setupReport } from '@/server/setup';
export async function GET() {
  return Response.json(
    {
      status: 'ok',
      release: '0.1.0',
      integrations: 'not-verified',
      // Issue codes only (no values), so an incomplete production setup can be diagnosed.
      ...(isDemo() ? {} : { setup: setupReport() }),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
