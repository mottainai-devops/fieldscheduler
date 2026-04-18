import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

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

async function forcePurge() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    console.log('🔴 STARTING FORCED PURGE (disabling foreign key constraints)...\n');

    // Disable foreign key checks
    console.log('⚙️  Disabling foreign key constraints...');
    await connection.query('SET FOREIGN_KEY_CHECKS=0');
    console.log('✓ Foreign key checks disabled\n');

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

    console.log('📊 Purging all tables:');
    let totalRecordsDeleted = 0;

    for (const table of tablesToPurge) {
      try {
        const [countResult] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = countResult[0]?.count || 0;
        
        if (count > 0) {
          await connection.query(`DELETE FROM ${table} WHERE 1=1`);
          console.log(`  ✓ ${table}: ${count} records deleted`);
          totalRecordsDeleted += count;
        } else {
          console.log(`  • ${table}: (empty)`);
        }
      } catch (e) {
        console.log(`  • ${table}: (table not found)`);
      }
    }

    console.log(`\n📈 Total records deleted: ${totalRecordsDeleted}`);

    // Re-enable foreign key checks
    console.log('\n⚙️  Re-enabling foreign key constraints...');
    await connection.query('SET FOREIGN_KEY_CHECKS=1');
    console.log('✓ Foreign key checks re-enabled\n');

    // Verify all tables are empty
    console.log('✅ VERIFICATION - All tables now empty:');
    let allEmpty = true;
    for (const table of tablesToPurge) {
      try {
        const [result] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = result[0]?.count || 0;
        if (count === 0) {
          console.log(`  ✓ ${table}: 0 records`);
        } else {
          console.log(`  ⚠ ${table}: ${count} records (FAILED)`);
          allEmpty = false;
        }
      } catch (e) {
        // Table doesn't exist
      }
    }

    if (allEmpty) {
      console.log('\n🎉 PURGE COMPLETE - ALL DATA DELETED - System is now empty\n');
    } else {
      console.log('\n⚠️  PURGE INCOMPLETE - Some tables still have data\n');
    }

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

forcePurge().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
