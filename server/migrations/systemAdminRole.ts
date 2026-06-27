/**
 * Migration: Four-Tier Role Enum (T14 Item 1)
 *
 * Ensures users.role enum contains the four-tier values:
 *   ('user', 'admin', 'field_manager', 'superadmin', 'supervisor')
 *
 * History:
 *   - Originally added 'system_admin' (pre-T14)
 *   - T14 Item 1: renamed system_admin → superadmin, added supervisor
 *
 * This migration is idempotent — safe to run on every server startup.
 * Uses MODIFY COLUMN to set the final enum; MySQL treats this as a no-op
 * if the column already matches.
 *
 * Four-tier role model:
 *   superadmin    → full access, no data scoping (adey, info@mottainai.africa)
 *   admin         → admin UI access, all customers visible
 *   field_manager → admin UI access, scoped to assigned customers
 *   supervisor    → mobile app only, no admin access
 *   user          → no admin access
 */
import { getDb } from "../db";
import { sql } from "drizzle-orm";

export async function runSystemAdminRoleMigration() {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[migration:roleEnum] DB not available, skipping");
      return;
    }

    // Set the final four-tier enum.
    // MODIFY COLUMN is idempotent — if the enum already matches, MySQL treats it as a no-op.
    try {
      await db.execute(sql`
        ALTER TABLE \`users\`
        MODIFY COLUMN \`role\` ENUM('user','admin','field_manager','superadmin','supervisor') NOT NULL DEFAULT 'user'
      `);
      console.log("[migration:roleEnum] ✅ users.role enum confirmed: four-tier model");
    } catch (e: any) {
      // MySQL may throw on certain edge cases — treat known benign errors as success
      if (
        e.message?.includes("already exists") ||
        e.code === "ER_DUP_FIELDNAME"
      ) {
        console.log("[migration:roleEnum] ⏭️  users.role enum already up to date");
      } else {
        throw e;
      }
    }

    console.log("[migration:roleEnum] ✅ Migration complete");
  } catch (err) {
    console.error("[migration:roleEnum] ❌ Migration failed:", err);
    // Do not throw — startup should not fail due to migration errors
  }
}
