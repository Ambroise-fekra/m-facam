/**
 * Seeds a test family with members, events, contributions and allocations so
 * the mobile app shows realistic data immediately.
 *
 *   npm run seed
 *
 * Re-runs are idempotent for the family identifier — it is dropped and
 * recreated each time.
 */
import 'dotenv/config';
import { Client } from 'pg';
import * as bcrypt from 'bcrypt';
import { baseDbConfig, masterDbName, tenantDbName, templateDbName } from '../config/database.config';

const FAMILY_IDENTIFIER = 'FAM-DUPONT-DEMO';
const FAMILY_NAME = 'DUPONT (démo)';
const ADMIN_EMAIL = 'admin@dupont.demo';
const ADMIN_PWD = 'demo1234';

/** Maps the TypeORM-shaped config (`username`) to node-postgres (`user`). */
function pgConfig() {
  const c = baseDbConfig();
  return { host: c.host, port: c.port, user: c.username, password: c.password, ssl: c.ssl };
}

async function master() {
  const c = new Client({ ...pgConfig(), database: masterDbName() });
  await c.connect();
  return c;
}
async function admin() {
  const c = new Client({ ...pgConfig(), database: 'postgres' });
  await c.connect();
  return c;
}

async function recreateTenantDb(dbName: string) {
  const a = await admin();
  try {
    await a.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`,
      [dbName],
    );
    await a.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    await a.query(`CREATE DATABASE "${dbName}" WITH TEMPLATE "${templateDbName()}"`);
  } finally {
    await a.end();
  }
}

async function main() {
  const dbName = tenantDbName(FAMILY_IDENTIFIER);

  // 1. Reset master rows for the demo family.
  const m = await master();
  try {
    await m.query(`DELETE FROM subscriptions WHERE family_id IN (SELECT id FROM families WHERE identifier = $1)`, [FAMILY_IDENTIFIER]);
    await m.query(`DELETE FROM families WHERE identifier = $1`, [FAMILY_IDENTIFIER]);

    // 2. Reset the tenant DB by cloning the template.
    await recreateTenantDb(dbName);

    // 3. Insert the family + 30-day trial.
    const fam = await m.query(
      `INSERT INTO families (identifier, name, db_name, admin_email, paypal_email, whatsapp_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'trial') RETURNING id`,
      [FAMILY_IDENTIFIER, FAMILY_NAME, dbName, ADMIN_EMAIL, 'famille.dupont@paypal.example', 'https://chat.whatsapp.com/demo'],
    );
    const familyId = fam.rows[0].id;
    const trialEnd = new Date(Date.now() + 30 * 86_400_000);
    await m.query(
      `INSERT INTO subscriptions (family_id, state, trial_started_at, trial_ends_at, price_eur)
       VALUES ($1, 'trial', now(), $2, 10)`,
      [familyId, trialEnd],
    );

    // Directory entries so members can recover the identifier by email.
    for (const email of [ADMIN_EMAIL, 'sophie@dupont.demo', 'paul@dupont.demo', 'marie@dupont.demo']) {
      await m.query(
        `INSERT INTO member_directory (email, family_id, family_identifier) VALUES ($1, $2, $3)`,
        [email, familyId, FAMILY_IDENTIFIER],
      );
    }
  } finally {
    await m.end();
  }

  // 4. Tenant data.
  const t = new Client({ ...pgConfig(), database: dbName });
  await t.connect();
  try {
    const hash = await bcrypt.hash(ADMIN_PWD, 10);
    const adminId = (
      await t.query(
        `INSERT INTO members (first_name, last_name, email, password_hash, role, gender, birth_date)
         VALUES ('Jean', 'DUPONT', $1, $2, 'admin', 'M', '1985-05-12') RETURNING id`,
        [ADMIN_EMAIL, hash],
      )
    ).rows[0].id;

    const sophieId = (
      await t.query(
        `INSERT INTO members (first_name, last_name, email, role, gender, birth_date, mother_id)
         VALUES ('Sophie', 'DUPONT', 'sophie@dupont.demo', 'member', 'F', '2010-09-04', NULL) RETURNING id`,
      )
    ).rows[0].id;

    const paulId = (
      await t.query(
        `INSERT INTO members (first_name, last_name, email, role, gender, birth_date, father_id)
         VALUES ('Paul', 'DUPONT', 'paul@dupont.demo', 'member', 'M', '1960-03-21', NULL) RETURNING id`,
      )
    ).rows[0].id;

    const marieId = (
      await t.query(
        `INSERT INTO members (first_name, last_name, email, role, gender, birth_date)
         VALUES ('Marie', 'DUPONT', 'marie@dupont.demo', 'member', 'F', '1962-11-08') RETURNING id`,
      )
    ).rows[0].id;

    // Link Jean's parents.
    await t.query(`UPDATE members SET father_id = $1, mother_id = $2 WHERE id = $3`, [paulId, marieId, adminId]);
    // Link Sophie as Jean's daughter.
    await t.query(`UPDATE members SET father_id = $1 WHERE id = $2`, [adminId, sophieId]);

    // Events (active = validés). event_date = date de la cérémonie ; deadline = clôture cotisations.
    const weddingId = (
      await t.query(
        `INSERT INTO events (type, title, description, target_amount, event_date, deadline, responsible_id, created_by, status)
         VALUES ('wedding', 'Mariage de Sophie', 'Cérémonie + réception', 2400,
                 current_date + interval '75 days', current_date + interval '60 days', $1, $2, 'active')
         RETURNING id`,
        [adminId, adminId],
      )
    ).rows[0].id;

    const projectId = (
      await t.query(
        `INSERT INTO events (type, title, description, target_amount, event_date, deadline, responsible_id, created_by, status)
         VALUES ('project', 'Construction maison', 'Achat matériaux', 5000,
                 current_date + interval '120 days', current_date + interval '120 days', $1, $2, 'active')
         RETURNING id`,
        [paulId, adminId],
      )
    ).rows[0].id;

    // A proposed event currently under vote (to showcase the voting UI).
    const proposalId = (
      await t.query(
        `INSERT INTO events (type, title, description, target_amount, event_date, deadline, decision_deadline, responsible_id, created_by, status)
         VALUES ('project', 'Voyage familial été', 'Séjour groupé au village', 3000,
                 current_date + interval '150 days', current_date + interval '140 days', current_date + interval '6 days', $1, $2, 'proposed')
         RETURNING id`,
        [marieId, paulId],
      )
    ).rows[0].id;

    // A few anonymous votes on the proposal (1 yes so far).
    await t.query(`INSERT INTO event_votes (event_id, member_id, value) VALUES ($1, $2, 'yes')`, [proposalId, paulId]);

    // Contributions (all completed).
    for (const [memberId, amount] of [
      [adminId, 450],
      [adminId, 300],
      [sophieId, 80],
      [paulId, 920],
      [marieId, 650],
    ] as const) {
      await t.query(
        `INSERT INTO contributions (member_id, amount, status, completed_at)
         VALUES ($1, $2, 'completed', now())`,
        [memberId, amount],
      );
    }

    // Allocations.
    for (const [eventId, memberId, amount] of [
      [weddingId, adminId, 200],
      [weddingId, paulId, 400],
      [weddingId, marieId, 250],
      [projectId, adminId, 150],
      [projectId, paulId, 300],
    ] as const) {
      await t.query(
        `INSERT INTO allocations (event_id, member_id, amount) VALUES ($1, $2, $3)`,
        [eventId, memberId, amount],
      );
    }

    // One demo notification per member.
    for (const memberId of [adminId, sophieId, paulId, marieId]) {
      await t.query(
        `INSERT INTO notifications (member_id, type, title, body)
         VALUES ($1, 'event_created', 'Bienvenue', 'Votre famille démo est prête. Bon test !')`,
        [memberId],
      );
    }
  } finally {
    await t.end();
  }

  console.log('---');
  console.log('Seed OK');
  console.log(`Identifiant famille : ${FAMILY_IDENTIFIER}`);
  console.log(`Admin email         : ${ADMIN_EMAIL}`);
  console.log(`Admin password      : ${ADMIN_PWD}`);
  console.log('---');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
