/**
 * Component C: deterministic incremental-window policy for Zoho Books invoices.
 *
 * Zoho's list endpoint accepts `last_modified_time` and returns invoice changes
 * after that value. A small overlap makes retry/restart boundaries safe because
 * invoice writes are idempotent on `zohoInvoiceId`.
 */
export const INVOICE_SYNC_OVERLAP_MS = 5 * 60 * 1000;

export type InvoiceSyncStatus = "complete" | "rate_limited" | "failed" | "not_initialized";

export interface IncrementalWindow {
  since: Date;
  checkpoint: Date;
}

export function formatZohoLastModifiedTime(value: Date): string {
  if (Number.isNaN(value.getTime())) throw new Error("Invalid invoice checkpoint timestamp");
  // Zoho’s invoice API examples use the compact numeric offset form
  // (`2013-11-18T02:02:51-0800`). Keep the UTC basis explicit and do not emit
  // the colon offset form, which the live preflight rejected with HTTP 400.
  return value.toISOString().replace(/\.\d{3}Z$/, "-0000");
}

export function buildIncrementalWindow(lastSuccessfulModifiedAt: Date, now = new Date()): IncrementalWindow {
  if (Number.isNaN(lastSuccessfulModifiedAt.getTime())) {
    throw new Error("Invalid last successful invoice checkpoint");
  }
  if (Number.isNaN(now.getTime())) throw new Error("Invalid incremental-sync clock");

  return {
    since: new Date(Math.max(0, lastSuccessfulModifiedAt.getTime() - INVOICE_SYNC_OVERLAP_MS)),
    checkpoint: now,
  };
}

export function classifyInvoiceSyncResult(input: {
  rateLimited: boolean;
  failed: number;
}): InvoiceSyncStatus {
  if (input.rateLimited) return "rate_limited";
  if (input.failed > 0) return "failed";
  return "complete";
}
