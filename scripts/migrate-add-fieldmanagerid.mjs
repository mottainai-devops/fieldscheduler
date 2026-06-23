/**
 * Targeted migration: add fieldManagerId column to users table.
 *
 * This script is idempotent — it checks whether the column already exists
 * before attempting to add it, so it is safe to run multiple times.
 *
 * Run: node scripts/migrate-add-fieldmanagerid.mjs
 *
 * Why this exists instead of drizzle-kit push:
 *   The migration journal is out of sync with the live production DB
 *   (columns were added directly without updating the journal). drizzle-kit
 *   push prompts interactively for unique-constraint warnings on the invoices
 *   table and cannot be run non-interactively in CI. This script applies only
 *   the specific column needed for fieldManagerId scoping to work.
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('[migrate] ERROR: DATABASE_URL is not set');
  process.exit(1);
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  console.log('[migrate] Connected to database');

  try {
    // Check if the column already exists
    const [rows] = await conn.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'users'
         AND COLUMN_NAME = 'fieldManagerId'`
    );

    if (rows.length > 0) {
      console.log('[migrate] fieldManagerId column already exists in users table — skipping');
    } else {
      await conn.execute(
        `ALTER TABLE users ADD COLUMN fieldManagerId int NULL,
         ADD CONSTRAINT users_fieldManagerId_fk
           FOREIGN KEY (fieldManagerId) REFERENCES workers(id)
           ON DELETE SET NULL`
      );
      console.log('[migrate] SUCCESS: fieldManagerId column added to users table');
    }

    // Also check/add routeAssignmentStatus to customers if missing
    const [csRows] = await conn.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'customers'
         AND COLUMN_NAME = 'routeAssignmentStatus'`
    );
    if (csRows.length > 0) {
      console.log('[migrate] routeAssignmentStatus column already exists in customers — skipping');
    } else {
      await conn.execute(
        `ALTER TABLE customers ADD COLUMN routeAssignmentStatus varchar(50) NULL`
      );
      console.log('[migrate] SUCCESS: routeAssignmentStatus column added to customers table');
    }

  } finally {
    await conn.end();
    console.log('[migrate] Done');
  }
}

main().catch(err => {
  console.error('[migrate] FATAL:', err.message);
  process.exit(1);
});
