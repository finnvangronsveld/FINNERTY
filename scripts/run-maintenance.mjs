// Invoke every minute through the host's real scheduler. No process-local timer.
const { APP_URL, JOB_SECRET } = process.env;
if (!APP_URL || !JOB_SECRET) {
  console.error('APP_URL en JOB_SECRET ontbreken.');
  process.exit(1);
}
try {
  const target = new URL('/api/jobs/maintenance', APP_URL);
  if (target.protocol !== 'https:' && !['127.0.0.1', 'localhost'].includes(target.hostname))
    throw new Error();
  const result = await fetch(target, {
    method: 'POST',
    headers: { Authorization: `Bearer ${JOB_SECRET}` },
    signal: AbortSignal.timeout(120000),
  });
  if (!result.ok) throw new Error();
  console.log('Onderhoud uitgevoerd.');
} catch {
  console.error('Onderhoud mislukt; controleer private healthinformatie.');
  process.exitCode = 1;
}
