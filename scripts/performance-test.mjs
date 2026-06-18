#!/usr/bin/env node

/**
 * Performance Testing Script for Route Optimization
 * Tests the Mottainai optimization algorithm with various dataset sizes
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api/trpc';

async function callTRPC(route, input = {}) {
  const url = new URL(`${API_BASE}/${route}`);
  url.searchParams.append('input', JSON.stringify(input));
  
  const response = await fetch(url.toString());
  const data = await response.json();
  return data.result?.data;
}

async function testRouteOptimization(customerCount) {
  console.log(`\n⏱️  Testing route optimization with ${customerCount} customers...`);
  
  try {
    // Get all customers
    const customers = await callTRPC('fieldWorker.getCustomers');
    const selectedCustomers = customers.slice(0, customerCount);
    
    if (selectedCustomers.length < customerCount) {
      console.log(`⚠️  Only ${selectedCustomers.length} customers available (requested ${customerCount})`);
    }
    
    const customerIds = selectedCustomers.map(c => c.id);
    
    // Measure optimization time
    const startTime = performance.now();
    
    const result = await callTRPC('arcgis.calculateRoute', {
      customerIds,
      stops: selectedCustomers.map(c => ({
        latitude: parseFloat(c.latitude),
        longitude: parseFloat(c.longitude),
        name: c.name,
      })),
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Optimization complete!`);
    console.log(`   - Duration: ${duration.toFixed(2)}ms`);
    console.log(`   - Customers: ${selectedCustomers.length}`);
    console.log(`   - Avg per customer: ${(duration / selectedCustomers.length).toFixed(2)}ms`);
    
    if (result?.summary) {
      console.log(`   - Total distance: ${result.summary.totalDistance}km`);
      console.log(`   - Total time: ${result.summary.totalTime}min`);
      console.log(`   - Efficiency: ${result.summary.efficiencyScore?.toFixed(2)}%`);
    }
    
    return {
      customerCount: selectedCustomers.length,
      duration,
      result,
    };
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return null;
  }
}

async function runPerformanceTests() {
  console.log('🚀 Field Worker Scheduler - Performance Testing');
  console.log('='.repeat(50));
  
  const testSizes = [10, 50, 100, 500, 1000];
  const results = [];
  
  for (const size of testSizes) {
    const result = await testRouteOptimization(size);
    if (result) {
      results.push(result);
    }
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n📊 Performance Summary');
  console.log('='.repeat(50));
  console.log('Customers | Duration (ms) | Per Customer (ms)');
  console.log('-'.repeat(50));
  
  for (const result of results) {
    const perCustomer = result.duration / result.customerCount;
    console.log(`${result.customerCount.toString().padEnd(9)} | ${result.duration.toFixed(2).padEnd(13)} | ${perCustomer.toFixed(2)}`);
  }
  
  console.log('\n✅ Performance testing complete!');
}

runPerformanceTests().catch(console.error);
