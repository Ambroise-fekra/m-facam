import 'dotenv/config';
import { Client } from 'pg';
import { baseDbConfig } from '../config/database.config';

async function main() {
  const c = baseDbConfig();
  const db = new Client({
    host: c.host, port: c.port, user: c.username, password: c.password, ssl: c.ssl,
    database: 'facam_FAM_MAMABEBE_0002',
  });
  await db.connect();

  console.log('--- TOP 15 contributeurs caisse ---');
  const top = await db.query(`
    SELECT m.first_name || ' ' || m.last_name AS membre, COUNT(*)::int AS n, SUM(c.amount)::numeric AS total
    FROM contributions c JOIN members m ON m.id = c.member_id
    WHERE c.status = 'completed'
    GROUP BY m.id ORDER BY total DESC LIMIT 15
  `);
  for (const r of top.rows) {
    console.log(`  ${String(r.membre).padEnd(35)} ${String(r.n).padStart(3)} cotis. ${Number(r.total).toFixed(2)} €`);
  }

  console.log('\n--- Évènements externes ---');
  const evts = await db.query(`
    SELECT e.title, COALESCE(SUM(x.amount), 0)::numeric AS total, COUNT(DISTINCT x.member_id)::int AS cotisants
    FROM events e LEFT JOIN external_contributions x ON x.event_id = e.id
    WHERE e.type = 'external'
    GROUP BY e.id ORDER BY e.created_at
  `);
  for (const r of evts.rows) {
    console.log(`  ${String(r.title).substring(0, 50).padEnd(50)} ${String(r.cotisants).padStart(2)} cot. ${Number(r.total).toFixed(2)} €`);
  }

  console.log('\n--- 5 membres nouvellement créés ---');
  const newM = await db.query(`
    SELECT first_name, last_name, gender, is_active
    FROM members
    WHERE created_at >= now() - interval '1 hour'
    ORDER BY created_at DESC
  `);
  for (const r of newM.rows) {
    console.log(`  ${r.first_name} ${r.last_name || '(sans nom)'}  sexe=${r.gender ?? '?'}  actif=${r.is_active}`);
  }

  console.log('\n--- Totaux ---');
  const stats = await db.query(`
    SELECT
      (SELECT COUNT(*)::int FROM members) AS membres,
      (SELECT COALESCE(SUM(amount), 0)::numeric FROM contributions WHERE status='completed') AS caisse,
      (SELECT COALESCE(SUM(amount), 0)::numeric FROM external_contributions) AS externes,
      (SELECT COUNT(*)::int FROM events WHERE type = 'external') AS nb_externes
  `);
  const s = stats.rows[0];
  console.log(`  Membres tenant : ${s.membres}`);
  console.log(`  Caisse totale  : ${Number(s.caisse).toFixed(2)} €`);
  console.log(`  Externes total : ${Number(s.externes).toFixed(2)} €  (${s.nb_externes} évènements)`);

  await db.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
