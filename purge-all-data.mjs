import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Parse DATABASE_URL
const dbUrl = process.env.DATABASE_URL || '';
const urlMatch = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):([^/]+)\/(.+)/);
let [, user, password, host, port, database] = urlMatch || ['', 'root', '', 'localhost', '3306', 'fieldworker'];

if (database && database.includes('?')) {
  database = database.split('?')[0];
}

if (password && password.includes('%')) {
  password = decodeURIComponent(password);
}

let sslConfig = { rejectUnauthorized: false };
if (fs.existsSync('/etc/ssl/certs/ca-certificates.crt')) {
  sslConfig.ca = fs.readFileSync('/etc/ssl/certs/ca-certificates.crt', 'utf8');
}

console.log('🔌 Connecting to database...');
console.log(`   Host: ${host}:${port}`);
console.log(`   Database: ${database}\n`);

const pool = mysql.createPool({
  connectionLimit: 10,
  host: host,
  port: parseInt(port),
  user: user,
  password: password,
  database: database,
  waitForConnections: true,
  enableKeepAlive: true,
  ssl: sslConfig,
});

async function purgeAllData() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    console.log('🔴 STARTING COMPLETE SYSTEM PURGE...\n');

    // List of all tables to purge
    const tablesToPurge = [
      'route_customers',
      'routes',
      'workerLocations',
      'workers',
      'customers',
      'vehicles',
      'complianceViolations',
      'abatementNotices',
      'paymentEvidence',
      'customerPaymentStatus',
      'violationTypes',
      'buildingIdLinkageRequests',
      'customerBuildingIdRelations',
      'workerNotifications',
      'zohoTokens',
    ];

    console.log('📊 Purging tables:');
    let totalRecordsDeleted = 0;

    for (const table of tablesToPurge) {
      try {
        // Get count before delete
        const [countResult] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = countResult[0]?.count || 0;
        
        if (count > 0) {
          // Delete all records
          await connection.query(`DELETE FROM ${table} WHERE 1=1`);
          console.log(`  ✓ ${table}: ${count} records deleted`);
          totalRecordsDeleted += count;
        } else {
          console.log(`  • ${table}: (empty)`);
        }
      } catch (e) {
        // Table might not exist, that's okay
        console.log(`  • ${table}: (table not found or error)`);
      }
    }

    console.log(`\n📈 Total records deleted: ${totalRecordsDeleted}`);

    // Verify all tables are empty
    console.log('\n✅ VERIFICATION - All tables now empty:');
    for (const table of tablesToPurge) {
      try {
        const [result] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = result[0]?.count || 0;
        if (count === 0) {
          console.log(`  ✓ ${table}: 0 records`);
        } else {
          console.log(`  ⚠ ${table}: ${count} records (FAILED TO DELETE)`);
        }
      } catch (e) {
        // Table doesn't exist
      }
    }

    console.log('\n🎉 PURGE COMPLETE - System is now empty and ready for fresh data population\n');

  } catch (error) {
    console.error('❌ Error during purge:', error.message);
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.release();
      } catch (e) {
        console.error('Error releasing connection:', e);
      }
    }
    try {
      await pool.end();
    } catch (e) {
      console.error('Error closing pool:', e);
    }
  }
}

purgeAllData().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
