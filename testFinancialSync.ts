/**
 * Test script for Zoho Books financial sync
 * Tests the sync service with a small batch of customers
 */

import { syncFinancialData } from './server/services/zohoFinancialSync';
import { db } from './db';
import { invoices, payments } from './db/schema';
import { sql } from 'drizzle-orm';

async function testSync() {
  console.log('🧪 Testing Financial Sync Service...\n');
  
  try {
    // Get current counts before sync
    const invoiceCountBefore = await db.select({ count: sql<number>`count(*)` }).from(invoices);
    const paymentCountBefore = await db.select({ count: sql<number>`count(*)` }).from(payments);
    
    console.log('📊 Before Sync:');
    console.log(`   Invoices: ${invoiceCountBefore[0]?.count || 0}`);
    console.log(`   Payments: ${paymentCountBefore[0]?.count || 0}\n`);
    
    // Run sync with small batch size for testing
    console.log('🔄 Starting sync (batch size: 5)...\n');
    const result = await syncFinancialData(5);
    
    // Get counts after sync
    const invoiceCountAfter = await db.select({ count: sql<number>`count(*)` }).from(invoices);
    const paymentCountAfter = await db.select({ count: sql<number>`count(*)` }).from(payments);
    
    console.log('\n📊 After Sync:');
    console.log(`   Invoices: ${invoiceCountAfter[0]?.count || 0} (+${(invoiceCountAfter[0]?.count || 0) - (invoiceCountBefore[0]?.count || 0)})`);
    console.log(`   Payments: ${paymentCountAfter[0]?.count || 0} (+${(paymentCountAfter[0]?.count || 0) - (paymentCountBefore[0]?.count || 0)})`);
    
    console.log('\n✅ Sync Result:');
    console.log(`   Customers Processed: ${result.customersProcessed}`);
    console.log(`   Invoices Synced: ${result.invoicesSynced}`);
    console.log(`   Payments Synced: ${result.paymentsSynced}`);
    console.log(`   Errors: ${result.errors}`);
    
    if (result.errors > 0) {
      console.log('\n⚠️  Some errors occurred during sync. Check logs for details.');
    } else {
      console.log('\n✅ Sync completed successfully!');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run test
testSync()
  .then(() => {
    console.log('\n🎉 Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
