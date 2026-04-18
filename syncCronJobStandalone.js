#!/usr/bin/env node
/**
 * Standalone cron job for automated Zoho Books financial sync
 * Runs every 6 hours to keep financial data up-to-date
 * 
 * This script uses node-cron for scheduling instead of PM2 cron
 */

const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');

// Path to the sync script
const syncScriptPath = path.join(__dirname, 'syncCronJob.ts');

function runSync() {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] 🕐 Triggering scheduled financial sync...`);
  
  // Execute the sync script using tsx
  exec(`npx tsx ${syncScriptPath}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`[${timestamp}] ❌ Sync execution failed:`, error);
      return;
    }
    
    if (stderr) {
      console.error(`[${timestamp}] ⚠️  Sync stderr:`, stderr);
    }
    
    console.log(stdout);
  });
}

// Schedule: Run every 6 hours (at 00:00, 06:00, 12:00, 18:00)
const schedule = '0 */6 * * *';

console.log('🚀 Financial Sync Scheduler Started');
console.log(`📅 Schedule: Every 6 hours (${schedule})`);
console.log(`📁 Sync script: ${syncScriptPath}`);
console.log('⏳ Waiting for next scheduled run...\n');

// Create the cron job
cron.schedule(schedule, runSync, {
  scheduled: true,
  timezone: "Africa/Lagos" // Adjust to your timezone
});

// Run once immediately on startup
console.log('▶️  Running initial sync...');
runSync();

// Keep the process alive
process.on('SIGINT', () => {
  console.log('\n👋 Financial Sync Scheduler stopped');
  process.exit(0);
});
