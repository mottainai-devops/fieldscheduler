// server/scripts/update_maf_tags.mjs
// Migration: Update fieldManagerTags for lot restructuring
// - Lot 076: SAY-076 → MOT-076 (Mottainai retains lot 076)
// - Lot 099: CUM-099 → AFT-099 (AFT Okuleye takes lot 099)
// - Lot 415: CUM-415 → DAL-415 (Dalco Ventures takes lot 415)
// - Lot 074: Add YUS-074 (Yusro Enterprise, Halleluyah field manager)
// - Lot 414: EOA-414 → DAL-414 (Dalco Ventures takes lot 414)

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: './server/_core/.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

// Parse the DATABASE_URL
// Format: mysql://user:password@host:port/database?ssl={"rejectUnauthorized":true}
const url = new URL(DATABASE_URL);
const host = url.hostname;
const port = parseInt(url.port) || 4000;
const user = url.username;
const password = decodeURIComponent(url.password);
const database = url.pathname.replace('/', '');

console.log(`Connecting to TiDB: ${host}:${port} / ${database}`);

const connection = await mysql.createConnection({
  host,
  port,
  user,
  password,
  database,
  ssl: { rejectUnauthorized: false },
});

console.log('Connected successfully.\n');

// =====================================================================
// STEP 1: Show current state of affected tags
// =====================================================================
console.log('=== CURRENT STATE OF AFFECTED TAGS ===');
const [currentTags] = await connection.execute(
  `SELECT id, fieldManagerId, customermaf, description 
   FROM fieldManagerTags 
   WHERE customermaf IN ('SAY-076', 'CUM-099', 'CUM-415', 'EOA-414', 'MOT-076', 'AFT-099', 'DAL-415', 'DAL-414', 'YUS-074')
   ORDER BY fieldManagerId, customermaf`
);
console.table(currentTags);

// =====================================================================
// STEP 2: Get field manager IDs for Halleluyah (2) and Juwon (3)
// =====================================================================
const [workers] = await connection.execute(
  `SELECT id, name FROM workers WHERE name IN ('Halleluyah', 'Juwon') ORDER BY id`
);
console.log('\n=== FIELD MANAGERS ===');
console.table(workers);

const halleluyah = workers.find(w => w.name === 'Halleluyah');
const juwon = workers.find(w => w.name === 'Juwon');

if (!halleluyah || !juwon) {
  console.error('Could not find Halleluyah or Juwon in workers table');
  console.log('All workers:');
  const [allWorkers] = await connection.execute('SELECT id, name FROM workers ORDER BY id');
  console.table(allWorkers);
  process.exit(1);
}

console.log(`\nHalleluyah ID: ${halleluyah.id}`);
console.log(`Juwon ID: ${juwon.id}`);

// =====================================================================
// STEP 3: Delete old tags
// =====================================================================
console.log('\n=== DELETING OLD TAGS ===');

const toDelete = [
  { fieldManagerId: halleluyah.id, customermaf: 'SAY-076' },
  { fieldManagerId: halleluyah.id, customermaf: 'CUM-099' },
  { fieldManagerId: halleluyah.id, customermaf: 'CUM-415' },
  { fieldManagerId: juwon.id,      customermaf: 'EOA-414' },
];

for (const tag of toDelete) {
  const [result] = await connection.execute(
    `DELETE FROM fieldManagerTags WHERE fieldManagerId = ? AND customermaf = ?`,
    [tag.fieldManagerId, tag.customermaf]
  );
  const affected = result.affectedRows;
  console.log(`  DELETE ${tag.customermaf} from manager ${tag.fieldManagerId}: ${affected} row(s) affected`);
}

// =====================================================================
// STEP 4: Insert new tags
// =====================================================================
console.log('\n=== INSERTING NEW TAGS ===');

const now = new Date();
const toInsert = [
  { fieldManagerId: halleluyah.id, customermaf: 'MOT-076', description: 'Lot 076 - Mottainai Recycling (replaces SAY-076)' },
  { fieldManagerId: halleluyah.id, customermaf: 'AFT-099', description: 'Lot 099 - AFT Okuleye & Son (replaces CUM-099)' },
  { fieldManagerId: halleluyah.id, customermaf: 'DAL-415', description: 'Lot 415 - Dalco Ventures (replaces CUM-415)' },
  { fieldManagerId: halleluyah.id, customermaf: 'YUS-074', description: 'Lot 074 - Yusro Enterprise (new)' },
  { fieldManagerId: juwon.id,      customermaf: 'DAL-414', description: 'Lot 414 - Dalco Ventures (replaces EOA-414)' },
];

for (const tag of toInsert) {
  try {
    const [result] = await connection.execute(
      `INSERT INTO fieldManagerTags (fieldManagerId, customermaf, description, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE description = VALUES(description), updatedAt = VALUES(updatedAt)`,
      [tag.fieldManagerId, tag.customermaf, tag.description, now, now]
    );
    console.log(`  INSERT ${tag.customermaf} for manager ${tag.fieldManagerId}: OK (${result.affectedRows} row affected)`);
  } catch (err) {
    console.error(`  ERROR inserting ${tag.customermaf}: ${err.message}`);
  }
}

// =====================================================================
// STEP 5: Verify final state
// =====================================================================
console.log('\n=== FINAL STATE (Halleluyah & Juwon tags) ===');
const [finalTags] = await connection.execute(
  `SELECT t.id, w.name as fieldManager, t.customermaf, t.description
   FROM fieldManagerTags t
   JOIN workers w ON w.id = t.fieldManagerId
   WHERE t.fieldManagerId IN (?, ?)
   ORDER BY w.name, t.customermaf`,
  [halleluyah.id, juwon.id]
);
console.table(finalTags);

await connection.end();
console.log('\nMigration complete.');
