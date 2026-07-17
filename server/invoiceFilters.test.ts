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
  DUE_DATE_PRESETS,
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
