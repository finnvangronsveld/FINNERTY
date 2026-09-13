import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
/** Shared typed PostgreSQL query/transaction interface for pg and local PGlite. */
export type Database = PgDatabase<PgQueryResultHKT>;
