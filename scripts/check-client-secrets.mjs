import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
const names = [
  'STREAMELEMENTS_JWT',
  'TWITCH_CLIENT_SECRET',
  'AUTH_SECRET',
  'JOB_SECRET',
  'CRON_SECRET',
  'DATABASE_URL',
  'EVENTSUB_SECRET',
];
const values = names
  .map((name) => process.env[name])
  .filter((value) => value && value.length >= 16);
if (!values.length) {
  console.error('Geen testsecrets ingesteld; controle niet uitgevoerd.');
  process.exit(1);
}
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) await scan(filename);
    else {
      const data = await readFile(filename);
      if (values.some((value) => data.includes(Buffer.from(value))))
        throw new Error('Secret in clientbundle');
    }
  }
}
try {
  await scan('.next/static');
  console.log('Geen ingestelde testsecrets aangetroffen in browserbestanden.');
} catch {
  console.error('Clientbundlecontrole mislukt. Geen secretwaarden gelogd.');
  process.exitCode = 1;
}
