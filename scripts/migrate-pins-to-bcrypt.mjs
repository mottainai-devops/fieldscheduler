/**
 * T34 Part 2 — One-time migration: hash all plaintext PINs to bcrypt
 *
 * Usage (on the production server):
 *   cd ~/field-worker-scheduler
 *   node scripts/migrate-pins-to-bcrypt.mjs
 *
 * The script:
 *  1. Reads all workers with a non-null PIN from the DB
 *  2. Skips any PIN that is already a bcrypt hash (idempotent)
 *  3. Hashes plaintext PINs with bcrypt (cost factor 12)
 *  4. Updates the workers table in place
 *  5. Prints a summary of migrated / skipped / failed rows
 *
 * Safe to run multiple times — already-hashed PINs are skipped.
 */

import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BCRYPT_ROUNDS = 12;

function isBcryptHash(value) {
  return (
    value.startsWith('$2a$') ||
    value.startsWith('$2b$') ||
    value.startsWith('$2y$')
  );
}

async function main() {
  const connectionString = process.env.FIELD_WORKER_DB_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('[Migration] ERROR: No database connection string found in environment.');
    console.error('[Migration] Set FIELD_WORKER_DB_URL or DATABASE_URL in .env');
    process.exit(1);
  }

  console.log('[Migration] Connecting to database...');
  const conn = await mysql.createConnection(connectionString);

  try {
    // Fetch all workers with a non-null PIN
    const [rows] = await conn.execute(
      'SELECT id, name, email, pin FROM workers WHERE pin IS NOT NULL'
    );

    console.log(`[Migration] Found ${rows.length} workers with non-null PIN`);

    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    for (const worker of rows) {
      const { id, name, email, pin } = worker;

      if (isBcryptHash(pin)) {
        console.log(`[Migration] SKIP  id=${id} ${email} — already a bcrypt hash`);
        skipped++;
        continue;
      }

      try {
        const hash = await bcrypt.hash(pin, BCRYPT_ROUNDS);
        await conn.execute('UPDATE workers SET pin = ? WHERE id = ?', [hash, id]);
        console.log(`[Migration] OK    id=${id} ${email} — plaintext PIN hashed (${BCRYPT_ROUNDS} rounds)`);
        migrated++;
      } catch (err) {
        console.error(`[Migration] FAIL  id=${id} ${email} — ${err.message}`);
        failed++;
      }
    }

    console.log('');
    console.log('─────────────────────────────────────────────');
    console.log(`[Migration] Summary:`);
    console.log(`  Migrated : ${migrated}`);
    console.log(`  Skipped  : ${skipped} (already bcrypt)`);
    console.log(`  Failed   : ${failed}`);
    console.log('─────────────────────────────────────────────');

    if (failed > 0) {
      console.error('[Migration] Some PINs failed to migrate — check output above.');
      process.exit(1);
    }

    console.log('[Migration] Done. All plaintext PINs have been hashed.');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('[Migration] Fatal error:', err);
  process.exit(1);
});
