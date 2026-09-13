import 'server-only';
import { attachDatabasePool } from '@vercel/functions';
import { isDemo } from '../config';
import type { Database } from './types';
import { Pool } from 'pg';
import { drizzle as postgresDrizzle } from 'drizzle-orm/node-postgres';
const globalDatabase = globalThis as unknown as {
  finnertyDb?: Promise<Database>;
  finnertyProductionDb?: Database;
};
export async function getDb(): Promise<Database> {
  if (isDemo()) return getDemoDb();
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_NOT_CONFIGURED');
  if (!globalDatabase.finnertyProductionDb) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 5000,
      maxLifetimeSeconds: 300,
      statement_timeout: 15000,
    });
    // Idle socket failures must not crash a worker or expose connection details in logs.
    pool.on('error', () => console.error('DATABASE_IDLE_CONNECTION_ERROR'));
    if (process.env.VERCEL) attachDatabasePool(pool);
    globalDatabase.finnertyProductionDb = postgresDrizzle(pool);
  }
  return globalDatabase.finnertyProductionDb;
}
export async function getDemoDb(): Promise<Database> {
  if (process.env.NODE_ENV === 'production' || !isDemo()) throw new Error('DEMO_DISABLED');
  globalDatabase.finnertyDb ??= (async () => {
    const { createDemoDatabase } = await import('./demo');
    return createDemoDatabase();
  })().catch((error) => {
    globalDatabase.finnertyDb = undefined;
    throw error;
  });
  return globalDatabase.finnertyDb;
}
