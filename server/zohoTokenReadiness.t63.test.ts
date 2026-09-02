import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Component C — Zoho token readiness", () => {
  it("shares one database-token initialization promise and awaits it before any token refresh", () => {
    const source = readFileSync("server/services/zoho.ts", "utf8");
    expect(source).toContain("let tokenLoadPromise: Promise<void> | null = null");
    expect(source).toContain("export function ensureZohoTokensLoaded(): Promise<void>");
    expect(source).toContain("await ensureZohoTokensLoaded();");
    expect(source).toContain("void ensureZohoTokensLoaded();");
  });

  it("uses the shared compact-offset formatter for the documented invoice modified-time filter", () => {
    const source = readFileSync("server/services/zoho.ts", "utf8");
    expect(source).toContain("import { formatZohoLastModifiedTime } from './invoiceIncremental'");
    expect(source).toContain("const last_modified_time = formatZohoLastModifiedTime(lastModifiedAfter)");
  });
});
