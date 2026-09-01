import { describe, expect, it } from "vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertSmtpConfiguration, getSmtpConfigurationPresence } from "./_core/runtimeConfig";

const smtpKeys = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_SECURE"] as const;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("T63 approved dead-man TEST runner", () => {
  it("is environment-gated, loads shared runtime config, and uses the dedicated dead-man email helper", () => {
    const source = readFileSync(resolve(process.cwd(), "server/scripts/schedulerDeadManTest.ts"), "utf8");

    expect(source).toContain('process.env.ALLOW_DEAD_MAN_TEST_ALERT !== "true"');
    expect(source).toContain('import { assertSmtpConfiguration } from "../_core/runtimeConfig"');
    expect(source).toContain("assertSmtpConfiguration()");
    expect(source).toContain("sendSchedulerDeadManAlert");
    expect(source).toContain("TEST — Field Scheduler dead-man alert");
  });

  it("fails closed with a non-secret error when SMTP configuration is absent", () => {
    for (const key of smtpKeys) vi.stubEnv(key, "");

    expect(() => assertSmtpConfiguration()).toThrow(
      "Dead-man TEST alert SMTP configuration is unavailable; server-side SMTP configuration is incomplete.",
    );
  });

  it("accepts a complete SMTP configuration without reading or logging its values", () => {
    for (const key of smtpKeys) vi.stubEnv(key, "present-for-test");

    expect(() => assertSmtpConfiguration()).not.toThrow();
    expect(getSmtpConfigurationPresence()).toEqual({
      SMTP_HOST: true,
      SMTP_PORT: true,
      SMTP_USER: true,
      SMTP_PASS: true,
      SMTP_SECURE: true,
    });
  });

  it("loads shared runtime config before application startup imports can use SMTP", () => {
    const source = readFileSync(resolve(process.cwd(), "server/_core/index.ts"), "utf8");

    expect(source.startsWith('import "./runtimeConfig";')).toBe(true);
  });
});
