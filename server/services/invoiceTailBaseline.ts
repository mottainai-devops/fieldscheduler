import { and, gte, lte } from "drizzle-orm";
import { customers } from "../../drizzle/schema";
import { OUTSTANDING_STATUSES } from "../../shared/constants/invoice-status";
import * as zoho from "./zoho";
import { markInvoiceSyncAttempt, markInvoiceSyncTerminal } from "./invoiceSyncState";
import { buildInvoiceUpsertContext, isZohoRateLimitError, upsertZohoInvoice } from "./zohoFinancialSync";

export const TAIL_START_CUSTOMER_ID = 12284;
export const TAIL_END_CUSTOMER_ID = 16757;

export type FullBaselineStatus = "complete" | "rate_limited_incomplete" | "failed";

export interface FullBaselineResult {
  status: FullBaselineStatus;
  selectedFullCustomers: number;
  selectedTailCustomers: number;
  fullInvoiceCount: number;
  tailCustomersWithZohoInvoices: number;
  tailDebtors: number;
  tailInvoiceCount: number;
  previouslyInvisibleOutstanding: string;
  invoiceSyncedCount: number;
  invoiceFailedCount: number;
  invoiceListRequestCount: number;
  rateLimitCount: number;
  firstResponseQuota: Record<string, string | null> | null;
  startedAt: Date;
  completedAt: Date;
  error: string | null;
}

type DbClient = any;

export function isApprovedTailCustomer(customerId: number): boolean {
  return customerId >= TAIL_START_CUSTOMER_ID && customerId <= TAIL_END_CUSTOMER_ID;
}

function decimalToMinorUnits(value: unknown): number {
  const match = String(value ?? "0").trim().match(/^(-?)(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return 0;
  const fraction = (match[3] ?? "").padEnd(2, "0").slice(0, 2);
  const amount = Number(match[2]) * 100 + Number(fraction || "0");
  if (!Number.isSafeInteger(amount)) throw new Error("Invoice balance exceeds safe-cent precision");
  return match[1] === "-" ? -amount : amount;
}

function formatMinorUnits(value: number): string {
  const negative = value < 0;
  const amount = negative ? -value : value;
  const naira = Math.floor(amount / 100);
  const kobo = String(amount % 100).padStart(2, "0");
  return `${negative ? "-" : ""}${naira}.${kobo}`;
}

/**
 * Walks every currently Zoho-linked customer exactly once and calculates the
 * historical tail metrics as a subset. It is intentionally not reachable from
 * tRPC and is guarded by a server-side CLI flag.
 */
export async function runFullInvoiceBaseline(db: DbClient): Promise<FullBaselineResult> {
  const startedAt = new Date();
  const result: FullBaselineResult = {
    status: "complete",
    selectedFullCustomers: 0,
    selectedTailCustomers: 0,
    fullInvoiceCount: 0,
    tailCustomersWithZohoInvoices: 0,
    tailDebtors: 0,
    tailInvoiceCount: 0,
    previouslyInvisibleOutstanding: "0.00",
    invoiceSyncedCount: 0,
    invoiceFailedCount: 0,
    invoiceListRequestCount: 0,
    rateLimitCount: 0,
    firstResponseQuota: null,
    startedAt,
    completedAt: startedAt,
    error: null,
  };

  await markInvoiceSyncAttempt(db);

  try {
    const upsertContext = await buildInvoiceUpsertContext(db);
    const fullCandidates = await db
      .select({ id: customers.id, zohoContactId: customers.zohoContactId })
      .from(customers)
      .where(and(gte(customers.id, 1), lte(customers.id, Number.MAX_SAFE_INTEGER)));
    const selected = fullCandidates.filter((customer: { zohoContactId: string | null }) => Boolean(customer.zohoContactId));
    result.selectedFullCustomers = selected.length;
    result.selectedTailCustomers = selected.filter((customer: { id: number }) => isApprovedTailCustomer(customer.id)).length;

    let tailOutstanding = 0;
    for (const customer of selected) {
      const isTail = isApprovedTailCustomer(customer.id);
      try {
        const remote = await zoho.getCustomerInvoicesWithTelemetry(customer.zohoContactId!);
        result.invoiceListRequestCount += remote.requestCount;
        result.rateLimitCount += remote.rateLimitCount;
        if (!result.firstResponseQuota && remote.firstResponseQuota) result.firstResponseQuota = remote.firstResponseQuota;
        if (isTail && remote.invoices.length > 0) result.tailCustomersWithZohoInvoices++;

        let tailCustomerOutstanding = 0;
        for (const invoice of remote.invoices) {
          result.fullInvoiceCount++;
          if (isTail) {
            result.tailInvoiceCount++;
            if (OUTSTANDING_STATUSES.includes(invoice.status)) {
              tailCustomerOutstanding += decimalToMinorUnits(invoice.balance);
            }
          }
          try {
            await upsertZohoInvoice(db, invoice, upsertContext);
            result.invoiceSyncedCount++;
          } catch (invoiceError) {
            console.error("[Component C full baseline] Invoice upsert failed", invoiceError);
            result.invoiceFailedCount++;
          }
        }
        if (isTail && tailCustomerOutstanding > 0) result.tailDebtors++;
        tailOutstanding += tailCustomerOutstanding;
      } catch (error) {
        const telemetry = zoho.getInvoiceReadTelemetry(error);
        result.invoiceListRequestCount += telemetry.requestCount;
        result.rateLimitCount += telemetry.rateLimitCount;
        if (!result.firstResponseQuota && telemetry.firstResponseQuota) result.firstResponseQuota = telemetry.firstResponseQuota;
        if (isZohoRateLimitError(error)) {
          result.status = "rate_limited_incomplete";
          result.error = "Zoho rate limit reached while walking approved full baseline";
          break;
        }
        console.error("[Component C full baseline] Customer invoice list failed", error);
        result.invoiceFailedCount++;
        result.status = "failed";
        result.error = "One or more full-baseline customer invoice reads failed";
        break;
      }
    }

    result.previouslyInvisibleOutstanding = formatMinorUnits(tailOutstanding);
    result.completedAt = new Date();
    await markInvoiceSyncTerminal(db, {
      status: result.status,
      checkpoint: result.status === "complete" ? result.completedAt : undefined,
      error: result.error,
    });
    return result;
  } catch (error) {
    result.status = "failed";
    result.error = error instanceof Error ? error.message : "Full invoice baseline failed";
    result.completedAt = new Date();
    await markInvoiceSyncTerminal(db, { status: "failed", error: result.error });
    return result;
  }
}

// Compatibility alias: the guarded CLI name remains stable, but its scope is
// explicitly the owner-authorized full coverage pass.
export const runTailInvoiceBaseline = runFullInvoiceBaseline;
