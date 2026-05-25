/**
 * Stand-alone migration runner.
 *
 *   ts-node src/database/run-migrations.ts master      → creates / migrates facam_master
 *   ts-node src/database/run-migrations.ts template    → creates / migrates facam_template
 *
 * For per-family databases, `TenantRoutingService.createTenantDatabase` does a
 * native `CREATE DATABASE … WITH TEMPLATE facam_template`, so no separate
 * migration call is needed at family-creation time.
 */
import 'dotenv/config';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';
import { baseDbConfig, masterDbName, templateDbName } from '../config/database.config';

/** Maps the TypeORM-shaped config (`username`) to node-postgres (`user`). */
function pgConfig() {
  const c = baseDbConfig();
  return { host: c.host, port: c.port, user: c.username, password: c.password, ssl: c.ssl };
}

async function ensureDatabase(dbName: string) {
  const admin = new Client({ ...pgConfig(), database: 'postgres' });
  await admin.connect();
  const exists = await admin.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
  if (exists.rowCount === 0) {
    console.log(`Creating database ${dbName}`);
    await admin.query(`CREATE DATABASE "${dbName}"`);
  }
  await admin.end();
}

async function runMigrations(dbName: string, folder: string) {
  await ensureDatabase(dbName);
  const client = new Client({ ...pgConfig(), database: dbName });
  await client.connect();
  const files = readdirSync(folder).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    console.log(`Applying ${file} on ${dbName}`);
    const sql = readFileSync(join(folder, file), 'utf8');
    await client.query(sql);
  }
  await client.end();
}

async function main() {
  const target = process.argv[2];
  if (target === 'master') {
    await runMigrations(masterDbName(), join(__dirname, 'master/migrations'));
  } else if (target === 'template') {
    await runMigrations(templateDbName(), join(__dirname, 'tenant/migrations'));
  } else {
    console.error('Usage: run-migrations.ts <master|template>');
    process.exit(1);
  }
  console.log('Migrations done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
