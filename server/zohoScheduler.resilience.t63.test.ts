import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  calculateNextRunTime,
  getSchedulerHealth,
  getStartupRetryDelayMs,
} from "./services/zohoScheduler";

describe("T63 scheduler resilience", () => {
  it("preserves a configured daily 09:00 cadence instead of drifting to 00:00", () => {
    const next = calculateNextRunTime(
      "daily",
      "09:00",
      undefined,
      new Date("2026-08-25T10:00:00.000Z"),
    );

    expect(next.toISOString()).toBe("2026-08-26T09:00:00.000Z");
  });

  it("uses bounded exponential startup retry delays", () => {
    expect(getStartupRetryDelayMs(0)).toBe(15_000);
    expect(getStartupRetryDelayMs(1)).toBe(30_000);
    expect(getStartupRetryDelayMs(2)).toBe(60_000);
    expect(getStartupRetryDelayMs(20)).toBe(300_000);
  });

  it("exposes a safe readiness state before the scheduler is armed", () => {
    const health = getSchedulerHealth();
    expect(["initializing", "armed", "unarmed_database_unavailable"]).toContain(health.readiness);
    expect(["idle", "running", "completed", "failed"]).toContain(health.execution);
    expect(health).not.toHaveProperty("token");
    expect(health).not.toHaveProperty("customer");
  });

  it("removes the hard-coded daily midnight reschedule and wires a dead-man email", () => {
    const source = readFileSync(path.resolve(import.meta.dirname, "services/zohoScheduler.ts"), "utf8");
    const systemRouter = readFileSync(path.resolve(import.meta.dirname, "_core/systemRouter.ts"), "utf8");

    expect(source).not.toContain('calculateNextRunTime("daily", "00:00", undefined)');
    expect(source).toContain("sendSchedulerDeadManAlert");
    expect(source).toContain("scheduleStartupRetry");
    expect(source).toContain("unarmed_database_unavailable");
    expect(systemRouter).toContain("scheduler: getSchedulerHealth()");
  });
});
