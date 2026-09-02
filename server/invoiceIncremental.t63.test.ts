import { describe, expect, it } from "vitest";
import {
  buildIncrementalWindow,
  classifyInvoiceSyncResult,
  formatZohoLastModifiedTime,
  INVOICE_SYNC_OVERLAP_MS,
} from "./services/invoiceIncremental";

describe("Component C — incremental invoice policy", () => {
  it("formats the Zoho documented compact numeric offset timestamp in UTC", () => {
    expect(formatZohoLastModifiedTime(new Date("2026-09-02T09:10:11.123Z"))).toBe("2026-09-02T09:10:11-0000");
  });

  it("deliberately overlaps a completed checkpoint to make retries idempotent", () => {
    const checkpoint = new Date("2026-09-02T09:00:00.000Z");
    const now = new Date("2026-09-03T09:00:00.000Z");
    const window = buildIncrementalWindow(checkpoint, now);
    expect(window.since.getTime()).toBe(checkpoint.getTime() - INVOICE_SYNC_OVERLAP_MS);
    expect(window.checkpoint).toEqual(now);
  });

  it("keeps rate-limit and failed terminal results distinct from complete", () => {
    expect(classifyInvoiceSyncResult({ rateLimited: false, failed: 0 })).toBe("complete");
    expect(classifyInvoiceSyncResult({ rateLimited: true, failed: 0 })).toBe("rate_limited");
    expect(classifyInvoiceSyncResult({ rateLimited: false, failed: 1 })).toBe("failed");
  });
});
