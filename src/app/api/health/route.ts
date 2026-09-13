export async function GET() {
  return Response.json(
    { status: 'ok', release: '0.1.0', integrations: 'not-verified' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
