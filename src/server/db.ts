import 'server-only';
import { neon } from '@neondatabase/serverless';

let client: ReturnType<typeof neon> | null = null;

export function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  client ??= neon(url);
  return client;
}

export const hasDb = () => !!process.env.DATABASE_URL;
