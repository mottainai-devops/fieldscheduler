/**
 * Manual sync script for Zoho Books financial data
 * Run with: DATABASE_URL='...' npx tsx manualSync.ts
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import axios from 'axios';

// Import schema from drizzle directory
import { customers, invoices, payments, invoiceItems } from './drizzle/schema.js';
import { eq } from 'drizzle-orm';

const ZOHO_API_BASE = 'https://www.zohoapis.com/books/v3';
const ZOHO_ORG_ID = process.env.ZOHO_ORGANIZATION_ID || '854644244';

async function getZohoAccessToken(): Promise<string> {
  // For now, return the token from environment
  // In production, this should refresh the token if needed
  const token = process.env.ZOHO_ACCESS_TOKEN;
  if (!token) {
    throw new Error('ZOHO_ACCESS_TOKEN not found in environment');
  }
  return token;
}

async function syncFinancialData(batchSize: number = 10) {
  console.log('🚀 Starting Zoho Books financial sync...\n');
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not found');
  }

  const connection = await mysql.createConnection(databaseUrl);
  const db = drizzle(connection);
  
  const accessToken = await getZohoAccessToken();
  
  let stats = {
    customersProcessed: 0,
    invoicesSynced: 0,
    paymentsSynced: 0,
    errors: 0,
  };

  try {
    // Get customers with Zoho contact IDs
    console.log('📋 Fetching customers from database...');
    const allCustomers = await connection.query(
      'SELECT id, zohoContactId, fieldManager as fieldManagerId, customermaf as maf FROM customers WHERE zohoContactId IS NOT NULL LIMIT ?',
      [batchSize]
    );
    
    const customersList = allCustomers[0] as any[];
    console.log(`Found ${customersList.length} customers with Zoho contact IDs\n`);

    for (const customer of customersList) {
      try {
        console.log(`Processing customer ${customer.id} (Zoho: ${customer.zohoContactId})...`);
        stats.customersProcessed++;

        // Fetch invoices for this customer
        const invoicesResponse = await axios.get(
          `${ZOHO_API_BASE}/invoices`,
          {
            headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
            params: {
              organization_id: ZOHO_ORG_ID,
              customer_id: customer.zohoContactId,
            },
          }
        );

        const invoicesList = invoicesResponse.data.invoices || [];
        console.log(`  Found ${invoicesList.length} invoices`);

        for (const inv of invoicesList) {
          try {
            // Upsert invoice
            await connection.query(
              `INSERT INTO invoices (zohoInvoiceId, customerId, fieldManagerId, maf, invoiceNumber, invoiceDate, dueDate, customerName, total, balance, status, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
               ON DUPLICATE KEY UPDATE
                 customerId = VALUES(customerId),
                 fieldManagerId = VALUES(fieldManagerId),
                 maf = VALUES(maf),
                 total = VALUES(total),
                 balance = VALUES(balance),
                 status = VALUES(status),
                 updatedAt = NOW()`,
              [
                inv.invoice_id,
                customer.id,
                customer.fieldManagerId,
                customer.maf,
                inv.invoice_number,
                inv.date,
                inv.due_date,
                inv.customer_name,
                inv.total,
                inv.balance,
                inv.status,
              ]
            );
            stats.invoicesSynced++;
          } catch (error: any) {
            console.error(`    Error syncing invoice ${inv.invoice_number}:`, error.message);
            stats.errors++;
          }
        }

        // Fetch payments for this customer
        const paymentsResponse = await axios.get(
          `${ZOHO_API_BASE}/customerpayments`,
          {
            headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
            params: {
              organization_id: ZOHO_ORG_ID,
              customer_id: customer.zohoContactId,
            },
          }
        );

        const paymentsList = paymentsResponse.data.customerpayments || [];
        console.log(`  Found ${paymentsList.length} payments`);

        for (const pmt of paymentsList) {
          try {
            // Get invoice ID from our database
            const invoiceResult = await connection.query(
              'SELECT id FROM invoices WHERE zohoInvoiceId = ? LIMIT 1',
              [pmt.invoice_id]
            );
            const invoiceData = invoiceResult[0] as any[];
            const invoiceId = invoiceData.length > 0 ? invoiceData[0].id : null;

            // Upsert payment
            await connection.query(
              `INSERT INTO payments (zohoPaymentId, invoiceId, customerId, fieldManagerId, maf, paymentNumber, paymentDate, customerName, invoiceNumber, amount, paymentMode, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
               ON DUPLICATE KEY UPDATE
                 invoiceId = VALUES(invoiceId),
                 customerId = VALUES(customerId),
                 fieldManagerId = VALUES(fieldManagerId),
                 maf = VALUES(maf),
                 amount = VALUES(amount),
                 paymentMode = VALUES(paymentMode),
                 updatedAt = NOW()`,
              [
                pmt.payment_id,
                invoiceId,
                customer.id,
                customer.fieldManagerId,
                customer.maf,
                pmt.payment_number,
                pmt.date,
                pmt.customer_name,
                pmt.invoice_number,
                pmt.amount,
                pmt.payment_mode,
              ]
            );
            stats.paymentsSynced++;
          } catch (error: any) {
            console.error(`    Error syncing payment ${pmt.payment_number}:`, error.message);
            stats.errors++;
          }
        }

        console.log(`  ✅ Customer ${customer.id} processed\n`);
      } catch (error: any) {
        console.error(`  ❌ Error processing customer ${customer.id}:`, error.message);
        stats.errors++;
      }
    }

    console.log('\n📊 Sync Summary:');
    console.log(`  Customers Processed: ${stats.customersProcessed}`);
    console.log(`  Invoices Synced: ${stats.invoicesSynced}`);
    console.log(`  Payments Synced: ${stats.paymentsSynced}`);
    console.log(`  Errors: ${stats.errors}`);
    
    return stats;
  } finally {
    await connection.end();
  }
}

// Run sync
syncFinancialData(10)
  .then(() => {
    console.log('\n✅ Sync completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  });
