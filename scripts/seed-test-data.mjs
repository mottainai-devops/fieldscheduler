#!/usr/bin/env node

/**
 * Direct Database Seeding Script
 * Creates test data directly in the database
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { 
  workers, 
  vehicles, 
  routes, 
  customers 
} from '../drizzle/schema.js';
import { eq } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

async function seedTestData(customerCount) {
  console.log(`\n🚀 Seeding test data for ${customerCount} customers...`);
  
  try {
    // Create connection pool
    const connection = await mysql.createConnection(DATABASE_URL);
    const db = drizzle(connection);
    
    // Create workers
    console.log('📋 Creating workers...');
    const workerData = [
      { name: 'John Doe', phone: '08012345678', pin: '1234', email: 'john@example.com', openId: 'worker-john-001', loginMethod: 'pin' },
      { name: 'Jane Smith', phone: '08087654321', pin: '5678', email: 'jane@example.com', openId: 'worker-jane-001', loginMethod: 'pin' },
      { name: 'Mike Johnson', phone: '08098765432', pin: '9012', email: 'mike@example.com', openId: 'worker-mike-001', loginMethod: 'pin' },
    ];
    
    const createdWorkers = [];
    for (const w of workerData) {
      try {
        // Check if worker exists
        const existing = await db.select().from(workers).where(eq(workers.openId, w.openId)).limit(1);
        if (existing.length > 0) {
          createdWorkers.push(existing[0]);
          console.log(`  ✓ Worker ${w.name} already exists (ID: ${existing[0].id})`);
        } else {
          const result = await db.insert(workers).values(w);
          console.log(`  ✓ Created worker: ${w.name}`);
          createdWorkers.push({ id: result[0], ...w });
        }
      } catch (e) {
        console.error(`  ✗ Error with worker ${w.name}:`, e.message);
      }
    }
    
    // Create vehicles
    console.log('🚗 Creating vehicles...');
    const vehicleData = [
      { plateNumber: 'LG-TEST-001', capacity: 500, status: 'available', startLatitude: '6.5244', startLongitude: '3.3792' },
      { plateNumber: 'LG-TEST-002', capacity: 500, status: 'available', startLatitude: '6.5244', startLongitude: '3.3792' },
      { plateNumber: 'LG-TEST-003', capacity: 500, status: 'available', startLatitude: '6.5244', startLongitude: '3.3792' },
    ];
    
    const createdVehicles = [];
    for (const v of vehicleData) {
      try {
        const existing = await db.select().from(vehicles).where(eq(vehicles.plateNumber, v.plateNumber)).limit(1);
        if (existing.length > 0) {
          createdVehicles.push(existing[0]);
          console.log(`  ✓ Vehicle ${v.plateNumber} already exists (ID: ${existing[0].id})`);
        } else {
          const result = await db.insert(vehicles).values(v);
          console.log(`  ✓ Created vehicle: ${v.plateNumber}`);
          createdVehicles.push({ id: result[0], ...v });
        }
      } catch (e) {
        console.error(`  ✗ Error with vehicle ${v.plateNumber}:`, e.message);
      }
    }
    
    // Create routes and customers
    console.log(`📍 Creating ${customerCount} customers in routes...`);
    
    const customersPerRoute = Math.ceil(customerCount / createdWorkers.length);
    let totalCustomers = 0;
    let totalRoutes = 0;
    
    for (let w = 0; w < createdWorkers.length; w++) {
      const worker = createdWorkers[w];
      const vehicle = createdVehicles[w % createdVehicles.length];
      const routeCustomerCount = Math.min(customersPerRoute, customerCount - totalCustomers);
      
      if (routeCustomerCount <= 0) break;
      
      // Create route
      const today = new Date();
      const scheduledDate = new Date(today.getTime() + (w % 7) * 24 * 60 * 60 * 1000);
      
      const routeData = {
        workerId: worker.id,
        vehicleId: vehicle.id,
        scheduledDate: scheduledDate.toISOString().split('T')[0],
        status: 'pending',
        totalDistance: (Math.random() * 100 + 20).toFixed(2),
        estimatedDuration: Math.floor(Math.random() * 480 + 120),
      };
      
      try {
        const routeResult = await db.insert(routes).values(routeData);
        const routeId = routeResult[0];
        totalRoutes++;
        console.log(`  ✓ Created route ${totalRoutes} for worker ${worker.name} with ${routeCustomerCount} customers`);
        
        // Create customers for this route
        const customerValues = [];
        for (let c = 0; c < routeCustomerCount; c++) {
          const baseLat = 6.5244;
          const baseLng = 3.3792;
          const latOffset = (Math.random() - 0.5) * 0.5;
          const lngOffset = (Math.random() - 0.5) * 0.5;
          
          const serviceTypes = ['Delivery', 'Installation', 'Maintenance', 'Inspection', 'Repair'];
          const priorities = ['High', 'Medium', 'Low'];
          
          customerValues.push({
            name: `Test Customer ${totalCustomers + c + 1}`,
            address: `Address ${totalCustomers + c + 1}, Lagos`,
            latitude: (baseLat + latOffset).toFixed(6),
            longitude: (baseLng + lngOffset).toFixed(6),
            phone: `080${String(Math.floor(Math.random() * 10000000000)).padStart(10, '0')}`,
            email: `customer${totalCustomers + c + 1}@test.com`,
            serviceType: serviceTypes[Math.floor(Math.random() * serviceTypes.length)],
            priority: priorities[Math.floor(Math.random() * priorities.length)],
            routeId: routeId,
          });
        }
        
        // Batch insert customers
        if (customerValues.length > 0) {
          await db.insert(customers).values(customerValues);
          totalCustomers += customerValues.length;
          console.log(`    ✓ Created ${customerValues.length} customers for route ${totalRoutes}`);
        }
      } catch (e) {
        console.error(`  ✗ Error creating route:`, e.message);
      }
    }
    
    console.log(`\n✅ Test data seeding complete!`);
    console.log(`   - Workers: ${createdWorkers.length}`);
    console.log(`   - Vehicles: ${createdVehicles.length}`);
    console.log(`   - Routes: ${totalRoutes}`);
    console.log(`   - Customers: ${totalCustomers}`);
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error seeding test data:', error.message);
    process.exit(1);
  }
}

const customerCount = parseInt(process.argv[2]) || 100;
seedTestData(customerCount);
