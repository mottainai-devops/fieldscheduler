/**
 * Migration: Add supervisor role support
 * - workers.role ENUM('field_manager','supervisor') DEFAULT 'field_manager'
 * - workers.preferredWebhookType ENUM('payt','monthly') NULL
 * - routeCustomers.pickedAt TIMESTAMP NULL
 */
import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load DATABASE_URL from .env if present
let DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  try {
    const envPath = resolve(__dirname, "../../.env");
    const envContent = readFileSync(envPath, "utf-8");
    const match = envContent.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
    if (match) DATABASE_URL = match[1].trim();
  } catch {}
}

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in environment or .env file");
  process.exit(1);
}

async function run() {
  console.log("🔌 Connecting to database...");
  const conn = await createConnection(DATABASE_URL);
  console.log("✅ Connected");

  const migrations = [
    {
      name: "Add workers.role column",
      sql: `ALTER TABLE workers 
            ADD COLUMN IF NOT EXISTS \`role\` ENUM('field_manager','supervisor') NOT NULL DEFAULT 'field_manager'`,
    },
    {
      name: "Add workers.preferredWebhookType column",
      sql: `ALTER TABLE workers 
            ADD COLUMN IF NOT EXISTS \`preferredWebhookType\` ENUM('payt','monthly') NULL DEFAULT NULL`,
    },
    {
      name: "Add routeCustomers.pickedAt column",
      sql: `ALTER TABLE routeCustomers 
            ADD COLUMN IF NOT EXISTS \`pickedAt\` TIMESTAMP NULL DEFAULT NULL`,
    },
  ];

  for (const migration of migrations) {
    try {
      console.log(`⏳ ${migration.name}...`);
      await conn.execute(migration.sql);
      console.log(`✅ ${migration.name} — done`);
    } catch (err) {
      if (err.code === "ER_DUP_FIELDNAME" || err.message?.includes("Duplicate column")) {
        console.log(`⏭️  ${migration.name} — column already exists, skipping`);
      } else {
        console.error(`❌ ${migration.name} — FAILED:`, err.message);
      }
    }
  }

  await conn.end();
  console.log("\n🎉 Migration complete");
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
