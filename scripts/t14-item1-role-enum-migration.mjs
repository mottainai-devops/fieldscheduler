/**
 * T14 Item 1 — Role Enum Extension Migration
 *
 * Three coordinated changes (atomic per Rule 19):
 *
 * 1. users.role: add 'superadmin' and 'supervisor' values, data-migrate
 *    'system_admin' → 'superadmin', then remove 'system_admin'.
 *    Final enum: ('user', 'admin', 'field_manager', 'superadmin', 'supervisor')
 *
 * 2. routes.status: add 'pending_assignment' value.
 *    Final enum: ('pending', 'pending_assignment', 'optimized', 'assigned',
 *                 'in_progress', 'completed', 'cancelled')
 *
 * Safe to re-run — each step is wrapped in a try/catch that skips on
 * "already exists" / "data already migrated" conditions.
 */

import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");
const envContent = readFileSync(envPath, "utf8");
const dbUrl = envContent.match(/DATABASE_URL=(.+)/)?.[1]?.trim();

if (!dbUrl) {
  console.error("❌ DATABASE_URL not found in .env");
  process.exit(1);
}

const conn = await createConnection(dbUrl);

try {
  console.log("=== T14 Item 1: Role Enum Extension Migration ===\n");

  // ─────────────────────────────────────────────────────────────────────────
  // Step 1a: Add 'superadmin' and 'supervisor' to users.role enum
  // MySQL MODIFY COLUMN replaces the entire enum definition atomically.
  // We include all current values + new values in the new definition.
  // ─────────────────────────────────────────────────────────────────────────
  console.log("Step 1a: Extending users.role enum to include superadmin + supervisor...");
  const [[currentRoleCol]] = await conn.query("SHOW COLUMNS FROM users LIKE 'role'");
  const currentType = currentRoleCol?.Type ?? "";
  console.log("  Current type:", currentType);

  if (currentType.includes("superadmin") && currentType.includes("supervisor")) {
    console.log("  ⏭️  users.role already has superadmin + supervisor — skipping Step 1a");
  } else {
    await conn.query(`
      ALTER TABLE users
      MODIFY COLUMN \`role\` ENUM('user','admin','field_manager','system_admin','superadmin','supervisor')
        NOT NULL DEFAULT 'user'
    `);
    console.log("  ✅ Added superadmin + supervisor to users.role enum");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step 1b: Data migration — system_admin → superadmin
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\nStep 1b: Migrating users.role = 'system_admin' → 'superadmin'...");
  const [[{ count: sysAdminCount }]] = await conn.query(
    "SELECT COUNT(*) as count FROM users WHERE role = 'system_admin'"
  );
  console.log(`  Found ${sysAdminCount} user(s) with role='system_admin'`);

  if (sysAdminCount > 0) {
    const [result] = await conn.query(
      "UPDATE users SET role = 'superadmin' WHERE role = 'system_admin'"
    );
    console.log(`  ✅ Migrated ${result.affectedRows} row(s) from system_admin → superadmin`);
  } else {
    console.log("  ⏭️  No system_admin rows to migrate");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step 1c: Remove 'system_admin' from users.role enum
  // Final enum: ('user', 'admin', 'field_manager', 'superadmin', 'supervisor')
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\nStep 1c: Removing 'system_admin' from users.role enum...");
  const [[updatedRoleCol]] = await conn.query("SHOW COLUMNS FROM users LIKE 'role'");
  const updatedType = updatedRoleCol?.Type ?? "";

  if (!updatedType.includes("system_admin")) {
    console.log("  ⏭️  system_admin already removed from enum — skipping Step 1c");
  } else {
    // Verify no rows still have system_admin before removing
    const [[{ count: remainingSysAdmin }]] = await conn.query(
      "SELECT COUNT(*) as count FROM users WHERE role = 'system_admin'"
    );
    if (remainingSysAdmin > 0) {
      throw new Error(`Cannot remove system_admin from enum: ${remainingSysAdmin} row(s) still have this value`);
    }
    await conn.query(`
      ALTER TABLE users
      MODIFY COLUMN \`role\` ENUM('user','admin','field_manager','superadmin','supervisor')
        NOT NULL DEFAULT 'user'
    `);
    console.log("  ✅ Removed system_admin from users.role enum");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step 2: Add 'pending_assignment' to routes.status enum
  // Final enum: ('pending','pending_assignment','optimized','assigned',
  //              'in_progress','completed','cancelled')
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\nStep 2: Adding 'pending_assignment' to routes.status enum...");
  const [[currentStatusCol]] = await conn.query("SHOW COLUMNS FROM routes LIKE 'status'");
  const currentStatusType = currentStatusCol?.Type ?? "";
  console.log("  Current type:", currentStatusType);

  if (currentStatusType.includes("pending_assignment")) {
    console.log("  ⏭️  routes.status already has pending_assignment — skipping Step 2");
  } else {
    await conn.query(`
      ALTER TABLE routes
      MODIFY COLUMN \`status\` ENUM('pending','pending_assignment','optimized','assigned','in_progress','completed','cancelled')
        NOT NULL DEFAULT 'pending'
    `);
    console.log("  ✅ Added pending_assignment to routes.status enum");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Verification
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n=== Verification ===");
  const [[finalRoleCol]] = await conn.query("SHOW COLUMNS FROM users LIKE 'role'");
  const [[finalStatusCol]] = await conn.query("SHOW COLUMNS FROM routes LIKE 'status'");
  console.log("users.role final:", finalRoleCol?.Type);
  console.log("routes.status final:", finalStatusCol?.Type);

  console.log("\n✅ T14 Item 1 migration complete");
} catch (err) {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
} finally {
  await conn.end();
}
