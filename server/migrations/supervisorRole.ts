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
      // Drizzle ORM wraps MySQL errors — check both top-level and e.cause
      const isDupCol =
        e.message?.includes("Duplicate column") ||
        e.code === "ER_DUP_FIELDNAME" ||
        e.cause?.code === "ER_DUP_FIELDNAME" ||
        e.cause?.message?.includes("Duplicate column");
      if (isDupCol) {
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
      const isDupCol =
        e.message?.includes("Duplicate column") ||
        e.code === "ER_DUP_FIELDNAME" ||
        e.cause?.code === "ER_DUP_FIELDNAME" ||
        e.cause?.message?.includes("Duplicate column");
      if (isDupCol) {
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
      const isDupCol =
        e.message?.includes("Duplicate column") ||
        e.code === "ER_DUP_FIELDNAME" ||
        e.cause?.code === "ER_DUP_FIELDNAME" ||
        e.cause?.message?.includes("Duplicate column");
      if (isDupCol) {
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
      const isDupCol =
        e.message?.includes("Duplicate column") ||
        e.code === "ER_DUP_FIELDNAME" ||
        e.cause?.code === "ER_DUP_FIELDNAME" ||
        e.cause?.message?.includes("Duplicate column");
      if (isDupCol) {
        console.log("[migration:supervisorRole] ⏭️  workers.surveyAppUserId already exists");
      } else {
        throw e;
      }
    }

    // 5. Add pickupFrequency column to customers
    try {
      await db.execute(sql`
        ALTER TABLE customers
        ADD COLUMN \`pickupFrequency\` INT NOT NULL DEFAULT 0
      `);
      console.log("[migration:supervisorRole] ✅ Added customers.pickupFrequency");
    } catch (e: any) {
      const isDupCol =
        e.message?.includes("Duplicate column") ||
        e.code === "ER_DUP_FIELDNAME" ||
        e.cause?.code === "ER_DUP_FIELDNAME" ||
        e.cause?.message?.includes("Duplicate column");
      if (isDupCol) {
        console.log("[migration:supervisorRole] ⏭️  customers.pickupFrequency already exists");
      } else { throw e; }
    }

    // 6. Create routeScheduleCustomers table
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS \`routeScheduleCustomers\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`scheduleId\` INT NOT NULL,
          \`customerId\` INT NOT NULL,
          \`status\` ENUM('active','skipped','removed') NOT NULL DEFAULT 'active',
          \`skipReason\` ENUM('no_access','customer_request','safety_concern','bin_not_out','other') NULL,
          \`skipNote\` TEXT NULL,
          \`consecutiveSkips\` INT NOT NULL DEFAULT 0,
          \`autoPausedAt\` TIMESTAMP NULL,
          \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (\`scheduleId\`) REFERENCES \`routeSchedules\`(\`id\`),
          FOREIGN KEY (\`customerId\`) REFERENCES \`customers\`(\`id\`)
        )
      `);
      console.log("[migration:supervisorRole] ✅ Created routeScheduleCustomers");
    } catch (e: any) {
      if (e.message?.includes("already exists") || e.code === "ER_TABLE_EXISTS_ERROR") {
        console.log("[migration:supervisorRole] ⏭️  routeScheduleCustomers already exists");
      } else { throw e; }
    }

    // 7. Create routeInstanceCustomerOverrides table
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS \`routeInstanceCustomerOverrides\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`instanceId\` INT NOT NULL,
          \`customerId\` INT NOT NULL,
          \`overrideType\` ENUM('skip','reschedule','handoff','note') NOT NULL,
          \`newDate\` VARCHAR(20) NULL,
          \`handoffWorkerId\` INT NULL,
          \`skipReason\` ENUM('no_access','customer_request','safety_concern','bin_not_out','other') NULL,
          \`note\` TEXT NULL,
          \`createdBy\` INT NULL,
          \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (\`instanceId\`) REFERENCES \`routeInstances\`(\`id\`),
          FOREIGN KEY (\`customerId\`) REFERENCES \`customers\`(\`id\`),
          FOREIGN KEY (\`handoffWorkerId\`) REFERENCES \`workers\`(\`id\`),
          FOREIGN KEY (\`createdBy\`) REFERENCES \`workers\`(\`id\`)
        )
      `);
      console.log("[migration:supervisorRole] ✅ Created routeInstanceCustomerOverrides");
    } catch (e: any) {
      if (e.message?.includes("already exists") || e.code === "ER_TABLE_EXISTS_ERROR") {
        console.log("[migration:supervisorRole] ⏭️  routeInstanceCustomerOverrides already exists");
      } else { throw e; }
    }

    // 8. Create calendarAuditLog table
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS \`calendarAuditLog\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`entityType\` ENUM('schedule','instance','schedule_customer','instance_override') NOT NULL,
          \`entityId\` INT NOT NULL,
          \`action\` ENUM('created','updated','cancelled','rescheduled','customer_skipped','customer_removed','customer_added','handoff_requested','handoff_accepted','auto_paused') NOT NULL,
          \`previousState\` TEXT NULL,
          \`newState\` TEXT NULL,
          \`actorType\` ENUM('worker','admin','system') NOT NULL,
          \`actorId\` INT NULL,
          \`actorName\` VARCHAR(255) NULL,
          \`reason\` TEXT NULL,
          \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log("[migration:supervisorRole] ✅ Created calendarAuditLog");
    } catch (e: any) {
      if (e.message?.includes("already exists") || e.code === "ER_TABLE_EXISTS_ERROR") {
        console.log("[migration:supervisorRole] ⏭️  calendarAuditLog already exists");
      } else { throw e; }
    }

    // 9. Add supervisorId column to routes
    try {
      await db.execute(sql`
        ALTER TABLE routes
        ADD COLUMN \`supervisorId\` INT NULL DEFAULT NULL,
        ADD CONSTRAINT \`fk_routes_supervisor\` FOREIGN KEY (\`supervisorId\`) REFERENCES \`workers\`(\`id\`)
      `);
      console.log("[migration:supervisorRole] ✅ Added routes.supervisorId");
    } catch (e: any) {
      const isDupCol =
        e.message?.includes("Duplicate column") ||
        e.code === "ER_DUP_FIELDNAME" ||
        e.cause?.code === "ER_DUP_FIELDNAME" ||
        e.cause?.message?.includes("Duplicate column");
      const isDupKey =
        e.message?.includes("Duplicate key name") ||
        e.code === "ER_DUP_KEYNAME" ||
        e.cause?.code === "ER_DUP_KEYNAME" ||
        e.cause?.message?.includes("Duplicate key name");
      if (isDupCol) {
        console.log("[migration:supervisorRole] ⏭️  routes.supervisorId already exists");
      } else if (isDupKey) {
        console.log("[migration:supervisorRole] ⏭️  routes.supervisorId FK already exists");
      } else { throw e; }
    }

    console.log("[migration:supervisorRole] 🎉 Migration complete");
  } catch (err) {
    console.error("[migration:supervisorRole] ❌ Migration failed:", err);
    // Non-fatal — server continues even if migration fails
  }
}
