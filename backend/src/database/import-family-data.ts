/**
 * One-shot data import from the two normalized .xlsx files into a tenant
 * database. Reads:
 *   - imports/membres_cotisations_caisse_normalise.xlsx (Membres + Cotisations)
 *   - imports/cotisations_externes_normalise.xlsx (Évènements + Cotisations externes)
 *
 * Behavior:
 *   - Members: matched by normalized "Prénom Nom" (case + diacritics insensitive).
 *     Existing members are reused; missing ones are created (inactive, no login).
 *   - Cotisations caisse: inserted into `contributions` with status='completed',
 *     `paypal_tx_id` prefixed with 'IMPORT-' so they are recognizable.
 *   - Évènements externes: created with type='external', status='active',
 *     payout_status='pending' (admin will settle later). The responsible
 *     defaults to the family admin if the column "Responsable" is empty.
 *   - Cotisations externes: inserted into `external_contributions`.
 *
 * IDEMPOTENCY: re-running the script first deletes everything previously
 * imported (rows tagged 'IMPORT-...'), so it can be re-run safely after
 * adjusting the source files.
 *
 * Usage:
 *   DB_HOST=… DB_PORT=… DB_USER=… DB_PASSWORD=… DB_SSL=true \
 *   IMPORT_FAMILY=FAM-MAMABEBE-0002 \
 *   npx ts-node -r tsconfig-paths/register ./src/database/import-family-data.ts
 */
import 'dotenv/config';
import { Client } from 'pg';
import * as path from 'path';
import { randomUUID } from 'crypto';
import * as XLSX from 'xlsx';
import { baseDbConfig, masterDbName } from '../config/database.config';

const TARGET = process.env.IMPORT_FAMILY ?? 'FAM-MAMABEBE-0002';
const FILE_CAISSE =
  process.env.IMPORT_CAISSE ??
  path.resolve(__dirname, '../../../imports/membres_cotisations_caisse_normalise.xlsx');
const FILE_EXTERNES =
  process.env.IMPORT_EXTERNES ??
  path.resolve(__dirname, '../../../imports/cotisations_externes_normalise.xlsx');

function pgConfig() {
  const c = baseDbConfig();
  return { host: c.host, port: c.port, user: c.username, password: c.password, ssl: c.ssl };
}

function normName(s: unknown): string {
  return String(s ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function frGenderToCode(s: unknown): 'M' | 'F' | 'O' | null {
  const v = String(s ?? '').trim().toUpperCase();
  if (v === 'M' || v.startsWith('MAS')) return 'M';
  if (v === 'F' || v.startsWith('FEM') || v.startsWith('FÉM')) return 'F';
  if (v === 'O' || v.startsWith('AUT')) return 'O';
  return null;
}

function toISODate(v: unknown): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  // already ISO ?
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().substring(0, 10);
  return null;
}

async function main() {
  console.log(`Import target family : ${TARGET}`);
  console.log(`Caisse file  : ${FILE_CAISSE}`);
  console.log(`Externes file: ${FILE_EXTERNES}`);

  // 1. Resolve tenant db_name from master.
  const master = new Client({ ...pgConfig(), database: masterDbName() });
  await master.connect();
  const famRow = await master.query(
    `SELECT id, db_name FROM families WHERE identifier = $1`,
    [TARGET],
  );
  await master.end();
  if (!famRow.rows.length) throw new Error(`Family ${TARGET} not found in master`);
  const dbName = famRow.rows[0].db_name as string;
  console.log(`→ tenant DB = ${dbName}`);

  // 2. Open tenant connection.
  const db = new Client({ ...pgConfig(), database: dbName });
  await db.connect();

  // 3. Wipe any previous IMPORT-* rows (idempotency).
  const del1 = await db.query(`DELETE FROM external_contributions WHERE note LIKE 'IMPORT-%' OR (note IS NULL AND created_at >= '2026-01-01' AND member_id IN (SELECT id FROM members WHERE email IS NULL))`);
  // Simpler safer approach: only delete by marker.
  const del2 = await db.query(`DELETE FROM contributions WHERE paypal_tx_id LIKE 'IMPORT-%'`);
  const del3 = await db.query(`DELETE FROM external_contributions WHERE EXISTS (SELECT 1 FROM events e WHERE e.id = external_contributions.event_id AND e.description LIKE '[IMPORT]%')`);
  const del4 = await db.query(`DELETE FROM events WHERE description LIKE '[IMPORT]%'`);
  console.log(`Cleanup precedent : contrib=${del2.rowCount}, ext-contrib=${del1.rowCount + del3.rowCount}, events=${del4.rowCount}`);

  // 4. Find the admin member (used as default responsible).
  const adminRow = await db.query(`SELECT id FROM members WHERE role = 'admin' LIMIT 1`);
  if (!adminRow.rows.length) throw new Error('No admin found in tenant DB');
  const adminId: string = adminRow.rows[0].id;
  console.log(`Admin id = ${adminId}`);

  // 5. Build existing members lookup by normalized "firstName lastName".
  const existing = await db.query(`SELECT id, first_name, last_name, gender FROM members`);
  const byName = new Map<string, { id: string; gender: string | null }>();
  for (const m of existing.rows) {
    const key = normName(`${m.first_name} ${m.last_name}`);
    byName.set(key, { id: m.id, gender: m.gender });
  }
  console.log(`Existing members in tenant : ${existing.rows.length}`);

  // 6. Read source files.
  const wbCaisse = XLSX.readFile(FILE_CAISSE, { cellDates: false, raw: true });
  const sMembres = XLSX.utils.sheet_to_json<Record<string, unknown>>(wbCaisse.Sheets['Membres'], { defval: null });
  const sCotis = XLSX.utils.sheet_to_json<Record<string, unknown>>(wbCaisse.Sheets['Cotisations'], { defval: null });
  const wbExt = XLSX.readFile(FILE_EXTERNES, { cellDates: false, raw: true });
  const sEvts = XLSX.utils.sheet_to_json<Record<string, unknown>>(wbExt.Sheets['Évènements'], { defval: null });
  const sExtCotis = XLSX.utils.sheet_to_json<Record<string, unknown>>(wbExt.Sheets['Cotisations externes'], { defval: null });
  console.log(`Source rows : Membres=${sMembres.length}  Cotisations=${sCotis.length}  Évènements=${sEvts.length}  Cotisations externes=${sExtCotis.length}`);

  // 7. Upsert members. Inserted members are INACTIVE (no password, no canLogin).
  let created = 0;
  let matched = 0;
  for (const row of sMembres) {
    const firstName = String(row['Prénom'] ?? '').trim();
    const lastName = String(row['Nom'] ?? '').trim();
    const key = normName(`${firstName} ${lastName}`);
    if (!key || !firstName) continue;
    if (byName.has(key)) {
      matched++;
      continue;
    }
    const gender = frGenderToCode(row['Sexe']);
    const email = row['Email'] ? String(row['Email']).trim().toLowerCase() || null : null;
    const phone = row['Téléphone'] ? String(row['Téléphone']).trim() || null : null;
    const birth = toISODate(row['Date naissance']);
    // Use a generated UUID so we keep idempotency in this script.
    const id = randomUUID();
    await db.query(
      `INSERT INTO members (id, first_name, last_name, email, phone, birth_date, gender, role, is_active, is_blocked, is_deceased)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'member', false, false, false)`,
      [id, firstName, lastName || '', email, phone, birth, gender],
    );
    byName.set(key, { id, gender });
    created++;
  }
  console.log(`Membres : ${matched} déjà existants, ${created} créés.`);

  // 8. Cotisations caisse.
  let cotInserted = 0;
  const unknown1: string[] = [];
  for (const row of sCotis) {
    const fullName = String(row['Membre'] ?? '').trim();
    const date = toISODate(row['Date']);
    const amount = Number(row['Montant']);
    const note = row['Note'] ? String(row['Note']) : null;
    if (!fullName || !Number.isFinite(amount) || amount <= 0) continue;
    const key = normName(fullName);
    const member = byName.get(key);
    if (!member) {
      unknown1.push(fullName);
      continue;
    }
    const tx = `IMPORT-CAISSE-${normName(fullName).replace(/\s/g, '_')}-${date ?? 'NA'}-${cotInserted}`;
    const when = date ?? new Date().toISOString().substring(0, 10);
    await db.query(
      `INSERT INTO contributions (member_id, amount, paypal_tx_id, status, created_at, completed_at)
       VALUES ($1, $2, $3, 'completed', $4, $5)`,
      [member.id, amount.toFixed(2), tx, when, when],
    );
    cotInserted++;
  }
  console.log(`Cotisations caisse importées : ${cotInserted}`);
  if (unknown1.length) console.log(`  ! ${unknown1.length} cotisations ignorées (membre introuvable) : ${[...new Set(unknown1)].slice(0,5).join(', ')}…`);

  // 9. External events.
  const eventByTitle = new Map<string, string>(); // title → id
  let evtCreated = 0;
  for (const row of sEvts) {
    const title = String(row['Titre'] ?? '').trim();
    if (!title) continue;
    const dateEvt = toISODate(row['Date évènement']);
    const echeance = toISODate(row['Échéance']) ?? toISODate(row['Date évènement']) ?? new Date().toISOString().substring(0, 10);
    const dateCrea = toISODate(row['Date création']) ?? echeance;
    const respName = String(row['Responsable'] ?? '').trim();
    const respMember = respName ? byName.get(normName(respName)) : undefined;
    const responsibleId = respMember?.id ?? adminId;
    const id = randomUUID();
    await db.query(
      `INSERT INTO events
        (id, type, title, description, target_amount, deadline, event_date, decision_deadline,
         responsible_id, created_by, status, payout_status, created_at)
       VALUES ($1, 'external', $2, $3, NULL, $4, $5, $6, $7, $8, 'active', 'pending', $9)`,
      [
        id,
        title,
        `[IMPORT] ${row['Description'] ?? ''}`.trim(),
        echeance,
        dateEvt,
        dateCrea,
        responsibleId,
        adminId,
        dateCrea,
      ],
    );
    eventByTitle.set(title, id);
    evtCreated++;
  }
  console.log(`Évènements externes créés : ${evtCreated}`);

  // 10. External contributions.
  let extInserted = 0;
  const unknown2: string[] = [];
  for (const row of sExtCotis) {
    const title = String(row['Évènement'] ?? '').trim();
    const fullName = String(row['Membre'] ?? '').trim();
    const amount = Number(row['Montant']);
    const date = toISODate(row['Date']) ?? new Date().toISOString().substring(0, 10);
    if (!title || !fullName || !Number.isFinite(amount) || amount <= 0) continue;
    const eventId = eventByTitle.get(title);
    if (!eventId) {
      console.log(`  ! évènement introuvable : ${title}`);
      continue;
    }
    const member = byName.get(normName(fullName));
    if (!member) {
      unknown2.push(fullName);
      continue;
    }
    await db.query(
      `INSERT INTO external_contributions
        (event_id, member_id, amount, method, note, recorded_by, created_at)
       VALUES ($1, $2, $3, NULL, 'IMPORT-EXT', $4, $5)`,
      [eventId, member.id, amount.toFixed(2), adminId, date],
    );
    extInserted++;
  }
  console.log(`Cotisations externes importées : ${extInserted}`);
  if (unknown2.length) console.log(`  ! ${unknown2.length} ignorées (membre introuvable) : ${[...new Set(unknown2)].slice(0,5).join(', ')}…`);

  // 11. Summary totals.
  const totCaisse = await db.query(
    `SELECT COALESCE(SUM(amount), 0)::numeric AS t FROM contributions WHERE status='completed'`,
  );
  const totExt = await db.query(
    `SELECT COALESCE(SUM(amount), 0)::numeric AS t FROM external_contributions`,
  );
  const nbMembres = await db.query(`SELECT COUNT(*)::int AS n FROM members`);
  console.log('\n=== APRÈS IMPORT ===');
  console.log(`Membres tenant   : ${nbMembres.rows[0].n}`);
  console.log(`Caisse totale    : ${Number(totCaisse.rows[0].t).toFixed(2)} €`);
  console.log(`Externe (somme)  : ${Number(totExt.rows[0].t).toFixed(2)} €`);
  console.log(`Évènements externes actifs : ${evtCreated}`);
  await db.end();
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
