import "../_core/runtimeConfig";
import mysql from "mysql2/promise";

async function hasColumn(connection: mysql.Connection, table: string, column: string): Promise<boolean> {
  const [rows] = await connection.execute<mysql.RowDataPacket[]>(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [table, column],
  );
  return rows.length > 0;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("Component C migration cannot run: DATABASE_URL is unavailable");
  const connection = await mysql.createConnection(databaseUrl);
  try {
    await connection.execute(`CREATE TABLE IF NOT EXISTS zohoInvoiceSyncState (
      stateKey varchar(64) NOT NULL PRIMARY KEY,
      lastSuccessfulModifiedAt timestamp NULL,
      lastAttemptAt timestamp NULL,
      lastStatus varchar(32) NOT NULL DEFAULT 'not_initialized',
      lastError text NULL,
      updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);
    if (!(await hasColumn(connection, "zohoSyncHistory", "invoiceStatus"))) {
      await connection.execute("ALTER TABLE zohoSyncHistory ADD COLUMN invoiceStatus varchar(32) NULL");
    }
    console.log("Component C migration complete");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Component C migration failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
