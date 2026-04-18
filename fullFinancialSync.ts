/**
 * Full Financial Sync Script
 * Syncs customers, invoices, and payments from Zoho Books
 */
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import axios from 'axios';
import { customers, invoices, payments } from './drizzle/schema.js';
import { eq } from 'drizzle-orm';

const ZOHO_API_BASE = 'https://www.zohoapis.com/books/v3';
const ZOHO_ORG_ID = process.env.ZOHO_ORGANIZATION_ID || '854644244';

async function getZohoAccessToken(): Promise<string> {
  const token = process.env.ZOHO_ACCESS_TOKEN;
  if (!token) {
    throw new Error('ZOHO_ACCESS_TOKEN not found in environment');
  }
  return token;
}

async function fullSync() {
  console.log('🚀 Starting FULL Zoho Books financial sync...\n');
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not found');
  }

  const connection = await mysql.createConnection(databaseUrl);
  const db = drizzle(connection);
  const accessToken = await getZohoAccessToken();

  const headers = {
    'Authorization': `Zoho-oauthtoken ${accessToken}`,
  };

  let stats = {
    customersUpdated: 0,
    invoicesSynced: 0,
    paymentsSynced: 0,
    errors: 0,
  };

  try {
    // Step 1: Get all customers from local database
    console.log('📋 Step 1: Fetching local customers...');
    const [localCustomers] = await connection.query<any[]>(
      'SELECT id, name, zohoContactId FROM customers LIMIT 100'
    );
    console.log(`Found ${localCustomers.length} local customers\n`);

    // Step 2: Fetch customers from Zoho and match by name
    console.log('📋 Step 2: Fetching customers from Zoho Books...');
    const zohoCustomersResponse = await axios.get(
      `${ZOHO_API_BASE}/contacts`,
      {
        headers,
        params: {
          organization_id: ZOHO_ORG_ID,
          per_page: 200,
        },
      }
    );

    const zohoCustomers = zohoCustomersResponse.data.contacts || [];
    console.log(`Found ${zohoCustomers.length} customers in Zoho Books\n`);

    // Step 3: Match and update local customers with Zoho contact IDs
    console.log('🔗 Step 3: Matching and updating customer Zoho IDs...');
    for (const localCustomer of localCustomers) {
      const zohoMatch = zohoCustomers.find((zc: any) => 
        zc.contact_name?.toLowerCase() === localCustomer.name?.toLowerCase()
      );

      if (zohoMatch && !localCustomer.zohoContactId) {
        await connection.query(
          'UPDATE customers SET zohoContactId = ? WHERE id = ?',
          [zohoMatch.contact_id, localCustomer.id]
        );
        stats.customersUpdated++;
        console.log(`✅ Linked: ${localCustomer.name} → ${zohoMatch.contact_id}`);
      }
    }
    console.log(`\n✅ Updated ${stats.customersUpdated} customers with Zoho IDs\n`);

    // Step 4: Get updated list of customers with Zoho IDs
    const [customersWithZoho] = await connection.query<any[]>(
      'SELECT id, name, zohoContactId FROM customers WHERE zohoContactId IS NOT NULL LIMIT 50'
    );
    console.log(`📊 Found ${customersWithZoho.length} customers with Zoho IDs\n`);

    // Step 5: Sync invoices for these customers
    console.log('💰 Step 5: Syncing invoices...');
    for (const customer of customersWithZoho) {
      try {
        const invoicesResponse = await axios.get(
          `${ZOHO_API_BASE}/invoices`,
          {
            headers,
            params: {
              organization_id: ZOHO_ORG_ID,
              customer_id: customer.zohoContactId,
            },
          }
        );

        const zohoInvoices = invoicesResponse.data.invoices || [];
        
        for (const invoice of zohoInvoices) {
          // Check if invoice already exists
          const [existing] = await connection.query(
            'SELECT id FROM invoices WHERE zohoInvoiceId = ?',
            [invoice.invoice_id]
          );

          if (existing.length === 0) {
            await connection.query(
              `INSERT INTO invoices (
                zohoInvoiceId, zohoCustomerId, invoiceNumber, invoiceDate, 
                dueDate, total, balance, status
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                invoice.invoice_id,
                customer.zohoContactId,
                invoice.invoice_number,
                invoice.date,
                invoice.due_date,
                invoice.total,
                invoice.balance,
                invoice.status,
                
              ]
            );
            stats.invoicesSynced++;
          }
        }

        console.log(`  ✅ ${customer.name}: ${zohoInvoices.length} invoices`);
      } catch (error: any) {
        console.log(`  ❌ ${customer.name}: ${error.message}`);
        stats.errors++;
      }
    }

    // Step 6: Sync payments
    console.log('\n💵 Step 6: Syncing payments...');
    for (const customer of customersWithZoho.slice(0, 20)) {
      try {
        const paymentsResponse = await axios.get(
          `${ZOHO_API_BASE}/customerpayments`,
          {
            headers,
            params: {
              organization_id: ZOHO_ORG_ID,
              customer_id: customer.zohoContactId,
            },
          }
        );

        const zohoPayments = paymentsResponse.data.customerpayments || [];
        
        for (const payment of zohoPayments) {
          const [existing] = await connection.query(
            'SELECT id FROM payments WHERE zohoPaymentId = ?',
            [payment.payment_id]
          );

          if (existing.length === 0) {
            await connection.query(
              `INSERT INTO payments (
                zohoPaymentId, zohoCustomerId, paymentNumber, paymentDate,
                amount, paymentMode
              ) VALUES (?, ?, ?, ?, ?, ?)`,
              [
                payment.payment_id,
                customer.zohoContactId,
                payment.payment_number,
                payment.date,
                payment.amount,
                payment.payment_mode
                
              ]
            );
            stats.paymentsSynced++;
          }
        }

        if (zohoPayments.length > 0) {
          console.log(`  ✅ ${customer.name}: ${zohoPayments.length} payments`);
        }
      } catch (error: any) {
        console.log(`  ❌ ${customer.name}: ${error.message}`);
      }
    }

    console.log('\n\n📊 === SYNC COMPLETE ===');
    console.log(`✅ Customers updated: ${stats.customersUpdated}`);
    console.log(`✅ Invoices synced: ${stats.invoicesSynced}`);
    console.log(`✅ Payments synced: ${stats.paymentsSynced}`);
    console.log(`❌ Errors: ${stats.errors}`);

  } catch (error) {
    console.error('❌ Sync failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

fullSync().catch(console.error);
