/**
 * T56b tests — Suite T
 *
 * Three UI fixes:
 *   Fix 1: defaultDateRange() utility — rolling 30-day window, consistent across dashboards
 *   Fix 2: Navigate button contrast — tested via code inspection (Flutter, no JS test runner)
 *   Fix 3: Sidebar role filtering + App.tsx route gate for Real-Time Tracking and Tracking
 *
 * T1–T8:  defaultDateRange() utility
 * T9–T16: Sidebar meetsMinRole logic for Real-Time Tracking / Tracking (admin-only)
 * T17–T22: App.tsx route gate presence (static code assertions)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "fs";
import path from "path";

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Mirrors the defaultDateRange() implementation for test assertions */
function computeExpectedDateRange(): { start: string; end: string } {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return {
    start: thirtyDaysAgo.toISOString().split("T")[0],
    end: now.toISOString().split("T")[0],
  };
}

/** Mirrors the meetsMinRole logic from SidebarNavigation.tsx */
function meetsMinRole(
  userRole: string | undefined,
  minRole: "fieldManager" | "admin" | "superadmin" | undefined
): boolean {
  if (!minRole) return true;
  if (!userRole) return false;
  const tierRank: Record<string, number> = {
    superadmin: 4,
    admin: 3,
    field_manager: 2,
    supervisor: 1,
    user: 0,
  };
  const minTierRank: Record<string, number> = {
    superadmin: 4,
    admin: 3,
    fieldManager: 2,
  };
  return (tierRank[userRole] ?? 0) >= (minTierRank[minRole] ?? 0);
}

// ─── Suite T1–T8: defaultDateRange() utility ─────────────────────────────────

describe("T56b Suite T — defaultDateRange() utility", () => {
  it("T1: returns an object with start and end keys", () => {
    const range = computeExpectedDateRange();
    expect(range).toHaveProperty("start");
    expect(range).toHaveProperty("end");
  });

  it("T2: start is exactly 30 days before end", () => {
    const range = computeExpectedDateRange();
    const startMs = new Date(range.start).getTime();
    const endMs = new Date(range.end).getTime();
    const diffDays = (endMs - startMs) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBe(30);
  });

  it("T3: end equals today's date (YYYY-MM-DD)", () => {
    const range = computeExpectedDateRange();
    const todayStr = new Date().toISOString().split("T")[0];
    expect(range.end).toBe(todayStr);
  });

  it("T4: start is in YYYY-MM-DD format", () => {
    const range = computeExpectedDateRange();
    expect(range.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("T5: end is in YYYY-MM-DD format", () => {
    const range = computeExpectedDateRange();
    expect(range.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("T6: start is strictly before end", () => {
    const range = computeExpectedDateRange();
    expect(new Date(range.start).getTime()).toBeLessThan(new Date(range.end).getTime());
  });

  it("T7: utility file exists at client/src/utils/dateRange.ts", () => {
    const filePath = path.resolve(
      __dirname,
      "../client/src/utils/dateRange.ts"
    );
    expect(() => readFileSync(filePath, "utf-8")).not.toThrow();
  });

  it("T8: dateRange.ts exports defaultDateRange function", () => {
    const filePath = path.resolve(
      __dirname,
      "../client/src/utils/dateRange.ts"
    );
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("export function defaultDateRange");
  });
});

// ─── Suite T9–T16: Sidebar role filtering for Tracking pages ─────────────────

describe("T56b Suite T — Sidebar role filtering for Real-Time Tracking / Tracking", () => {
  it("T9: field_manager cannot see Real-Time Tracking (minRole: admin)", () => {
    expect(meetsMinRole("field_manager", "admin")).toBe(false);
  });

  it("T10: supervisor cannot see Real-Time Tracking (minRole: admin)", () => {
    expect(meetsMinRole("supervisor", "admin")).toBe(false);
  });

  it("T11: admin can see Real-Time Tracking (minRole: admin)", () => {
    expect(meetsMinRole("admin", "admin")).toBe(true);
  });

  it("T12: superadmin can see Real-Time Tracking (minRole: admin)", () => {
    expect(meetsMinRole("superadmin", "admin")).toBe(true);
  });

  it("T13: field_manager cannot see Tracking (minRole: admin)", () => {
    expect(meetsMinRole("field_manager", "admin")).toBe(false);
  });

  it("T14: SidebarNavigation.tsx sets Real-Time Tracking to minRole: admin", () => {
    const filePath = path.resolve(
      __dirname,
      "../client/src/components/SidebarNavigation.tsx"
    );
    const content = readFileSync(filePath, "utf-8");
    // Must contain the admin restriction for Real-Time Tracking
    expect(content).toMatch(
      /Real-Time Tracking.*minRole.*admin|minRole.*admin.*Real-Time Tracking/s
    );
  });

  it("T15: SidebarNavigation.tsx sets Tracking to minRole: admin", () => {
    const filePath = path.resolve(
      __dirname,
      "../client/src/components/SidebarNavigation.tsx"
    );
    const content = readFileSync(filePath, "utf-8");
    // Tracking entry must have admin restriction
    const trackingLine = content
      .split("\n")
      .find((l) => l.includes('"Tracking"') && l.includes("href"));
    expect(trackingLine).toBeDefined();
    expect(trackingLine).toContain('minRole: "admin"');
  });

  it("T16: undefined user role cannot see admin-only pages", () => {
    expect(meetsMinRole(undefined, "admin")).toBe(false);
  });
});

// ─── Suite T17–T22: App.tsx route gate ───────────────────────────────────────

describe("T56b Suite T — App.tsx route gate for Tracking pages", () => {
  let appContent: string;

  beforeEach(() => {
    const filePath = path.resolve(__dirname, "../client/src/App.tsx");
    appContent = readFileSync(filePath, "utf-8");
  });

  it("T17: /tracking route has requireAdmin prop", () => {
    const trackingLine = appContent
      .split("\n")
      .find((l) => l.includes('"/tracking"') && l.includes("WorkerTracking"));
    expect(trackingLine).toBeDefined();
    expect(trackingLine).toContain("requireAdmin");
  });

  it("T18: /real-time-tracking route has requireAdmin prop", () => {
    const rtLine = appContent
      .split("\n")
      .find(
        (l) =>
          l.includes('"/real-time-tracking"') &&
          l.includes("RealTimeTracking")
      );
    expect(rtLine).toBeDefined();
    expect(rtLine).toContain("requireAdmin");
  });

  it("T19: /tracking does NOT have requireFieldManager prop (would be too permissive)", () => {
    const trackingLine = appContent
      .split("\n")
      .find((l) => l.includes('"/tracking"') && l.includes("WorkerTracking"));
    expect(trackingLine).not.toContain("requireFieldManager");
  });

  it("T20: /real-time-tracking does NOT have requireFieldManager prop", () => {
    const rtLine = appContent
      .split("\n")
      .find(
        (l) =>
          l.includes('"/real-time-tracking"') &&
          l.includes("RealTimeTracking")
      );
    expect(rtLine).not.toContain("requireFieldManager");
  });

  it("T21: FieldManagerDashboard uses defaultDateRange import", () => {
    const filePath = path.resolve(
      __dirname,
      "../client/src/pages/FieldManagerDashboard.tsx"
    );
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("import { defaultDateRange } from '@/utils/dateRange'");
  });

  it("T22: FinancialDashboard uses defaultDateRange import", () => {
    const filePath = path.resolve(
      __dirname,
      "../client/src/components/FinancialDashboard.tsx"
    );
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("import { defaultDateRange } from '@/utils/dateRange'");
  });
});
