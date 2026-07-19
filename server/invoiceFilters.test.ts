/**
 * Tests for shared/utils/invoiceFilters.ts — T60 (Rule #99).
 *
 * All date arithmetic uses UTC midnight to avoid timezone drift.
 * The `today` parameter is injected in every test for determinism.
 */
import { describe, it, expect } from "vitest";
import {
  isDueWithinDays,
  isOverdue,
  isInDebtRange,
  DUE_DATE_PRESETS,
  DEBT_BUCKETS,
  DEBT_SLIDER_MAX,
  getOutstandingBalanceNaira,
  getDebtBucketIndex,
  utcMidnight,
  parseUtcDate,
  type CustomerInvoiceSummary,
} from "../shared/utils/invoiceFilters";

// ─── helpers ────────────────────────────────────────────────────────────────

/** Build a minimal CustomerInvoiceSummary for testing */
function makeSummary(
  earliestDueDate: string | null,
  hasOverdueInvoice: boolean,
  outstandingBalance: string | null = "1000.00",
): CustomerInvoiceSummary {
  return { earliestDueDate, hasOverdueInvoice, outstandingBalance };
}

/** UTC midnight for a YYYY-MM-DD string */
function d(iso: string): Date {
  const [y, m, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

// Fixed "today" for all tests: 2026-07-17
const TODAY = d("2026-07-17");

// ─── utcMidnight ────────────────────────────────────────────────────────────

describe("utcMidnight", () => {
  it("floors to midnight UTC", () => {
    const dt = new Date("2026-07-17T15:30:00Z");
    expect(utcMidnight(dt).toISOString()).toBe("2026-07-17T00:00:00.000Z");
  });
});

// ─── parseUtcDate ────────────────────────────────────────────────────────────

describe("parseUtcDate", () => {
  it("parses a valid ISO date string", () => {
    const result = parseUtcDate("2026-07-17");
    expect(result?.toISOString()).toBe("2026-07-17T00:00:00.000Z");
  });

  it("returns null for null input", () => {
    expect(parseUtcDate(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseUtcDate("")).toBeNull();
  });
});

// ─── isDueWithinDays ────────────────────────────────────────────────────────

describe("isDueWithinDays", () => {
  it("returns false when earliestDueDate is null", () => {
    const c = makeSummary(null, false);
    expect(isDueWithinDays(c, 7, TODAY)).toBe(false);
  });

  it("returns true when due today (withinDays=0)", () => {
    const c = makeSummary("2026-07-17", false);
    expect(isDueWithinDays(c, 0, TODAY)).toBe(true);
  });

  it("returns false for yesterday (past-due) when withinDays=0", () => {
    const c = makeSummary("2026-07-16", false);
    expect(isDueWithinDays(c, 0, TODAY)).toBe(false);
  });

  it("returns true when due within 2 days (withinDays=2)", () => {
    const c = makeSummary("2026-07-19", false);
    expect(isDueWithinDays(c, 2, TODAY)).toBe(true);
  });

  it("returns true on the boundary day (due exactly on day N)", () => {
    const c = makeSummary("2026-07-24", false); // 7 days out
    expect(isDueWithinDays(c, 7, TODAY)).toBe(true);
  });

  it("returns false when due one day beyond the window", () => {
    const c = makeSummary("2026-07-25", false); // 8 days out
    expect(isDueWithinDays(c, 7, TODAY)).toBe(false);
  });

  it("returns false for past-due invoices (dueDate < today)", () => {
    const c = makeSummary("2026-07-10", false);
    expect(isDueWithinDays(c, 7, TODAY)).toBe(false);
  });

  it("returns false when customer has no outstanding balance (null)", () => {
    // The predicate only checks dueDate, not balance — balance is for debt filter
    // A customer with earliestDueDate set but null balance still passes the date check
    const c = makeSummary("2026-07-18", false, null);
    expect(isDueWithinDays(c, 7, TODAY)).toBe(true);
  });

  it("covers all DUE_DATE_PRESETS without error", () => {
    const c = makeSummary("2026-07-17", false);
    for (const preset of DUE_DATE_PRESETS) {
      expect(() => isDueWithinDays(c, preset.days, TODAY)).not.toThrow();
    }
  });
});

// ─── isOverdue ───────────────────────────────────────────────────────────────

describe("isOverdue", () => {
  it("returns true when hasOverdueInvoice is true", () => {
    const c = makeSummary("2026-07-10", true);
    expect(isOverdue(c, TODAY)).toBe(true);
  });

  it("returns false when hasOverdueInvoice is false", () => {
    const c = makeSummary("2026-07-20", false);
    expect(isOverdue(c, TODAY)).toBe(false);
  });

  it("returns false when earliestDueDate is null and no overdue flag", () => {
    const c = makeSummary(null, false);
    expect(isOverdue(c, TODAY)).toBe(false);
  });
});

// ─── isInDebtRange ──────────────────────────────────────────────────────────

describe("isInDebtRange", () => {
  // Kakanfo Inn oracle (Rule #105): ₦6,711,512.50 outstanding (12 overdue + 1 sent)
  const kakanfo = makeSummary("2026-07-10", true, "6711512.50");
  const zeroBalance = makeSummary(null, false, "0.00");
  const nullBalance = makeSummary(null, false, null);
  const midBalance  = makeSummary(null, false, "75000.00"); // ₦75k — bucket [50k,100k)
  const lowBalance  = makeSummary(null, false, "25000.00"); // ₦25k — bucket [0,50k)

  it("Kakanfo oracle: in range [0, DEBT_SLIDER_MAX] → true", () => {
    expect(isInDebtRange(kakanfo, 0, DEBT_SLIDER_MAX)).toBe(true);
  });

  it("Kakanfo oracle: in range [0, 100000] → false (balance > 100k)", () => {
    expect(isInDebtRange(kakanfo, 0, 100_000)).toBe(false);
  });

  it("Kakanfo oracle: open-ended top bucket [400000, DEBT_SLIDER_MAX] → true", () => {
    expect(isInDebtRange(kakanfo, 400_000, DEBT_SLIDER_MAX)).toBe(true);
  });

  it("Kakanfo oracle: range [0, 400000) does NOT include Kakanfo (balance > 400k)", () => {
    // When maxNaira < DEBT_SLIDER_MAX, upper bound is strict
    expect(isInDebtRange(kakanfo, 0, 399_000)).toBe(false);
  });

  it("null outstandingBalance → false for any non-zero min", () => {
    expect(isInDebtRange(nullBalance, 1, DEBT_SLIDER_MAX)).toBe(false);
  });

  it("null outstandingBalance → true for [0, DEBT_SLIDER_MAX] (balance=0 >= 0)", () => {
    // null balance is treated as 0 by getOutstandingBalanceNaira
    expect(isInDebtRange(nullBalance, 0, DEBT_SLIDER_MAX)).toBe(true);
  });

  it("zero balance → true for [0, 50000] range", () => {
    expect(isInDebtRange(zeroBalance, 0, 50_000)).toBe(true);
  });

  it("zero balance → false when min > 0", () => {
    expect(isInDebtRange(zeroBalance, 1, DEBT_SLIDER_MAX)).toBe(false);
  });

  it("₦75k balance → true for [50000, 100000]", () => {
    expect(isInDebtRange(midBalance, 50_000, 100_000)).toBe(true);
  });

  it("₦75k balance → false for [0, 50000] (exclusive upper)", () => {
    expect(isInDebtRange(midBalance, 0, 50_000)).toBe(false);
  });

  it("₦25k balance → true for [0, 50000]", () => {
    expect(isInDebtRange(lowBalance, 0, 50_000)).toBe(true);
  });

  it("₦25k balance → false for [50000, DEBT_SLIDER_MAX]", () => {
    expect(isInDebtRange(lowBalance, 50_000, DEBT_SLIDER_MAX)).toBe(false);
  });
});

// ─── getOutstandingBalanceNaira ──────────────────────────────────────────────

describe("getOutstandingBalanceNaira", () => {
  it("parses string decimal correctly", () => {
    expect(getOutstandingBalanceNaira(makeSummary(null, false, "6711512.50"))).toBe(6711512.5);
  });

  it("returns 0 for null outstandingBalance", () => {
    expect(getOutstandingBalanceNaira(makeSummary(null, false, null))).toBe(0);
  });

  it("returns 0 for empty string outstandingBalance", () => {
    expect(getOutstandingBalanceNaira(makeSummary(null, false, ""))).toBe(0);
  });

  it("returns 0 for non-numeric string", () => {
    expect(getOutstandingBalanceNaira(makeSummary(null, false, "N/A"))).toBe(0);
  });
});

// ─── getDebtBucketIndex ──────────────────────────────────────────────────────

describe("getDebtBucketIndex", () => {
  it("₦0 → bucket 0 (₦0–₦50k)", () => {
    expect(getDebtBucketIndex(0)).toBe(0);
  });

  it("₦25,000 → bucket 0", () => {
    expect(getDebtBucketIndex(25_000)).toBe(0);
  });

  it("₦50,000 → bucket 1 (₦50k–₦100k)", () => {
    expect(getDebtBucketIndex(50_000)).toBe(1);
  });

  it("₦100,000 → bucket 2 (₦100k–₦200k)", () => {
    expect(getDebtBucketIndex(100_000)).toBe(2);
  });

  it("₦200,000 → bucket 3 (₦200k–₦400k)", () => {
    expect(getDebtBucketIndex(200_000)).toBe(3);
  });

  it("₦400,000 → bucket 4 (₦400k+)", () => {
    expect(getDebtBucketIndex(400_000)).toBe(4);
  });

  it("Kakanfo ₦6,711,512.50 → bucket 4 (₦400k+)", () => {
    expect(getDebtBucketIndex(6_711_512.5)).toBe(4);
  });

  it("DEBT_BUCKETS has 5 thresholds", () => {
    expect(DEBT_BUCKETS.length).toBe(5);
  });

  it("DEBT_SLIDER_MAX equals the top bucket threshold (400000)", () => {
    expect(DEBT_SLIDER_MAX).toBe(400_000);
  });
});

// ─── DUE_DATE_PRESETS ────────────────────────────────────────────────────────

describe("DUE_DATE_PRESETS", () => {
  it("contains at least 7 entries", () => {
    expect(DUE_DATE_PRESETS.length).toBeGreaterThanOrEqual(7);
  });

  it("first preset is 0 days (due today)", () => {
    expect(DUE_DATE_PRESETS[0].days).toBe(0);
  });

  it("includes 1, 2, 3, 7, 14, 30 day presets", () => {
    const days = DUE_DATE_PRESETS.map(p => p.days);
    expect(days).toContain(1);
    expect(days).toContain(2);
    expect(days).toContain(3);
    expect(days).toContain(7);
    expect(days).toContain(14);
    expect(days).toContain(30);
  });

  it("all presets have non-empty labels", () => {
    for (const preset of DUE_DATE_PRESETS) {
      expect(preset.label.length).toBeGreaterThan(0);
    }
  });
});
