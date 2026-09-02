import { getDb } from "../db";
import { invoices, zohoPayments, customers, workers } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import * as zoho from "./zoho";
import { buildIncrementalWindow, classifyInvoiceSyncResult, InvoiceSyncStatus } from "./invoiceIncremental";
import { getInvoiceSyncState, markInvoiceSyncAttempt, markInvoiceSyncTerminal } from "./invoiceSyncState";

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
export function isZohoRateLimitError(err: unknown): boolean {
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

export interface InvoiceSyncResult {
  success: number;
  failed: number;
  total: number;
  rateLimited: boolean;
  invoiceStatus: InvoiceSyncStatus;
}

interface InvoiceUpsertContext {
  customerIdByZohoContactId: Map<string, number>;
  customerNameById: Map<number, string | null>;
  workerIdByName: Map<string, string>;
}

export async function buildInvoiceUpsertContext(db: any): Promise<InvoiceUpsertContext> {
  const allWorkers = await db.select({ id: workers.id, name: workers.name })
    .from(workers)
    .where(eq(workers.role, 'field_manager'));
  const allCustomers = await db.select({ id: customers.id, zohoContactId: customers.zohoContactId, name: customers.name }).from(customers);

  return {
    workerIdByName: new Map(allWorkers.map((worker: { id: number; name: string }) => [worker.name, String(worker.id)])),
    customerIdByZohoContactId: new Map(
      allCustomers
        .filter((customer: { zohoContactId: string | null }) => Boolean(customer.zohoContactId))
        .map((customer: { id: number; zohoContactId: string }) => [customer.zohoContactId, customer.id]),
    ),
    customerNameById: new Map(allCustomers.map((customer: { id: number; name: string | null }) => [customer.id, customer.name])),
  };
}

/** Shared idempotent Zoho invoice write for scheduled incremental sync and the approved tail baseline. */
export async function upsertZohoInvoice(
  db: any,
  inv: any,
  context: InvoiceUpsertContext,
): Promise<void> {
  const rawFieldManagerName: string | null =
    inv.customer_cf_field_manager_unformatted || inv.customer_cf_field_manager || null;
  const resolvedFieldManagerId: string | null = rawFieldManagerName
    ? (context.workerIdByName.get(rawFieldManagerName) ?? null)
    : null;
  if (rawFieldManagerName && !context.workerIdByName.has(rawFieldManagerName)) {
    console.warn('[Component C] Invoice field manager was unmapped; storing null attribution');
  }
  const mafCode: string | null = inv.customer_cf_customermaf_unformatted || inv.customer_cf_customermaf || null;
  const internalCustomerId = context.customerIdByZohoContactId.get(inv.customer_id) ?? null;
  const fallbackName = internalCustomerId == null ? null : context.customerNameById.get(internalCustomerId) ?? null;

  await db.insert(invoices).values({
    zohoInvoiceId: inv.invoice_id,
    customerId: internalCustomerId,
    fieldManagerId: resolvedFieldManagerId,
    maf: mafCode,
    invoiceNumber: inv.invoice_number,
    invoiceDate: inv.date ? new Date(inv.date) : new Date(),
    dueDate: inv.due_date ? new Date(inv.due_date) : null,
    customerName: inv.customer_name || fallbackName,
    total: inv.total?.toString() || "0",
    balance: inv.balance?.toString() || "0",
    status: inv.status || "unpaid",
  }).onDuplicateKeyUpdate({
    set: {
      status: inv.status || "unpaid",
      balance: inv.balance?.toString() || "0",
      fieldManagerId: resolvedFieldManagerId,
      maf: mafCode,
      customerName: inv.customer_name || fallbackName,
      updatedAt: sql`NOW()`,
    },
  });
}

export async function syncAllInvoices(): Promise<InvoiceSyncResult> {
  console.log('[Component C] Starting incremental invoice sync...');

  const db = await getDb();
  if (!db) {
    console.error('[Zoho Financial Sync] Database not available');
    return { success: 0, failed: 0, total: 0, rateLimited: false, invoiceStatus: "failed" };
  }

  const state = await getInvoiceSyncState(db);
  if (!state?.lastSuccessfulModifiedAt) {
    console.warn('[Component C] Invoice checkpoint is not initialized; scheduled invoice reads are held pending the approved controlled baseline.');
    return { success: 0, failed: 0, total: 0, rateLimited: false, invoiceStatus: "not_initialized" };
  }

  const context = await buildInvoiceUpsertContext(db);
  const window = buildIncrementalWindow(state.lastSuccessfulModifiedAt);
  await markInvoiceSyncAttempt(db);

  let success = 0;
  let failed = 0;
  let rateLimited = false;
  let modifiedInvoices: any[] = [];
  try {
    modifiedInvoices = await zoho.getInvoicesModifiedSince(window.since);
    for (const invoice of modifiedInvoices) {
      try {
        await upsertZohoInvoice(db, invoice, context);
        success++;
      } catch (invoiceError) {
        console.error('[Component C] Incremental invoice upsert failed', invoiceError);
        failed++;
      }
    }
  } catch (error) {
    rateLimited = isZohoRateLimitError(error);
    if (!rateLimited) failed++;
  }

  const invoiceStatus = classifyInvoiceSyncResult({ rateLimited, failed });
  await markInvoiceSyncTerminal(db, {
    status: invoiceStatus === "not_initialized" ? "failed" : invoiceStatus,
    checkpoint: invoiceStatus === "complete" ? window.checkpoint : undefined,
    error: invoiceStatus === "complete" ? null : rateLimited ? "Zoho rate limit reached during incremental invoice sync" : "Incremental invoice sync failed",
  });
  console.log(`[Component C] Incremental invoice sync ${invoiceStatus}: ${success} upserted, ${failed} failed, ${modifiedInvoices.length} modified invoices`);
  return { success, failed, total: modifiedInvoices.length, rateLimited, invoiceStatus };
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
