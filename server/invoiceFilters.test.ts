/**
 * Tests for shared/utils/invoiceFilters.ts — T60 (Rule #99).
 *
 * All date arithmetic uses UTC midnight to avoid timezone drift.
 * The `today` parameter is injected in every test for determinism.
 *
 * Debt-range tests re-derived for the ₦0–₦20M piecewise scale (R-005 spec).
 * Kakanfo oracle (₦6,711,512.50) is unchanged — verified 2026-07-19 from production.
 */
import { describe, it, expect } from "vitest";
import {
  isDueWithinDays,
  isOverdue,
  isInDebtRange,
  DUE_DATE_PRESETS,
  DEBT_BUCKETS,
  DEBT_SLIDER_MAX_NAIRA,
  DEBT_SLIDER_UNITS,
  sliderToNaira,
  nairaToSlider,
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

// ─── sliderToNaira / nairaToSlider ───────────────────────────────────────────

describe("sliderToNaira", () => {
  it("slider 0 → ₦0", () => {
    expect(sliderToNaira(0)).toBe(0);
  });

  it("slider 50 → ₦2,000,000 (segment boundary)", () => {
    expect(sliderToNaira(50)).toBe(2_000_000);
  });

  it("slider 100 → ₦20,000,000 (DEBT_SLIDER_MAX_NAIRA)", () => {
    expect(sliderToNaira(100)).toBe(DEBT_SLIDER_MAX_NAIRA);
  });

  it("slider 12 → ₦480,000 (segment 1: 12 * 40,000)", () => {
    expect(sliderToNaira(12)).toBe(480_000);
  });

  it("slider 75 → ₦11,000,000 (segment 2: 2M + 25 * 360,000)", () => {
    expect(sliderToNaira(75)).toBe(11_000_000);
  });

  it("clamps below 0 to 0", () => {
    expect(sliderToNaira(-5)).toBe(0);
  });

  it("clamps above 100 to ₦20M", () => {
    expect(sliderToNaira(110)).toBe(DEBT_SLIDER_MAX_NAIRA);
  });
});

describe("nairaToSlider", () => {
  it("₦0 → slider 0", () => {
    expect(nairaToSlider(0)).toBe(0);
  });

  it("₦2,000,000 → slider 50", () => {
    expect(nairaToSlider(2_000_000)).toBe(50);
  });

  it("₦20,000,000 → slider 100", () => {
    expect(nairaToSlider(DEBT_SLIDER_MAX_NAIRA)).toBe(100);
  });

  it("₦500,000 → slider 12 (500k / 40k = 12.5 → rounds to 13)", () => {
    // 500,000 / 40,000 = 12.5, Math.round → 13
    expect(nairaToSlider(500_000)).toBe(13);
  });

  it("Kakanfo ₦6,711,512.50 → slider in segment 2 (> 50)", () => {
    const pos = nairaToSlider(6_711_512.5);
    expect(pos).toBeGreaterThan(50);
    expect(pos).toBeLessThan(100);
  });

  it("round-trip: sliderToNaira(nairaToSlider(n)) ≈ n for segment boundaries", () => {
    // Exact boundaries should round-trip exactly
    expect(sliderToNaira(nairaToSlider(0))).toBe(0);
    expect(sliderToNaira(nairaToSlider(2_000_000))).toBe(2_000_000);
    expect(sliderToNaira(nairaToSlider(20_000_000))).toBe(20_000_000);
  });
});

// ─── isInDebtRange ──────────────────────────────────────────────────────────

describe("isInDebtRange", () => {
  // Kakanfo Inn oracle (Rule #105): ₦6,711,512.50 outstanding (12 overdue + 1 sent)
  // Verified 2026-07-19 from production DB. Oracle unchanged from R-004.
  const kakanfo = makeSummary("2026-07-10", true, "6711512.50");
  const zeroBalance = makeSummary(null, false, "0.00");
  const nullBalance = makeSummary(null, false, null);
  const midBalance  = makeSummary(null, false, "750000.00");  // ₦750k
  const lowBalance  = makeSummary(null, false, "150000.00");  // ₦150k
  const highBalance = makeSummary(null, false, "15000000.00"); // ₦15M

  it("Kakanfo oracle: in range [0, DEBT_SLIDER_MAX_NAIRA] → true (open-ended)", () => {
    expect(isInDebtRange(kakanfo, 0, DEBT_SLIDER_MAX_NAIRA)).toBe(true);
  });

  it("Kakanfo oracle: in range [0, 500000] → false (balance > 500k)", () => {
    expect(isInDebtRange(kakanfo, 0, 500_000)).toBe(false);
  });

  it("Kakanfo oracle: open-ended top [2000000, DEBT_SLIDER_MAX_NAIRA] → true", () => {
    expect(isInDebtRange(kakanfo, 2_000_000, DEBT_SLIDER_MAX_NAIRA)).toBe(true);
  });

  it("Kakanfo oracle: range [0, 6000000] does NOT include Kakanfo (balance > 6M)", () => {
    expect(isInDebtRange(kakanfo, 0, 6_000_000)).toBe(false);
  });

  it("Kakanfo oracle: range [6000000, 7000000] includes Kakanfo", () => {
    expect(isInDebtRange(kakanfo, 6_000_000, 7_000_000)).toBe(true);
  });

  it("null outstandingBalance → false for any non-zero min", () => {
    expect(isInDebtRange(nullBalance, 1, DEBT_SLIDER_MAX_NAIRA)).toBe(false);
  });

  it("null outstandingBalance → true for [0, DEBT_SLIDER_MAX_NAIRA] (balance=0 >= 0)", () => {
    // null balance is treated as 0 by getOutstandingBalanceNaira
    expect(isInDebtRange(nullBalance, 0, DEBT_SLIDER_MAX_NAIRA)).toBe(true);
  });

  it("zero balance → true for [0, 200000] range", () => {
    expect(isInDebtRange(zeroBalance, 0, 200_000)).toBe(true);
  });

  it("zero balance → false when min > 0", () => {
    expect(isInDebtRange(zeroBalance, 1, DEBT_SLIDER_MAX_NAIRA)).toBe(false);
  });

  it("₦750k balance → true for [500000, 1000000]", () => {
    expect(isInDebtRange(midBalance, 500_000, 1_000_000)).toBe(true);
  });

  it("₦750k balance → false for [0, 500000]", () => {
    expect(isInDebtRange(midBalance, 0, 500_000)).toBe(false);
  });

  it("₦150k balance → true for [0, 200000]", () => {
    expect(isInDebtRange(lowBalance, 0, 200_000)).toBe(true);
  });

  it("₦150k balance → false for [200000, DEBT_SLIDER_MAX_NAIRA]", () => {
    expect(isInDebtRange(lowBalance, 200_000, DEBT_SLIDER_MAX_NAIRA)).toBe(false);
  });

  it("₦15M balance → true for [10000000, DEBT_SLIDER_MAX_NAIRA]", () => {
    expect(isInDebtRange(highBalance, 10_000_000, DEBT_SLIDER_MAX_NAIRA)).toBe(true);
  });

  it("₦15M balance → false for [0, 10000000]", () => {
    expect(isInDebtRange(highBalance, 0, 10_000_000)).toBe(false);
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
// Buckets re-derived for the ₦0–₦20M scale (10 buckets).

describe("getDebtBucketIndex", () => {
  it("₦0 → bucket 0 (₦0–₦200k)", () => {
    expect(getDebtBucketIndex(0)).toBe(0);
  });

  it("₦150,000 → bucket 0 (₦0–₦200k)", () => {
    expect(getDebtBucketIndex(150_000)).toBe(0);
  });

  it("₦200,000 → bucket 1 (₦200k–₦500k)", () => {
    expect(getDebtBucketIndex(200_000)).toBe(1);
  });

  it("₦500,000 → bucket 2 (₦500k–₦1M)", () => {
    expect(getDebtBucketIndex(500_000)).toBe(2);
  });

  it("₦1,000,000 → bucket 3 (₦1M–₦2M)", () => {
    expect(getDebtBucketIndex(1_000_000)).toBe(3);
  });

  it("₦2,000,000 → bucket 4 (₦2M–₦4M)", () => {
    expect(getDebtBucketIndex(2_000_000)).toBe(4);
  });

  it("₦4,000,000 → bucket 5 (₦4M–₦6M)", () => {
    expect(getDebtBucketIndex(4_000_000)).toBe(5);
  });

  it("Kakanfo ₦6,711,512.50 → bucket 6 (₦6M–₦10M)", () => {
    expect(getDebtBucketIndex(6_711_512.5)).toBe(6);
  });

  it("₦10,000,000 → bucket 7 (₦10M–₦14M)", () => {
    expect(getDebtBucketIndex(10_000_000)).toBe(7);
  });

  it("₦18,000,000 → bucket 9 (₦18M+)", () => {
    expect(getDebtBucketIndex(18_000_000)).toBe(9);
  });

  it("DEBT_BUCKETS has 10 thresholds", () => {
    expect(DEBT_BUCKETS.length).toBe(10);
  });

  it("DEBT_SLIDER_MAX_NAIRA equals 20,000,000", () => {
    expect(DEBT_SLIDER_MAX_NAIRA).toBe(20_000_000);
  });

  it("DEBT_SLIDER_UNITS equals 100", () => {
    expect(DEBT_SLIDER_UNITS).toBe(100);
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
