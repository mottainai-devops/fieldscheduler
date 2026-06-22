#!/usr/bin/env node
/**
 * Smoke Test Workflow 8 — Route DB Update
 * 
 * Route #150: update scheduledDate to 2026-06-23 (keep supervisorId=13 as-is, or set to 14 per user req)
 * Route #151: duplicate of #150 for 2026-06-24, supervisorId=14 (adewuyiadey)
 * Route #152: duplicate of #150 for 2026-06-25, supervisorId=14 (adewuyiadey)
 * 
 * Route #150 data:
 *   workerId: null, vehicleId: null, totalDistance: "1.5901714018701711"
 *   estimatedDuration: "6.115435840192722", efficiencyScore: 50, status: "assigned"
 *   supervisorId: 13 (original) → 14 (adewuyiadey) per user requirement
 *   customers: [12764, 12622, 12625] (sequence 1, 2, 3)
 *
 * adewuyiadey worker ID: 14
 */

import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const SUPERVISOR_ID = 14; // adewuyiadey@gmail.com
const CUSTOMER_IDS = [12764, 12622, 12625];
const ROUTE_DATA = {
  workerId: null,
  vehicleId: null,
  totalDistance: '1.5901714018701711',
  estimatedDuration: '6.115435840192722',
  efficiencyScore: 50,
  status: 'assigned',
  supervisorId: SUPERVISOR_ID,
};

async function run() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    console.log('🔌 Connected to database');
    
    // Step 1: Update route #150 scheduledDate to 2026-06-23 and supervisorId to 14
    console.log('\n📅 Step 1: Updating route #150...');
    const [updateResult] = await connection.execute(
      `UPDATE routes SET scheduledDate = '2026-06-23', supervisorId = ? WHERE id = 150`,
      [SUPERVISOR_ID]
    );
    console.log('✅ Route #150 updated:', updateResult.affectedRows, 'row(s) affected');
    
    // Step 2: Create route #151 for 2026-06-24
    console.log('\n📅 Step 2: Creating route #151 (2026-06-24)...');
    const [insert151] = await connection.execute(
      `INSERT INTO routes (workerId, vehicleId, totalDistance, estimatedDuration, efficiencyScore, status, scheduledDate, supervisorId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, '2026-06-24', ?, NOW(), NOW())`,
      [
        ROUTE_DATA.workerId,
        ROUTE_DATA.vehicleId,
        ROUTE_DATA.totalDistance,
        ROUTE_DATA.estimatedDuration,
        ROUTE_DATA.efficiencyScore,
        ROUTE_DATA.status,
        ROUTE_DATA.supervisorId,
      ]
    );
    const route151Id = insert151.insertId;
    console.log('✅ Route #151 created with ID:', route151Id);
    
    // Add customers for route #151
    for (let i = 0; i < CUSTOMER_IDS.length; i++) {
      await connection.execute(
        `INSERT INTO routeCustomers (routeId, customerId, sequenceNumber, estimatedServiceTime) VALUES (?, ?, ?, 30)`,
        [route151Id, CUSTOMER_IDS[i], i + 1]
      );
    }
    console.log('✅ Route #151 customers added:', CUSTOMER_IDS.length, 'customers');
    
    // Step 3: Create route #152 for 2026-06-25
    console.log('\n📅 Step 3: Creating route #152 (2026-06-25)...');
    const [insert152] = await connection.execute(
      `INSERT INTO routes (workerId, vehicleId, totalDistance, estimatedDuration, efficiencyScore, status, scheduledDate, supervisorId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, '2026-06-25', ?, NOW(), NOW())`,
      [
        ROUTE_DATA.workerId,
        ROUTE_DATA.vehicleId,
        ROUTE_DATA.totalDistance,
        ROUTE_DATA.estimatedDuration,
        ROUTE_DATA.efficiencyScore,
        ROUTE_DATA.status,
        ROUTE_DATA.supervisorId,
      ]
    );
    const route152Id = insert152.insertId;
    console.log('✅ Route #152 created with ID:', route152Id);
    
    // Add customers for route #152
    for (let i = 0; i < CUSTOMER_IDS.length; i++) {
      await connection.execute(
        `INSERT INTO routeCustomers (routeId, customerId, sequenceNumber, estimatedServiceTime) VALUES (?, ?, ?, 30)`,
        [route152Id, CUSTOMER_IDS[i], i + 1]
      );
    }
    console.log('✅ Route #152 customers added:', CUSTOMER_IDS.length, 'customers');
    
    // Verify the results
    console.log('\n🔍 Verification:');
    const [rows] = await connection.execute(
      `SELECT id, scheduledDate, supervisorId, status, workerId FROM routes WHERE id IN (150, ?, ?) ORDER BY id`,
      [route151Id, route152Id]
    );
    console.log('Routes created/updated:');
    for (const row of rows) {
      console.log(`  Route #${row.id}: date=${row.scheduledDate}, supervisorId=${row.supervisorId}, status=${row.status}, workerId=${row.workerId}`);
    }
    
    const [rcRows] = await connection.execute(
      `SELECT routeId, COUNT(*) as customerCount FROM routeCustomers WHERE routeId IN (150, ?, ?) GROUP BY routeId ORDER BY routeId`,
      [route151Id, route152Id]
    );
    console.log('Route customers:');
    for (const row of rcRows) {
      console.log(`  Route #${row.routeId}: ${row.customerCount} customers`);
    }
    
    console.log('\n✅ DONE! Summary:');
    console.log(`  Route #150 → 2026-06-23 (supervisorId=14)`);
    console.log(`  Route #${route151Id} → 2026-06-24 (supervisorId=14)`);
    console.log(`  Route #${route152Id} → 2026-06-25 (supervisorId=14)`);
    console.log(`  All routes assigned to adewuyiadey@gmail.com (worker ID 14)`);
    
  } finally {
    await connection.end();
    console.log('\n🔌 Connection closed');
  }
}

run().catch(err => {
  console.error('❌ Script failed:', err.message);
  process.exit(1);
});
