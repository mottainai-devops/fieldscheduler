import { and, gte, lte } from "drizzle-orm";
import { customers } from "../../drizzle/schema";
import { OUTSTANDING_STATUSES } from "../../shared/constants/invoice-status";
import * as zoho from "./zoho";
import { markInvoiceSyncAttempt, markInvoiceSyncTerminal } from "./invoiceSyncState";
import { buildInvoiceUpsertContext, isZohoRateLimitError, upsertZohoInvoice } from "./zohoFinancialSync";

export const TAIL_START_CUSTOMER_ID = 12284;
export const TAIL_END_CUSTOMER_ID = 16757;

export type TailBaselineStatus = "complete" | "rate_limited" | "failed";

export interface TailBaselineResult {
  status: TailBaselineStatus;
  selectedTailCustomers: number;
  tailCustomersWithZohoInvoices: number;
  tailDebtors: number;
  tailInvoiceCount: number;
  previouslyInvisibleOutstanding: string;
  invoiceSyncedCount: number;
  invoiceFailedCount: number;
  startedAt: Date;
  completedAt: Date;
  error: string | null;
}

type DbClient = any;

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
 * Walks the known zero-local-invoice tail only. It is intentionally not
 * reachable from tRPC and is guarded by a server-side CLI flag.
 */
export async function runTailInvoiceBaseline(db: DbClient): Promise<TailBaselineResult> {
  const startedAt = new Date();
  const result: TailBaselineResult = {
    status: "complete",
    selectedTailCustomers: 0,
    tailCustomersWithZohoInvoices: 0,
    tailDebtors: 0,
    tailInvoiceCount: 0,
    previouslyInvisibleOutstanding: "0.00",
    invoiceSyncedCount: 0,
    invoiceFailedCount: 0,
    startedAt,
    completedAt: startedAt,
    error: null,
  };

  await markInvoiceSyncAttempt(db);

  try {
    const upsertContext = await buildInvoiceUpsertContext(db);
    const tailCandidates = await db
      .select({ id: customers.id, zohoContactId: customers.zohoContactId, name: customers.name })
      .from(customers)
      .where(and(gte(customers.id, TAIL_START_CUSTOMER_ID), lte(customers.id, TAIL_END_CUSTOMER_ID)));
    // Keep the approved historical tail scope stable on a retry. A rate-limited
    // attempt can already have imported a prefix; excluding newly linked rows on
    // the next attempt would understate the baseline’s original visibility gap.
    const selected = tailCandidates.filter((customer: { zohoContactId: string | null }) => Boolean(customer.zohoContactId));
    result.selectedTailCustomers = selected.length;

    let outstanding = 0;
    for (const customer of selected) {
      try {
        const remoteInvoices = await zoho.getCustomerInvoices(customer.zohoContactId!);
        if (remoteInvoices.length > 0) result.tailCustomersWithZohoInvoices++;

        let customerOutstanding = 0;
        for (const invoice of remoteInvoices) {
          result.tailInvoiceCount++;
          if (OUTSTANDING_STATUSES.includes(invoice.status)) {
            customerOutstanding += decimalToMinorUnits(invoice.balance);
          }
          try {
            await upsertZohoInvoice(db, invoice, upsertContext);
            result.invoiceSyncedCount++;
          } catch (invoiceError) {
            console.error("[Component C tail baseline] Invoice upsert failed", invoiceError);
            result.invoiceFailedCount++;
          }
        }
        if (customerOutstanding > 0) result.tailDebtors++;
        outstanding += customerOutstanding;
      } catch (error) {
        if (isZohoRateLimitError(error)) {
          result.status = "rate_limited";
          result.error = "Zoho rate limit reached while walking approved tail";
          break;
        }
        console.error("[Component C tail baseline] Customer invoice list failed", error);
        result.invoiceFailedCount++;
        result.status = "failed";
        result.error = "One or more approved-tail customer invoice reads failed";
        break;
      }
    }

    result.previouslyInvisibleOutstanding = formatMinorUnits(outstanding);
    result.completedAt = new Date();
    await markInvoiceSyncTerminal(db, {
      status: result.status,
      checkpoint: result.status === "complete" ? result.completedAt : undefined,
      error: result.error,
    });
    return result;
  } catch (error) {
    result.status = "failed";
    result.error = error instanceof Error ? error.message : "Tail baseline failed";
    result.completedAt = new Date();
    await markInvoiceSyncTerminal(db, { status: "failed", error: result.error });
    return result;
  }
}
