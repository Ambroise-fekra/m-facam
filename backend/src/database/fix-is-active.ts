/**
 * One-shot data fix: align is_active with reality.
 *
 * Historical members were created with is_active=true by default, even those
 * who never had a password (just declared in the family tree). The "actif"
 * definition is now stricter (must have a password). This script sets
 * is_active=false on every member without password_hash and not deceased,
 * across every tenant database.
 *
 * Safe to re-run (no-op on already-corrected rows). Run once per environment:
 *   npm exec ts-node -- -r tsconfig-paths/register ./src/database/fix-is-active.ts
 */
import 'dotenv/config';
import { Client } from 'pg';
import { baseDbConfig, masterDbName } from '../config/database.config';

function pgConfig() {
  const c = baseDbConfig();
  return { host: c.host, port: c.port, user: c.username, password: c.password, ssl: c.ssl };
}

async function run() {
  const m = new Client({ ...pgConfig(), database: masterDbName() });
  await m.connect();
  const rows = await m.query(`SELECT db_name FROM families WHERE status <> 'deleted' ORDER BY created_at`);
  await m.end();
  for (const r of rows.rows) {
    const c = new Client({ ...pgConfig(), database: r.db_name });
    await c.connect();
    const res = await c.query(
      `UPDATE members SET is_active = false
        WHERE password_hash IS NULL AND deceased_at IS NULL AND is_active = true`,
    );
    console.log(`${r.db_name}: ${res.rowCount} membre(s) passé(s) en is_active=false`);
    await c.end();
  }
  console.log('Done.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
