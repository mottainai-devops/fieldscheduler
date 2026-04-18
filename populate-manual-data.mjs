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

async function populateManualData() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    console.log('🔌 Connecting to database...');
    console.log(`   Host: ${host}:${port}`);
    console.log(`   Database: ${database}\n`);
    
    console.log('📊 STARTING MANUAL DATA POPULATION\n');

    // Field Managers (Workers)
    const fieldManagers = [
      { name: 'Ahmed Hassan', email: 'ahmed.hassan@company.com', phone: '+234-801-234-5601' },
      { name: 'Fatima Okafor', email: 'fatima.okafor@company.com', phone: '+234-802-234-5602' },
      { name: 'Chisom Eze', email: 'chisom.eze@company.com', phone: '+234-803-234-5603' },
      { name: 'Blessing Adeyemi', email: 'blessing.adeyemi@company.com', phone: '+234-804-234-5604' },
      { name: 'Tunde Oluwaseun', email: 'tunde.oluwaseun@company.com', phone: '+234-805-234-5605' },
      { name: 'Zainab Ibrahim', email: 'zainab.ibrahim@company.com', phone: '+234-806-234-5606' },
      { name: 'Emeka Nwosu', email: 'emeka.nwosu@company.com', phone: '+234-807-234-5607' },
      { name: 'Aisha Mohammed', email: 'aisha.mohammed@company.com', phone: '+234-808-234-5608' },
    ];

    console.log('👷 Inserting field managers...');
    const workerMap = new Map();
    
    for (const manager of fieldManagers) {
      const [result] = await connection.query(
        `INSERT INTO workers (name, email, phone, status, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [manager.name, manager.email, manager.phone, 'active']
      );
      workerMap.set(manager.name, result.insertId);
      console.log(`  ✓ ${manager.name}`);
    }
    
    console.log(`✓ Inserted ${fieldManagers.length} field managers\n`);

    // Customer data with CUSTOMERMAF codes
    const customersData = [
      // Assigned to Ahmed Hassan
      { name: 'Lagos Distribution Center', customermaf: 'AFT-200', manager: 'Ahmed Hassan', address: '123 Lekki Expressway, Lagos' },
      { name: 'Ikeja Warehouse', customermaf: 'AFT-221', manager: 'Ahmed Hassan', address: '456 Obafemi Awolowo Way, Ikeja' },
      { name: 'Victoria Island Office', customermaf: 'CUM-095', manager: 'Ahmed Hassan', address: '789 Ligali Ayorinde St, VI' },
      
      // Assigned to Fatima Okafor
      { name: 'Abuja Central Hub', customermaf: 'ADK-062', manager: 'Fatima Okafor', address: '321 Herbert Macaulay Way, Abuja' },
      { name: 'Garki Distribution', customermaf: 'DIC-087', manager: 'Fatima Okafor', address: '654 Aguiyi Ironsi St, Garki' },
      { name: 'Wuse Market Branch', customermaf: 'EFG-143', manager: 'Fatima Okafor', address: '987 Wuse Zone 2, Abuja' },
      
      // Assigned to Chisom Eze
      { name: 'Enugu Regional Office', customermaf: 'HIJ-156', manager: 'Chisom Eze', address: '111 Ogui Road, Enugu' },
      { name: 'Nsukka Operations', customermaf: 'KLM-189', manager: 'Chisom Eze', address: '222 Enugu-Nsukka Expressway' },
      { name: 'Coal City Logistics', customermaf: 'NOP-201', manager: 'Chisom Eze', address: '333 Independence Layout, Enugu' },
      
      // Assigned to Blessing Adeyemi
      { name: 'Ibadan Warehouse', customermaf: 'QRS-234', manager: 'Blessing Adeyemi', address: '444 Oyo Road, Ibadan' },
      { name: 'Oyo State Hub', customermaf: 'TUV-267', manager: 'Blessing Adeyemi', address: '555 Iwo Road, Ibadan' },
      { name: 'Iseyin Branch', customermaf: 'WXY-289', manager: 'Blessing Adeyemi', address: '666 Iseyin Town, Oyo State' },
      
      // Assigned to Tunde Oluwaseun
      { name: 'Kano Distribution', customermaf: 'ZAB-312', manager: 'Tunde Oluwaseun', address: '777 Murtala Mohammed Way, Kano' },
      { name: 'Kano North Terminal', customermaf: 'CDE-345', manager: 'Tunde Oluwaseun', address: '888 Sabon Gari, Kano' },
      { name: 'Kano South Depot', customermaf: 'FGH-378', manager: 'Tunde Oluwaseun', address: '999 Tarauni, Kano' },
      
      // Assigned to Zainab Ibrahim
      { name: 'Kaduna Central', customermaf: 'IJK-401', manager: 'Zainab Ibrahim', address: '101 Ahmadu Bello Way, Kaduna' },
      { name: 'Kaduna North Facility', customermaf: 'LMN-434', manager: 'Zainab Ibrahim', address: '202 Kachia Road, Kaduna' },
      { name: 'Zaria Operations', customermaf: 'OPQ-467', manager: 'Zainab Ibrahim', address: '303 Zaria Town, Kaduna' },
      
      // Assigned to Emeka Nwosu
      { name: 'Port Harcourt Hub', customermaf: 'RST-490', manager: 'Emeka Nwosu', address: '404 Aba Road, Port Harcourt' },
      { name: 'Rivers State Depot', customermaf: 'UVW-523', manager: 'Emeka Nwosu', address: '505 Rumuola, Port Harcourt' },
      { name: 'Bonny Island Terminal', customermaf: 'XYZ-556', manager: 'Emeka Nwosu', address: '606 Bonny Island, Rivers' },
      
      // Assigned to Aisha Mohammed
      { name: 'Katsina Distribution', customermaf: 'ABC-579', manager: 'Aisha Mohammed', address: '707 Katsina Town, Katsina' },
      { name: 'Katsina North Facility', customermaf: 'DEF-612', manager: 'Aisha Mohammed', address: '808 Daura Road, Katsina' },
      { name: 'Funtua Branch', customermaf: 'GHI-645', manager: 'Aisha Mohammed', address: '909 Funtua Town, Katsina' },
      
      // Unassigned customers (no manager)
      { name: 'Calabar Regional Center', customermaf: 'JKL-678', manager: null, address: '1010 Calabar Road, Cross River' },
      { name: 'Uyo Operations', customermaf: 'MNO-701', manager: null, address: '1111 Uyo Town, Akwa Ibom' },
      { name: 'Benin City Warehouse', customermaf: 'PQR-734', manager: null, address: '1212 Benin City, Edo State' },
      { name: 'Asaba Distribution', customermaf: 'STU-767', manager: null, address: '1313 Asaba Town, Delta State' },
      { name: 'Warri Logistics', customermaf: 'VWX-790', manager: null, address: '1414 Warri Town, Delta State' },
    ];

    console.log('🏢 Inserting customers with CUSTOMERMAF codes...');
    let customersInserted = 0;
    let assignedCount = 0;
    let unassignedCount = 0;
    
    for (const customer of customersData) {
      const workerId = customer.manager ? workerMap.get(customer.manager) : null;
      const assignmentStatus = workerId ? 'assigned' : 'unassigned';
      
      await connection.query(
        `INSERT INTO customers (
          name, email, phone, address, customermaf, fieldManager, 
          assignmentStatus, latitude, longitude, serviceType, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          customer.name,
          `${customer.name.toLowerCase().replace(/\s+/g, '.')}@company.com`,
          '+234-' + Math.floor(Math.random() * 9000000000 + 1000000000),
          customer.address,
          customer.customermaf,
          workerId || null,
          assignmentStatus,
          null,
          null,
          'delivery',
        ]
      );
      
      customersInserted++;
      if (workerId) {
        assignedCount++;
      } else {
        unassignedCount++;
      }
    }
    
    console.log(`✓ Inserted ${customersInserted} customers`);
    console.log(`  - Assigned: ${assignedCount}`);
    console.log(`  - Unassigned: ${unassignedCount}\n`);

    // Verify data
    console.log('📊 VERIFICATION:');
    const [workerCount] = await connection.query('SELECT COUNT(*) as count FROM workers');
    const [customerCount] = await connection.query('SELECT COUNT(*) as count FROM customers');
    const [assignedCountResult] = await connection.query('SELECT COUNT(*) as count FROM customers WHERE assignmentStatus = "assigned"');
    const [mafCount] = await connection.query('SELECT COUNT(*) as count FROM customers WHERE customermaf IS NOT NULL');
    const [unassignedCountResult] = await connection.query('SELECT COUNT(*) as count FROM customers WHERE assignmentStatus = "unassigned"');
    
    console.log(`  ✓ Total Workers: ${workerCount[0].count}`);
    console.log(`  ✓ Total Customers: ${customerCount[0].count}`);
    console.log(`  ✓ Assigned Customers: ${assignedCountResult[0].count}`);
    console.log(`  ✓ Unassigned Customers: ${unassignedCountResult[0].count}`);
    console.log(`  ✓ Customers with CUSTOMERMAF: ${mafCount[0].count}\n`);

    // Show sample data
    console.log('📋 SAMPLE DATA:');
    const [sampleWorkers] = await connection.query('SELECT id, name, email FROM workers LIMIT 5');
    console.log('  Field Managers:');
    for (const w of sampleWorkers) {
      console.log(`    • ${w.name} (${w.email})`);
    }
    
    const [sampleAssigned] = await connection.query(
      `SELECT c.name, c.customermaf, w.name as fieldManager FROM customers c 
       LEFT JOIN workers w ON c.fieldManager = w.id 
       WHERE c.assignmentStatus = 'assigned' LIMIT 5`
    );
    console.log('\n  Assigned Customers:');
    for (const c of sampleAssigned) {
      console.log(`    • ${c.name} (${c.customermaf}) → ${c.fieldManager}`);
    }
    
    const [sampleUnassigned] = await connection.query(
      `SELECT name, customermaf FROM customers WHERE assignmentStatus = 'unassigned' LIMIT 5`
    );
    console.log('\n  Unassigned Customers:');
    for (const c of sampleUnassigned) {
      console.log(`    • ${c.name} (${c.customermaf})`);
    }

    console.log('\n🎉 MANUAL DATA POPULATION COMPLETE!\n');
    console.log('✅ System is now ready with:');
    console.log(`   - ${workerCount[0].count} Field Managers`);
    console.log(`   - ${customerCount[0].count} Customers`);
    console.log(`   - ${assignedCountResult[0].count} Assigned to Field Managers`);
    console.log(`   - ${unassignedCountResult[0].count} Unassigned (ready for assignment)`);
    console.log(`   - All customers have CUSTOMERMAF codes\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
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

populateManualData().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
