/**
 * T23 backfill verification — check noticeNumber population state
 * Run: npx tsx scripts/checkBackfill.ts
 */
import { config } from "dotenv";
config();

import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL as string);

  const [rows] = await conn.execute(`
    SELECT 
      COUNT(*) AS total,
      COUNT(noticeNumber) AS populated,
      COUNT(*) - COUNT(noticeNumber) AS still_null
    FROM abatementNotices
  `);

  const result = (rows as any[])[0];
  console.log("abatementNotices noticeNumber state:");
  console.log(`  total     : ${result.total}`);
  console.log(`  populated : ${result.populated}`);
  console.log(`  still_null: ${result.still_null}`);

  if (Number(result.still_null) === 0) {
    console.log("\n✓ All rows have noticeNumber populated.");
  } else {
    console.log(`\n⚠ ${result.still_null} row(s) still have noticeNumber = NULL.`);
    console.log("  Run: UPDATE abatementNotices SET noticeNumber = CONCAT('ABT-', id) WHERE noticeNumber IS NULL;");
  }

  await conn.end();
}

main().catch(console.error);
