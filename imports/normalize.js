/**
 * Normalize the two input Excel files into the import format expected by the
 * import-family.ts script. Reads two files, writes two normalized files in
 * imports/, and prints a summary report.
 */
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const SRC1 = String.raw`C:\Users\alcal\OneDrive\0_Documents\Cotisations_Caisse_Solidarité_FAM-MAMABEBE-0002.xlsx`;
const SRC2 = String.raw`C:\Users\alcal\OneDrive\0_Documents\cotisations évènement extra FAM-MAMABEBE-0002.xlsx`;
const OUT_DIR = String.raw`C:\Dev\M-FACAM\imports`;
const OUT1 = path.join(OUT_DIR, 'membres_cotisations_caisse_normalise.xlsx');
const OUT2 = path.join(OUT_DIR, 'cotisations_externes_normalise.xlsx');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Excel serial date → ISO YYYY-MM-DD.
function serialToISO(s) {
  if (s == null || s === '') return '';
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return '';
  // Excel epoch is 1899-12-30 (accounts for the 1900 leap-year bug).
  const ms = (n - 25569) * 86400 * 1000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

// "Ambroise LOEMBA" → { firstName: 'Ambroise', lastName: 'LOEMBA' }
// "Marie Dieudonnée BANDER" → { firstName: 'Marie Dieudonnée', lastName: 'BANDER' }
// Heuristic: last whitespace-separated token = lastName (often uppercase).
function splitName(full) {
  if (!full) return { firstName: '', lastName: '' };
  const parts = String(full).trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
}

const anomalies = [];
// Normalize a name for matching: trim, lowercase, strip diacritics ("Régis" ≡ "Regis").
function normName(s) {
  return String(s ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

const memberMap = new Map(); // key = normName(fullName), value = { firstName, lastName, gender, ... }
function upsertMember(fullName, gender = '') {
  const key = normName(fullName);
  if (!key) return null;
  if (!memberMap.has(key)) {
    const { firstName, lastName } = splitName(fullName);
    memberMap.set(key, {
      firstName,
      lastName,
      gender, // 'M' / 'F' / '' (to be filled)
      email: '',
      phone: '',
      birthDate: '',
      father: '',
      mother: '',
      canLogin: 'NON',
    });
  } else if (gender && !memberMap.get(key).gender) {
    memberMap.get(key).gender = gender;
  }
  return memberMap.get(key);
}

// ============ FILE 1 — Cotisations caisse ============
const wb1 = XLSX.readFile(SRC1, { cellDates: false, raw: true });
const ws1 = wb1.Sheets[wb1.SheetNames[0]];
const data1 = XLSX.utils.sheet_to_json(ws1, { defval: null, header: 1 });

// Layout: rows 0-3 are headers/aggregates. From row 4 onwards: each row = a member.
// Col 0: total ; Col 1: Sexe (Masculin/Féminin) ; Col 2: nom complet
// From col 3 onwards: alternating (amount, date) pairs — col 3,5,7… = amounts ; col 4,6,8… = dates
// Row 1 col 3 holds the start month serial (e.g. 44927 = 2023-01-01). Each pair
// of columns corresponds to the NEXT month. If a contribution has no explicit
// date, we infer the 15th of the implied month from the column position.
const startSerial = Number(data1[1]?.[3]) || 44927;
const startDate = new Date((startSerial - 25569) * 86400 * 1000);
function inferDateFromColumn(c) {
  const monthsOffset = Math.floor((c - 3) / 2);
  const d = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + monthsOffset, 15));
  return d.toISOString().slice(0, 10);
}

const cotisations1 = [];
let file1MemberCount = 0;
let inferredDates = 0;
for (let r = 4; r < data1.length; r++) {
  const row = data1[r];
  if (!row || !row[2]) continue;
  const fullName = String(row[2]).trim();
  const sexeFR = String(row[1] ?? '').trim();
  const gender = sexeFR.startsWith('Masc') ? 'M' : sexeFR.startsWith('Fém') || sexeFR.startsWith('Fem') ? 'F' : '';
  upsertMember(fullName, gender);
  file1MemberCount++;
  for (let c = 3; c < row.length; c += 2) {
    const amount = row[c];
    const dateSerial = row[c + 1];
    if (amount == null || amount === '' || Number(amount) === 0) continue;
    const amtNum = Number(amount);
    if (!Number.isFinite(amtNum) || amtNum <= 0) continue;
    let iso = serialToISO(dateSerial);
    let note = '';
    if (!iso) {
      iso = inferDateFromColumn(c);
      note = 'date inférée du mois (origine sans date)';
      inferredDates++;
    }
    cotisations1.push({ Date: iso, Membre: fullName, Montant: amtNum, Note: note });
  }
}

// ============ FILE 2 — Cotisations évènements externes ============
const wb2 = XLSX.readFile(SRC2, { cellDates: false, raw: true });
const ws2 = wb2.Sheets[wb2.SheetNames[0]];
const data2 = XLSX.utils.sheet_to_json(ws2, { defval: null, header: 1 });
// Header at row 0: Evènement | date création | date échéance | Date évènement | cotisant | Date | Montant
const eventsMap = new Map(); // key = event title → { title, dateCreation, dateEcheance, dateEvenement }
const cotisations2 = [];
for (let r = 1; r < data2.length; r++) {
  const row = data2[r];
  if (!row || !row[0]) continue;
  const title = String(row[0]).trim();
  const dCrea = serialToISO(row[1]);
  const dEch = serialToISO(row[2]);
  const dEvt = serialToISO(row[3]);
  const cotisant = String(row[4] ?? '').trim();
  const dCot = serialToISO(row[5]);
  const montant = Number(row[6]);
  if (!cotisant || !Number.isFinite(montant) || montant <= 0) {
    if (cotisant || row[6]) {
      anomalies.push(`Externe: ligne ${r + 1} ignorée (cotisant ou montant invalide).`);
    }
    continue;
  }
  if (!eventsMap.has(title)) {
    eventsMap.set(title, {
      Titre: title,
      'Date création': dCrea,
      'Date évènement': dEvt,
      'Échéance': dEch,
      'Montant objectif': '',
      'Suggestion par membre': '',
      Responsable: '',
      Description: '',
    });
  }
  upsertMember(cotisant);
  // For external contributions without date, default to the event creation date.
  const dCotFinal = dCot || dCrea || '';
  if (!dCot) anomalies.push(`Externe: ${cotisant} — ${montant} € sur "${title.substring(0,40)}…" sans date (fallback : date création évènement).`);
  cotisations2.push({
    Évènement: title,
    Date: dCotFinal,
    Membre: cotisant,
    Montant: montant,
    Note: '',
  });
}

// ============ WRITE OUTPUT FILE 1 (caisse) ============
const membersRows = Array.from(memberMap.values()).map((m) => ({
  Prénom: m.firstName,
  Nom: m.lastName,
  Sexe: m.gender,
  Email: m.email,
  Téléphone: m.phone,
  'Date naissance': m.birthDate,
  Père: m.father,
  Mère: m.mother,
  'Peut se connecter': m.canLogin,
}));
const wbOut1 = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbOut1, XLSX.utils.json_to_sheet(membersRows), 'Membres');
XLSX.utils.book_append_sheet(wbOut1, XLSX.utils.json_to_sheet(cotisations1), 'Cotisations');
XLSX.writeFile(wbOut1, OUT1);

// ============ WRITE OUTPUT FILE 2 (externes) ============
const wbOut2 = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbOut2, XLSX.utils.json_to_sheet(Array.from(eventsMap.values())), 'Évènements');
XLSX.utils.book_append_sheet(wbOut2, XLSX.utils.json_to_sheet(cotisations2), 'Cotisations externes');
XLSX.writeFile(wbOut2, OUT2);

// ============ SUMMARY ============
const totalCaisse = cotisations1.reduce((s, c) => s + c.Montant, 0);
console.log('=== RAPPORT ===');
console.log(`Membres uniques détectés : ${memberMap.size}`);
const sexed = Array.from(memberMap.values()).filter((m) => m.gender).length;
console.log(`  dont sexe renseigné  : ${sexed}`);
console.log(`  dont sexe à compléter : ${memberMap.size - sexed}`);
const noGender = Array.from(memberMap.values()).filter((m) => !m.gender);
if (noGender.length) {
  console.log('  → membres sans sexe (à compléter manuellement dans le fichier) :');
  noGender.forEach((m) => console.log(`     • ${m.firstName} ${m.lastName}`));
}
console.log(`Cotisations caisse     : ${cotisations1.length} lignes — total ${totalCaisse.toFixed(2)} €  (dont ${inferredDates} dates inférées)`);
console.log(`Évènements externes    : ${eventsMap.size}`);
console.log(`Cotisations externes   : ${cotisations2.length} lignes`);
const perEvent = new Map();
for (const c of cotisations2) {
  perEvent.set(c.Évènement, (perEvent.get(c.Évènement) ?? 0) + c.Montant);
}
console.log('  Détail par évènement :');
for (const [t, sum] of perEvent.entries()) {
  console.log(`    - "${t.substring(0, 50)}${t.length > 50 ? '…' : ''}" → ${sum.toFixed(2)} €`);
}
console.log();
console.log('=== ANOMALIES ===');
if (anomalies.length === 0) {
  console.log('Aucune.');
} else {
  anomalies.forEach((a) => console.log('• ' + a));
}
console.log();
console.log('=== FICHIERS GÉNÉRÉS ===');
console.log('• ' + OUT1);
console.log('• ' + OUT2);
