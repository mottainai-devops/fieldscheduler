/**
 * Migration: Supervisor Role Support
 * Adds role, preferredWebhookType to workers table
 * Adds pickedAt to routeCustomers table
 *
 * This migration is idempotent — safe to run on every server startup.
 * Uses IF NOT EXISTS / MODIFY COLUMN patterns to avoid errors on re-run.
 */
import { getDb } from "../db";
import { sql } from "drizzle-orm";

export async function runSupervisorRoleMigration() {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[migration:supervisorRole] DB not available, skipping");
      return;
    }

    // 1. Add role column to workers
    try {
      await db.execute(sql`
        ALTER TABLE workers
        ADD COLUMN \`role\` ENUM('field_manager','supervisor') NOT NULL DEFAULT 'field_manager'
      `);
      console.log("[migration:supervisorRole] ✅ Added workers.role");
    } catch (e: any) {
      if (e.message?.includes("Duplicate column") || e.code === "ER_DUP_FIELDNAME") {
        console.log("[migration:supervisorRole] ⏭️  workers.role already exists");
      } else {
        throw e;
      }
    }

    // 2. Add preferredWebhookType column to workers
    try {
      await db.execute(sql`
        ALTER TABLE workers
        ADD COLUMN \`preferredWebhookType\` ENUM('payt','monthly') NULL DEFAULT NULL
      `);
      console.log("[migration:supervisorRole] ✅ Added workers.preferredWebhookType");
    } catch (e: any) {
      if (e.message?.includes("Duplicate column") || e.code === "ER_DUP_FIELDNAME") {
        console.log("[migration:supervisorRole] ⏭️  workers.preferredWebhookType already exists");
      } else {
        throw e;
      }
    }

    // 3. Add pickedAt column to routeCustomers
    try {
      await db.execute(sql`
        ALTER TABLE routeCustomers
        ADD COLUMN \`pickedAt\` TIMESTAMP NULL DEFAULT NULL
      `);
      console.log("[migration:supervisorRole] ✅ Added routeCustomers.pickedAt");
    } catch (e: any) {
      if (e.message?.includes("Duplicate column") || e.code === "ER_DUP_FIELDNAME") {
        console.log("[migration:supervisorRole] ⏭️  routeCustomers.pickedAt already exists");
      } else {
        throw e;
      }
    }

    // 4. Add surveyAppUserId column to workers
    // Links a supervisor to their Mottainai Survey App user account.
    // Auto-populated on first supervisor login via Survey App credentials.
    try {
      await db.execute(sql`
        ALTER TABLE workers
        ADD COLUMN \`surveyAppUserId\` VARCHAR(100) NULL DEFAULT NULL
      `);
      console.log("[migration:supervisorRole] ✅ Added workers.surveyAppUserId");
    } catch (e: any) {
      if (e.message?.includes("Duplicate column") || e.code === "ER_DUP_FIELDNAME") {
        console.log("[migration:supervisorRole] ⏭️  workers.surveyAppUserId already exists");
      } else {
        throw e;
      }
    }

    console.log("[migration:supervisorRole] 🎉 Migration complete");
  } catch (err) {
    console.error("[migration:supervisorRole] ❌ Migration failed:", err);
    // Non-fatal — server continues even if migration fails
  }
}
