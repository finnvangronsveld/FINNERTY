import 'server-only';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { isDemo } from '../config';
export async function createDemoDatabase() {
  if (process.env.NODE_ENV === 'production' || !isDemo()) throw new Error('DEMO_DISABLED');
  const directory = path.join(process.cwd(), '.local', 'demo-postgres');
  await mkdir(directory, { recursive: true });
  const db = drizzle(new PGlite(directory));
  await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
  return db;
}
