import { getDb } from "../db";
import { invoices, zohoPayments, customers, workers } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import * as zoho from "./zoho";

/**
 * T48 Fix 1: Sync all invoices from Zoho Books into the `invoices` table.
 * T49 Fix 2: Resolve FM name→ID during sync (never store raw string names).
 *
 * Attribution strategy:
 *   - fieldManagerId: read from invoice.customer_cf_field_manager (Zoho custom field, string name
 *     e.g. "Halleluyah"), then resolved to numeric worker ID via workerIdByName map.
 *     Unmatched names (phantoms, territorial labels, typos) → NULL with a log warning.
 *   - maf: read from invoice.customer_cf_customermaf (Zoho custom field, MAF code e.g. "MOT-076")
 *   - customerId: resolved via customers.zohoContactId = invoice.customer_id (internal FK)
 *
 * Upsert key: zohoInvoiceId (UNIQUE on invoices table).
 * On duplicate: update status, balance, fieldManagerId, maf, customerName, updatedAt.
 *
 * Rule #93: Sync write format and query filter format must be verified together.
 * Silent format divergence produces zero query results without errors.
 */
/**
 * T48 rate-limit sentinel: Zoho returns HTTP 429 with code 45 when the daily
 * limit (11,000 calls) is exceeded. We detect this and stop cleanly so the
 * next scheduled run can resume from the beginning (idempotent upserts mean
 * already-synced invoices are just updated, not duplicated).
 */
function isZohoRateLimitError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  // Axios-style: err.response.status === 429
  if (e['response'] && typeof e['response'] === 'object') {
    const resp = e['response'] as Record<string, unknown>;
    if (resp['status'] === 429) return true;
    // Zoho also embeds { code: 45 } in the response data
    if (resp['data'] && typeof resp['data'] === 'object') {
      const data = resp['data'] as Record<string, unknown>;
      if (data['code'] === 45) return true;
    }
  }
  return false;
}

export async function syncAllInvoices(): Promise<{ success: number; failed: number; total: number; rateLimited: boolean }> {
  console.log('[Zoho Financial Sync] Starting invoice sync (T48/T49)...');

  const db = await getDb();
  if (!db) {
    console.error('[Zoho Financial Sync] Database not available');
    return { success: 0, failed: 0, total: 0, rateLimited: false };
  }

  // T49 Fix 2: Build name→ID lookup map from workers table (field_manager role only).
  // Only canonical workers with real IDs are included. Phantom rows, territorial labels,
  // and any name not present in this map will resolve to NULL (not stored as strings).
  const allWorkers = await db.select({ id: workers.id, name: workers.name })
    .from(workers)
    .where(eq(workers.role, 'field_manager'));
  const workerIdByName = new Map<string, string>(
    allWorkers.map(w => [w.name, String(w.id)])
  );
  console.log(`[Zoho Financial Sync] Loaded ${allWorkers.length} field managers for name→ID resolution`);

  // Get all customers with Zoho contact IDs
  const allCustomers = await db.select().from(customers);
  const customersWithZoho = allCustomers.filter(c => c.zohoContactId);

  console.log(`[Zoho Financial Sync] Found ${customersWithZoho.length} customers with Zoho contact IDs`);

  // Build a lookup map: zohoContactId → internal customer id
  const customerMap = new Map<string, number>();
  for (const c of customersWithZoho) {
    if (c.zohoContactId) customerMap.set(c.zohoContactId, c.id);
  }

  let success = 0;
  let failed = 0;
  let rateLimited = false;

  for (const customer of customersWithZoho) {
    // Stop immediately if we already hit the rate limit on a previous customer
    if (rateLimited) break;

    try {
      if (!customer.zohoContactId) continue;

      // T48 Fix 2: getCustomerInvoices now paginates with per_page=200
      const zohoInvoiceList = await zoho.getCustomerInvoices(customer.zohoContactId);

      if (!zohoInvoiceList || zohoInvoiceList.length === 0) {
        continue;
      }

      for (const inv of zohoInvoiceList) {
        try {
          // T48 Fix 1: Extract FM and MAF from Zoho custom fields on the invoice
          // T49 Fix 2: Resolve FM name→ID; never store raw string names
          const rawFieldManagerName: string | null =
            inv.customer_cf_field_manager_unformatted ||
            inv.customer_cf_field_manager ||
            null;
          const resolvedFieldManagerId: string | null = rawFieldManagerName
            ? (workerIdByName.get(rawFieldManagerName) ?? null)
            : null;
          // Log unmapped names for observability (owner can tag Zoho correctly; do NOT auto-create workers)
          if (rawFieldManagerName && !workerIdByName.has(rawFieldManagerName)) {
            console.warn(`[syncAllInvoices] Unmapped FM name: "${rawFieldManagerName}" — storing NULL`);
          }

          const mafCode: string | null =
            inv.customer_cf_customermaf_unformatted ||
            inv.customer_cf_customermaf ||
            null;

          // Resolve internal customer ID from the lookup map
          const internalCustomerId = customerMap.get(inv.customer_id) ?? null;

          await db.insert(invoices).values({
            zohoInvoiceId: inv.invoice_id,
            customerId: internalCustomerId,
            fieldManagerId: resolvedFieldManagerId,
            maf: mafCode,
            invoiceNumber: inv.invoice_number,
            invoiceDate: inv.date ? new Date(inv.date) : new Date(),
            dueDate: inv.due_date ? new Date(inv.due_date) : null,
            customerName: inv.customer_name || customer.name || null,
            total: inv.total?.toString() || "0",
            balance: inv.balance?.toString() || "0",
            status: inv.status || "unpaid",
          }).onDuplicateKeyUpdate({
            set: {
              status: inv.status || "unpaid",
              balance: inv.balance?.toString() || "0",
              fieldManagerId: resolvedFieldManagerId,
              maf: mafCode,
              customerName: inv.customer_name || customer.name || null,
              updatedAt: sql`NOW()`,
            },
          });
          success++;
        } catch (invoiceError) {
          console.error(`[Zoho Financial Sync] Failed to upsert invoice ${inv.invoice_number}:`, invoiceError);
          failed++;
        }
      }

      // 100ms delay between customers to stay within Zoho rate limits
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (customerError) {
      if (isZohoRateLimitError(customerError)) {
        console.warn(`[Zoho Financial Sync] Rate limit hit after ${success} invoices. Stopping cleanly — next run will resume from the beginning (upsert is idempotent).`);
        rateLimited = true;
        break;
      }
      console.error(`[Zoho Financial Sync] Failed to sync invoices for customer ${customer.name}:`, customerError);
      failed++;
    }
  }

  const statusMsg = rateLimited ? 'stopped (rate limited)' : 'complete';
  console.log(`[Zoho Financial Sync] Invoice sync ${statusMsg}: ${success} upserted, ${failed} failed, ${customersWithZoho.length} customers total`);
  return { success, failed, total: customersWithZoho.length, rateLimited };
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
