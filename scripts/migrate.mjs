// Applies db/*.sql in order. Usage: node --env-file=.env.local scripts/migrate.mjs
import { readdirSync, readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const sql = neon(url);
for (const file of readdirSync('db').filter((f) => f.endsWith('.sql')).sort()) {
  const statements = readFileSync(`db/${file}`, 'utf8')
    .split(/;\s*$/m)
    .map((s) => s.replace(/^\s*--.*$/gm, '').trim())
    .filter(Boolean);
  for (const s of statements) await sql.query(s);
  console.log(`applied ${file} (${statements.length} statements)`);
}
