/**
 * Cron job for automated Zoho Books financial sync
 * Runs every 6 hours to keep financial data up-to-date
 */

import { syncFinancialData } from './server/services/zohoFinancialSync';

async function runScheduledSync() {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] 🕐 Starting scheduled financial sync...`);
  
  try {
    // Run full sync (no batch limit)
    const result = await syncFinancialData();
    
    console.log(`[${timestamp}] ✅ Sync completed successfully:`);
    console.log(`   Customers Processed: ${result.customersProcessed}`);
    console.log(`   Invoices Synced: ${result.invoicesSynced}`);
    console.log(`   Payments Synced: ${result.paymentsSynced}`);
    console.log(`   Errors: ${result.errors}`);
    
    if (result.errors > 0) {
      console.warn(`[${timestamp}] ⚠️  ${result.errors} errors occurred during sync`);
    }
    
  } catch (error) {
    console.error(`[${timestamp}] ❌ Sync failed:`, error);
    // Don't throw - let cron continue
  }
}

// Run immediately
runScheduledSync();
