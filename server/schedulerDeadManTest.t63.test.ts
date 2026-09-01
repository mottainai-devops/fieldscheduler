import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("T63 approved dead-man TEST runner", () => {
  it("is environment-gated and uses the dedicated dead-man email helper", () => {
    const source = readFileSync(resolve(process.cwd(), "server/scripts/schedulerDeadManTest.ts"), "utf8");

    expect(source).toContain('process.env.ALLOW_DEAD_MAN_TEST_ALERT !== "true"');
    expect(source).toContain("sendSchedulerDeadManAlert");
    expect(source).toContain("TEST — Field Scheduler dead-man alert");
  });
});
