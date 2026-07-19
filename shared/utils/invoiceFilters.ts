/**
 * Shared invoice filter predicates — T60 (Rule #99).
 *
 * These predicates operate on the per-customer invoice summary shape
 * returned by `fieldWorkerDb.getAllCustomersWithInvoiceSummary()`.
 * Both CreateRoute.tsx (Step 1) and Customers.tsx import from this
 * file. The T52 export router (exportRouter.ts) must also use these
 * predicates when due-date / overdue / debt-range filters are added
 * to the export.
 *
 * Pattern #58: single source of truth for filter logic.
 * Rule #99:    no forked predicates per surface.
 * Rule #100:   all filter controls must meet WCAG AA contrast.
 * Rule #105:   per-customer outstanding via OUTSTANDING_STATUS_LIST only.
 *
 * IMPORTANT: All date arithmetic uses UTC midnight to avoid TZ drift.
 * `dueDate` values from the DB are ISO date strings ("YYYY-MM-DD").
 */

/**
 * Minimal invoice summary shape required by these predicates.
 * The full customer row returned by the DB function extends this.
 */
export interface CustomerInvoiceSummary {
  /** Earliest dueDate among outstanding invoices, or null if none */
  earliestDueDate: string | null;
  /** Sum of balance across all outstanding invoices (string decimal) */
  outstandingBalance: string | null;
  /** True if any outstanding invoice has dueDate < today */
  hasOverdueInvoice: boolean;
}

// ─── Due-date filter ────────────────────────────────────────────────────────

/**
 * N-day preset options for the due-date filter.
 * Chosen to suit the data: 80% of invoices have 2-day terms.
 * Presets cover the 1–7 day range densely, then 14 and 30 for wider windows.
 */
export const DUE_DATE_PRESETS = [
  { label: "Due today",      days: 0  },
  { label: "Due in 1 day",   days: 1  },
  { label: "Due in 2 days",  days: 2  },
  { label: "Due in 3 days",  days: 3  },
  { label: "Due in 7 days",  days: 7  },
  { label: "Due in 14 days", days: 14 },
  { label: "Due in 30 days", days: 30 },
] as const;

export type DueDatePreset = typeof DUE_DATE_PRESETS[number];

/**
 * Returns true if the customer has at least one outstanding invoice
 * whose dueDate falls within the next `withinDays` calendar days
 * (inclusive of today, inclusive of the Nth day).
 *
 * @param customer  Customer row with invoice summary fields.
 * @param withinDays  0 = due today only; 7 = due today through 7 days out.
 * @param today  Optional override for "today" (UTC midnight). Defaults to
 *               `new Date()` floored to UTC midnight. Pass in tests for
 *               determinism.
 */
export function isDueWithinDays(
  customer: CustomerInvoiceSummary,
  withinDays: number,
  today?: Date,
): boolean {
  if (!customer.earliestDueDate) return false;

  const todayMidnight = today ?? utcMidnight(new Date());
  const cutoff = new Date(todayMidnight);
  cutoff.setUTCDate(cutoff.getUTCDate() + withinDays);

  const due = parseUtcDate(customer.earliestDueDate);
  if (!due) return false;

  // due >= today AND due <= cutoff
  return due >= todayMidnight && due <= cutoff;
}

// ─── Overdue filter ─────────────────────────────────────────────────────────

/**
 * Returns true if the customer has at least one outstanding invoice
 * whose dueDate is strictly before today (i.e. past-due, balance > 0).
 *
 * This is the "overdue toggle" — separate from the due-date range filter.
 */
export function isOverdue(
  customer: CustomerInvoiceSummary,
  today?: Date,
): boolean {
  return customer.hasOverdueInvoice;
}

// ─── Debt-range filter ───────────────────────────────────────────────────────

/**
 * Piecewise slider scale — ₦0 to ₦20,000,000+
 *
 * The slider uses a piecewise (non-linear) mapping so that ranges like
 * ₦0–₦500k and ₦10M–₦20M are both comfortably selectable.
 *
 * Scale segments:
 *   Slider 0–50   → ₦0 – ₦2,000,000      (step ₦40,000 per unit)
 *   Slider 50–100 → ₦2,000,000 – ₦20,000,000  (step ₦360,000 per unit)
 *
 * The slider component operates on integer units 0–100.
 * Displayed values are always exact Naira (converted via sliderToNaira).
 *
 * DEBT_SLIDER_MAX_NAIRA is the open-ended threshold: when the upper handle
 * is at slider position 100 (₦20,000,000), all balances >= lower bound pass.
 */
export const DEBT_SLIDER_UNITS = 100; // total slider range
export const DEBT_SLIDER_MAX_NAIRA = 20_000_000; // ₦20M — open-ended top

/**
 * Convert a slider unit position (0–100) to Naira.
 *
 * Segment 1: units 0–50  → ₦0 – ₦2,000,000  (linear, ₦40,000/unit)
 * Segment 2: units 50–100 → ₦2,000,000 – ₦20,000,000 (linear, ₦360,000/unit)
 */
export function sliderToNaira(units: number): number {
  const u = Math.max(0, Math.min(DEBT_SLIDER_UNITS, units));
  if (u <= 50) {
    return Math.round(u * 40_000); // ₦0 at 0, ₦2,000,000 at 50
  }
  return Math.round(2_000_000 + (u - 50) * 360_000); // ₦2M at 50, ₦20M at 100
}

/**
 * Convert a Naira value to the nearest slider unit position (0–100).
 * Inverse of sliderToNaira.
 */
export function nairaToSlider(naira: number): number {
  const n = Math.max(0, Math.min(DEBT_SLIDER_MAX_NAIRA, naira));
  if (n <= 2_000_000) {
    return Math.round(n / 40_000);
  }
  return Math.round(50 + (n - 2_000_000) / 360_000);
}

/**
 * Histogram buckets for the debt-range distribution display.
 *
 * 10 buckets spanning ₦0 – ₦20M+:
 *   [0, 200k)        → ₦0 – ₦200k
 *   [200k, 500k)     → ₦200k – ₦500k
 *   [500k, 1M)       → ₦500k – ₦1M
 *   [1M, 2M)         → ₦1M – ₦2M
 *   [2M, 4M)         → ₦2M – ₦4M
 *   [4M, 6M)         → ₦4M – ₦6M
 *   [6M, 10M)        → ₦6M – ₦10M
 *   [10M, 14M)       → ₦10M – ₦14M
 *   [14M, 18M)       → ₦14M – ₦18M
 *   [18M, ∞)         → ₦18M+
 */
export const DEBT_BUCKETS = [
  0,
  200_000,
  500_000,
  1_000_000,
  2_000_000,
  4_000_000,
  6_000_000,
  10_000_000,
  14_000_000,
  18_000_000,
] as const;

/** Labels for each bucket displayed in the histogram tooltip. */
export const DEBT_BUCKET_LABELS = [
  "₦0 – ₦200k",
  "₦200k – ₦500k",
  "₦500k – ₦1M",
  "₦1M – ₦2M",
  "₦2M – ₦4M",
  "₦4M – ₦6M",
  "₦6M – ₦10M",
  "₦10M – ₦14M",
  "₦14M – ₦18M",
  "₦18M+",
] as const;

/**
 * Debt range type: [minNaira, maxNaira].
 * maxNaira === DEBT_SLIDER_MAX_NAIRA means "no upper bound" (open-ended top).
 */
export type DebtRange = [number, number];

/**
 * Returns the outstanding balance for a customer as a number (₦).
 * Returns 0 if outstandingBalance is null, empty, or non-numeric.
 *
 * Rule #105: outstandingBalance is computed from OUTSTANDING_STATUS_LIST
 * (overdue, sent, draft, partially_paid) only — void and paid are excluded
 * at the DB layer.
 */
export function getOutstandingBalanceNaira(customer: CustomerInvoiceSummary): number {
  if (!customer.outstandingBalance) return 0;
  const n = parseFloat(customer.outstandingBalance);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Returns true if the customer's outstanding balance falls within the
 * given debt range [minNaira, maxNaira] (both ends inclusive).
 *
 * When maxNaira >= DEBT_SLIDER_MAX_NAIRA the upper bound is treated as
 * open-ended: any balance >= minNaira passes (captures ₦20M+ customers).
 *
 * Rule #99:  shared predicate — no forked logic per surface.
 * Rule #105: outstanding balance uses OUTSTANDING_STATUS_LIST only.
 *
 * @param customer   Customer row with invoice summary fields.
 * @param minNaira   Lower bound in Naira (inclusive).
 * @param maxNaira   Upper bound in Naira (inclusive). Pass DEBT_SLIDER_MAX_NAIRA
 *                   for the open-ended top bucket.
 */
export function isInDebtRange(
  customer: CustomerInvoiceSummary,
  minNaira: number,
  maxNaira: number,
): boolean {
  const balance = getOutstandingBalanceNaira(customer);
  if (maxNaira >= DEBT_SLIDER_MAX_NAIRA) {
    // Open-ended: any balance >= min passes
    return balance >= minNaira;
  }
  return balance >= minNaira && balance <= maxNaira;
}

/**
 * Returns the bucket index (0-based) for a given balance value.
 * Used to build the histogram distribution array.
 *
 * Bucket index corresponds to DEBT_BUCKET_LABELS[index].
 */
export function getDebtBucketIndex(balanceNaira: number): number {
  for (let i = DEBT_BUCKETS.length - 1; i >= 0; i--) {
    if (balanceNaira >= DEBT_BUCKETS[i]) return i;
  }
  return 0;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Floor a Date to UTC midnight (00:00:00.000Z).
 */
export function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Parse an ISO date string ("YYYY-MM-DD") to a UTC midnight Date.
 * Returns null for null/empty input.
 */
export function parseUtcDate(isoDate: string | null | undefined): Date | null {
  if (!isoDate) return null;
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}
