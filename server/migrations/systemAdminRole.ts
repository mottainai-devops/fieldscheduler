/**
 * Migration: System Admin Role Support
 * Adds 'system_admin' to the users.role enum
 *
 * This migration is idempotent — safe to run on every server startup.
 * Uses MODIFY COLUMN to extend the enum; MySQL ignores if value already exists.
 *
 * Three-tier role model:
 *   system_admin  → full access, no data scoping (adey, info@mottainai.africa)
 *   field_manager → admin UI access, scoped to assigned customers
 *   user          → no admin access
 *   admin         → legacy value (kept for backward compat, treated as field_manager)
 */
import { getDb } from "../db";
import { sql } from "drizzle-orm";

export async function runSystemAdminRoleMigration() {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[migration:systemAdminRole] DB not available, skipping");
      return;
    }

    // Extend users.role enum to include system_admin
    // MODIFY COLUMN is idempotent — if system_admin is already in the enum, this is a no-op
    try {
      await db.execute(sql`
        ALTER TABLE \`users\`
        MODIFY COLUMN \`role\` ENUM('user','admin','field_manager','system_admin') NOT NULL DEFAULT 'user'
      `);
      console.log("[migration:systemAdminRole] ✅ Added system_admin to users.role enum");
    } catch (e: any) {
      // TiDB/MySQL may throw if the enum already contains the value — treat as success
      if (
        e.message?.includes("system_admin") ||
        e.message?.includes("already exists") ||
        e.code === "ER_DUP_FIELDNAME"
      ) {
        console.log("[migration:systemAdminRole] ⏭️  users.role already includes system_admin");
      } else {
        throw e;
      }
    }

    console.log("[migration:systemAdminRole] ✅ Migration complete");
  } catch (err) {
    console.error("[migration:systemAdminRole] ❌ Migration failed:", err);
    // Do not throw — startup should not fail due to migration errors
  }
}
