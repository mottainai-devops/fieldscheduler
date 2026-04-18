#!/usr/bin/env node

/**
 * Test Data Generator for Field Worker Scheduler
 * Generates large datasets (100+, 1000+) for performance testing
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api/trpc';

// Helper to make tRPC calls
async function callTRPC(route, input = {}) {
  const url = new URL(`${API_BASE}/${route}`);
  url.searchParams.append('input', JSON.stringify(input));
  
  const response = await fetch(url.toString());
  const data = await response.json();
  return data.result?.data;
}

// Generate random coordinates around Lagos, Nigeria
function generateCoordinates() {
  const baseLat = 6.5244;
  const baseLng = 3.3792;
  const latOffset = (Math.random() - 0.5) * 0.5; // ~55km radius
  const lngOffset = (Math.random() - 0.5) * 0.5;
  
  return {
    latitude: (baseLat + latOffset).toFixed(6),
    longitude: (baseLng + lngOffset).toFixed(6),
  };
}

// Generate random customer data
function generateCustomer(id, routeId) {
  const coords = generateCoordinates();
  const serviceTypes = ['Delivery', 'Installation', 'Maintenance', 'Inspection', 'Repair'];
  const priorities = ['High', 'Medium', 'Low'];
  
  return {
    name: `Customer ${id}`,
    address: `Address ${id}, Lagos`,
    latitude: coords.latitude,
    longitude: coords.longitude,
    phone: `080${String(Math.floor(Math.random() * 10000000000)).padStart(10, '0')}`,
    email: `customer${id}@example.com`,
    serviceType: serviceTypes[Math.floor(Math.random() * serviceTypes.length)],
    priority: priorities[Math.floor(Math.random() * priorities.length)],
    routeId: routeId,
  };
}

// Generate random route data
function generateRoute(id, workerId, vehicleId, customerCount) {
  const today = new Date();
  const scheduledDate = new Date(today.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000);
  
  return {
    workerId,
    vehicleId,
    scheduledDate: scheduledDate.toISOString().split('T')[0],
    status: 'pending',
    totalDistance: (Math.random() * 100 + 20).toFixed(2),
    estimatedDuration: Math.floor(Math.random() * 480 + 120), // 2-10 hours
    customerCount,
  };
}

// Main generation function
async function generateTestData(customerCount) {
  console.log(`\n🚀 Generating test data for ${customerCount} customers...`);
  
  try {
    // Get or create workers
    console.log('📋 Creating workers...');
    const workers = [
      { name: 'John Doe', phone: '08012345678', pin: '1234' },
      { name: 'Jane Smith', phone: '08087654321', pin: '5678' },
      { name: 'Mike Johnson', phone: '08098765432', pin: '9012' },
    ];
    
    const workerIds = [];
    for (const worker of workers) {
      try {
        const result = await callTRPC('fieldWorker.createWorker', worker);
        if (result?.id) {
          workerIds.push(result.id);
          console.log(`  ✓ Created worker: ${worker.name} (ID: ${result.id})`);
        }
      } catch (e) {
        console.log(`  ⚠ Worker ${worker.name} might already exist`);
      }
    }
    
    if (workerIds.length === 0) {
      console.log('  ℹ Using existing workers...');
      // Fallback to first 3 workers
      workerIds.push(1, 2, 3);
    }
    
    // Create vehicles
    console.log('🚗 Creating vehicles...');
    const vehicles = [
      { plateNumber: 'LG-001-ABC', capacity: 500, status: 'available' },
      { plateNumber: 'LG-002-DEF', capacity: 500, status: 'available' },
      { plateNumber: 'LG-003-GHI', capacity: 500, status: 'available' },
    ];
    
    const vehicleIds = [];
    for (const vehicle of vehicles) {
      try {
        const result = await callTRPC('fieldWorker.createVehicle', vehicle);
        if (result?.id) {
          vehicleIds.push(result.id);
          console.log(`  ✓ Created vehicle: ${vehicle.plateNumber} (ID: ${result.id})`);
        }
      } catch (e) {
        console.log(`  ⚠ Vehicle ${vehicle.plateNumber} might already exist`);
      }
    }
    
    if (vehicleIds.length === 0) {
      vehicleIds.push(1, 2, 3);
    }
    
    // Create routes and customers
    console.log(`📍 Creating ${customerCount} customers in routes...`);
    const customersPerRoute = Math.ceil(customerCount / workerIds.length);
    let totalCustomers = 0;
    let totalRoutes = 0;
    
    for (let w = 0; w < workerIds.length; w++) {
      const workerId = workerIds[w];
      const vehicleId = vehicleIds[w % vehicleIds.length];
      const routeCustomerCount = Math.min(customersPerRoute, customerCount - totalCustomers);
      
      if (routeCustomerCount <= 0) break;
      
      // Create route
      const routeData = generateRoute(totalRoutes + 1, workerId, vehicleId, routeCustomerCount);
      try {
        const routeResult = await callTRPC('fieldWorker.createRoute', routeData);
        if (routeResult?.id) {
          const routeId = routeResult.id;
          totalRoutes++;
          console.log(`  ✓ Created route ${totalRoutes} for worker ${workerId} with ${routeCustomerCount} customers`);
          
          // Create customers for this route
          for (let c = 0; c < routeCustomerCount; c++) {
            const customerData = generateCustomer(totalCustomers + 1, routeId);
            try {
              const customerResult = await callTRPC('fieldWorker.createCustomer', customerData);
              if (customerResult?.id) {
                totalCustomers++;
                if (totalCustomers % 100 === 0) {
                  console.log(`    ✓ Created ${totalCustomers} customers...`);
                }
              }
            } catch (e) {
              console.error(`    ✗ Failed to create customer: ${e.message}`);
            }
          }
        }
      } catch (e) {
        console.error(`  ✗ Failed to create route: ${e.message}`);
      }
    }
    
    console.log(`\n✅ Test data generation complete!`);
    console.log(`   - Workers: ${workerIds.length}`);
    console.log(`   - Vehicles: ${vehicleIds.length}`);
    console.log(`   - Routes: ${totalRoutes}`);
    console.log(`   - Customers: ${totalCustomers}`);
    console.log(`\n📊 Performance Testing:`);
    console.log(`   - Test with ${totalCustomers} customers`);
    console.log(`   - Run route optimization to measure performance`);
    
  } catch (error) {
    console.error('❌ Error generating test data:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const customerCount = parseInt(args[0]) || 100;

if (customerCount < 10) {
  console.error('❌ Customer count must be at least 10');
  process.exit(1);
}

generateTestData(customerCount);

