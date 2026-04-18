#!/usr/bin/env node
/**
 * Populate test data with field managers and GPS coordinates
 * This script creates customers with proper field manager assignments and valid GPS coordinates
 */

import mysql from 'mysql2/promise';

const testCustomers = [
  // Lagos Island area - Field Manager 1
  { name: 'Lekki Phase 1 - Customer A', address: 'Lekki Phase 1, Lagos', latitude: '6.4281', longitude: '3.5890', buildingId: 'LEK-001', fieldManager: 1 },
  { name: 'Lekki Phase 1 - Customer B', address: 'Lekki Phase 1, Lagos', latitude: '6.4285', longitude: '3.5895', buildingId: 'LEK-001', fieldManager: 1 },
  { name: 'Lekki Phase 2 - Customer C', address: 'Lekki Phase 2, Lagos', latitude: '6.4290', longitude: '3.5900', buildingId: 'LEK-002', fieldManager: 1 },
  { name: 'Lekki Phase 2 - Customer D', address: 'Lekki Phase 2, Lagos', latitude: '6.4295', longitude: '3.5905', buildingId: 'LEK-002', fieldManager: 1 },
  
  // Victoria Island area - Field Manager 2
  { name: 'VI - Oniru - Customer E', address: 'Victoria Island, Lagos', latitude: '6.4300', longitude: '3.4200', buildingId: 'VI-001', fieldManager: 2 },
  { name: 'VI - Oniru - Customer F', address: 'Victoria Island, Lagos', latitude: '6.4305', longitude: '3.4205', buildingId: 'VI-001', fieldManager: 2 },
  { name: 'VI - Ikoyi - Customer G', address: 'Ikoyi, Lagos', latitude: '6.4310', longitude: '3.4210', buildingId: 'VI-002', fieldManager: 2 },
  { name: 'VI - Ikoyi - Customer H', address: 'Ikoyi, Lagos', latitude: '6.4315', longitude: '3.4215', buildingId: 'VI-002', fieldManager: 2 },
  
  // Ikeja area - Field Manager 3
  { name: 'Ikeja GRA - Customer I', address: 'Ikeja GRA, Lagos', latitude: '6.5800', longitude: '3.3400', buildingId: 'IKJ-001', fieldManager: 3 },
  { name: 'Ikeja GRA - Customer J', address: 'Ikeja GRA, Lagos', latitude: '6.5805', longitude: '3.3405', buildingId: 'IKJ-001', fieldManager: 3 },
  { name: 'Ikeja - Customer K', address: 'Ikeja, Lagos', latitude: '6.5810', longitude: '3.3410', buildingId: 'IKJ-002', fieldManager: 3 },
  { name: 'Ikeja - Customer L', address: 'Ikeja, Lagos', latitude: '6.5815', longitude: '3.3415', buildingId: 'IKJ-002', fieldManager: 3 },
  
  // Yaba area - Field Manager 1
  { name: 'Yaba - Customer M', address: 'Yaba, Lagos', latitude: '6.5200', longitude: '3.3600', buildingId: 'YAB-001', fieldManager: 1 },
  { name: 'Yaba - Customer N', address: 'Yaba, Lagos', latitude: '6.5205', longitude: '3.3605', buildingId: 'YAB-001', fieldManager: 1 },
  { name: 'Yaba Tech - Customer O', address: 'Yaba Tech, Lagos', latitude: '6.5210', longitude: '3.3610', buildingId: 'YAB-002', fieldManager: 1 },
  
  // Surulere area - Field Manager 2
  { name: 'Surulere - Customer P', address: 'Surulere, Lagos', latitude: '6.4950', longitude: '3.3700', buildingId: 'SUR-001', fieldManager: 2 },
  { name: 'Surulere - Customer Q', address: 'Surulere, Lagos', latitude: '6.4955', longitude: '3.3705', buildingId: 'SUR-001', fieldManager: 2 },
  { name: 'Surulere - Customer R', address: 'Surulere, Lagos', latitude: '6.4960', longitude: '3.3710', buildingId: 'SUR-002', fieldManager: 2 },
  
  // Ajah area - Field Manager 3
  { name: 'Ajah - Customer S', address: 'Ajah, Lagos', latitude: '6.4400', longitude: '3.6000', buildingId: 'AJH-001', fieldManager: 3 },
  { name: 'Ajah - Customer T', address: 'Ajah, Lagos', latitude: '6.4405', longitude: '3.6005', buildingId: 'AJH-001', fieldManager: 3 },
  { name: 'Ajah - Customer U', address: 'Ajah, Lagos', latitude: '6.4410', longitude: '3.6010', buildingId: 'AJH-002', fieldManager: 3 },
];

async function populateTestData() {
  let connection;
  try {
    // Get database URL from environment
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error('DATABASE_URL environment variable not set');
      process.exit(1);
    }

    // Parse the database URL
    const url = new URL(dbUrl);
    const config = {
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      ssl: { rejectUnauthorized: false },
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };

    console.log(`Connecting to MySQL at ${config.host}:${config.port}/${config.database}...`);
    connection = await mysql.createConnection(config);
    console.log('Connected to database!');

    // First, clear existing customers (optional)
    console.log('\nClearing existing customers...');
    await connection.execute('DELETE FROM customers');
    console.log('✓ Cleared existing customers');

    // Insert test customers
    console.log('\nInserting test customers...');
    let inserted = 0;
    for (const customer of testCustomers) {
      try {
        await connection.execute(
          `INSERT INTO customers (name, address, latitude, longitude, buildingId, fieldManager, serviceType, priority, assignmentStatus, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, 'maintenance', 'medium', 'assigned', NOW(), NOW())`,
          [customer.name, customer.address, customer.latitude, customer.longitude, customer.buildingId, customer.fieldManager]
        );
        inserted++;
        console.log(`✓ Added: ${customer.name} (Manager: ${customer.fieldManager}, Building: ${customer.buildingId})`);
      } catch (error) {
        console.error(`✗ Failed to add ${customer.name}:`, error.message);
      }
    }

    console.log(`\n✓ Successfully inserted ${inserted} test customers!`);
    console.log('\nTest data summary:');
    console.log('- 21 customers total');
    console.log('- 3 field managers (IDs: 1, 2, 3)');
    console.log('- 9 building IDs (LEK-001, LEK-002, VI-001, VI-002, IKJ-001, IKJ-002, YAB-001, YAB-002, SUR-001, SUR-002, AJH-001, AJH-002)');
    console.log('- Valid GPS coordinates for clustering');
    console.log('\nYou can now test the filters on the Create Route page!');

    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

populateTestData();

