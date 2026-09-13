import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error('DATABASE_URL ontbreekt. Eerst engine en inhoud inventariseren.');
  if (process.env.MIGRATION_REVIEWED !== 'yes')
    throw new Error(
      'Bekijk de SQL, backup en database-inventaris. Zet MIGRATION_REVIEWED=yes pas na controle.',
    );
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: 'drizzle' });
    console.log('Migraties voltooid.');
  } finally {
    await pool.end();
  }
}
main().catch(() => {
  console.error(
    'Migratie niet uitgevoerd of mislukt. Controleer configuratie en database zonder secrets te loggen.',
  );
  process.exitCode = 1;
});
