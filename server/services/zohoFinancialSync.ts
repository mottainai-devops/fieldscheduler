import { getDb } from "../db";
import { zohoInvoices, zohoPayments, customers } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import * as zoho from "./zoho";

/**
 * Sync all invoices from Zoho Books
 * Fetches invoices for all customers with Zoho contact IDs
 */
export async function syncAllInvoices(): Promise<{ success: number; failed: number; total: number }> {
  console.log('[Zoho Financial Sync] Starting invoice sync...');
  
  const db = await getDb();
  if (!db) {
    console.error('[Zoho Financial Sync] Database not available');
    return { success: 0, failed: 0, total: 0 };
  }

  // Get all customers with Zoho contact IDs
  const allCustomers = await db.select().from(customers).where(eq(customers.zohoContactId, customers.zohoContactId));
  const customersWithZoho = allCustomers.filter(c => c.zohoContactId);
  
  console.log(`[Zoho Financial Sync] Found ${customersWithZoho.length} customers with Zoho contact IDs`);

  let success = 0;
  let failed = 0;

  for (const customer of customersWithZoho) {
    try {
      if (!customer.zohoContactId) continue;

      // Fetch invoices for this customer
      const invoices = await zoho.getCustomerInvoices(customer.zohoContactId);
      
      if (!invoices || invoices.length === 0) {
        continue;
      }

      // Insert or update invoices
      for (const invoice of invoices) {
        try {
          await db.insert(zohoInvoices).values({
            invoiceId: invoice.invoice_id,
            invoiceNumber: invoice.invoice_number,
            customerId: customer.zohoContactId,
            customerName: invoice.customer_name || customer.name,
            status: invoice.status,
            invoiceDate: invoice.date ? new Date(invoice.date) : null,
            dueDate: invoice.due_date ? new Date(invoice.due_date) : null,
            total: invoice.total?.toString() || "0",
            balance: invoice.balance?.toString() || "0",
            currencyCode: invoice.currency_code || "USD",
            syncedAt: new Date(),
          }).onDuplicateKeyUpdate({
            set: {
              status: invoice.status,
              balance: invoice.balance?.toString() || "0",
              syncedAt: new Date(),
            }
          });
          success++;
        } catch (error) {
          console.error(`[Zoho Financial Sync] Failed to insert invoice ${invoice.invoice_number}:`, error);
          failed++;
        }
      }

      // Add delay to avoid rate limiting (100ms between customers)
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`[Zoho Financial Sync] Failed to sync invoices for customer ${customer.name}:`, error);
      failed++;
    }
  }

  console.log(`[Zoho Financial Sync] Invoice sync complete: ${success} success, ${failed} failed, ${customersWithZoho.length} total customers`);
  return { success, failed, total: customersWithZoho.length };
}

/**
 * Sync all payments from Zoho Books
 * Fetches payments for all customers with Zoho contact IDs
 */
export async function syncAllPayments(): Promise<{ success: number; failed: number; total: number }> {
  console.log('[Zoho Financial Sync] Starting payment sync...');
  
  const db = await getDb();
  if (!db) {
    console.error('[Zoho Financial Sync] Database not available');
    return { success: 0, failed: 0, total: 0 };
  }

  // Get all customers with Zoho contact IDs
  const allCustomers = await db.select().from(customers);
  const customersWithZoho = allCustomers.filter(c => c.zohoContactId);
  
  console.log(`[Zoho Financial Sync] Found ${customersWithZoho.length} customers with Zoho contact IDs`);

  let success = 0;
  let failed = 0;

  for (const customer of customersWithZoho) {
    try {
      if (!customer.zohoContactId) continue;

      // Fetch payments for this customer
      const payments = await zoho.getCustomerPayments(customer.zohoContactId);
      
      if (!payments || payments.length === 0) {
        continue;
      }

      // Insert or update payments
      for (const payment of payments) {
        try {
          await db.insert(zohoPayments).values({
            paymentId: payment.payment_id,
            paymentNumber: payment.payment_number,
            customerId: customer.zohoContactId,
            customerName: payment.customer_name || customer.name,
            paymentMode: payment.payment_mode,
            paymentDate: payment.date ? new Date(payment.date) : null,
            amount: payment.amount?.toString() || "0",
            currencyCode: payment.currency_code || "USD",
            description: payment.description,
            referenceNumber: payment.reference_number,
            syncedAt: new Date(),
          }).onDuplicateKeyUpdate({
            set: {
              amount: payment.amount?.toString() || "0",
              syncedAt: new Date(),
            }
          });
          success++;
        } catch (error) {
          console.error(`[Zoho Financial Sync] Failed to insert payment ${payment.payment_number}:`, error);
          failed++;
        }
      }

      // Add delay to avoid rate limiting (100ms between customers)
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`[Zoho Financial Sync] Failed to sync payments for customer ${customer.name}:`, error);
      failed++;
    }
  }

  console.log(`[Zoho Financial Sync] Payment sync complete: ${success} success, ${failed} failed, ${customersWithZoho.length} total customers`);
  return { success, failed, total: customersWithZoho.length };
}

/**
 * Sync both invoices and payments
 */
export async function syncAllFinancialData(): Promise<{
  invoices: { success: number; failed: number; total: number };
  payments: { success: number; failed: number; total: number };
}> {
  console.log('[Zoho Financial Sync] Starting full financial data sync...');
  
  const invoiceResult = await syncAllInvoices();
  const paymentResult = await syncAllPayments();
  
  console.log('[Zoho Financial Sync] Full sync complete');
  console.log(`[Zoho Financial Sync] Invoices: ${invoiceResult.success} synced, ${invoiceResult.failed} failed`);
  console.log(`[Zoho Financial Sync] Payments: ${paymentResult.success} synced, ${paymentResult.failed} failed`);
  
  return {
    invoices: invoiceResult,
    payments: paymentResult,
  };
}
