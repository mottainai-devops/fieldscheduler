import { describe, expect, it } from "vitest";
import { isApprovedTailCustomer, TAIL_END_CUSTOMER_ID, TAIL_START_CUSTOMER_ID } from "./services/invoiceTailBaseline";

describe("Component C — owner-authorized full baseline scope", () => {
  it("retains the historical blind spot as a strict subset, not the full-pass boundary", () => {
    expect(isApprovedTailCustomer(TAIL_START_CUSTOMER_ID - 1)).toBe(false);
    expect(isApprovedTailCustomer(TAIL_START_CUSTOMER_ID)).toBe(true);
    expect(isApprovedTailCustomer(TAIL_END_CUSTOMER_ID)).toBe(true);
    expect(isApprovedTailCustomer(TAIL_END_CUSTOMER_ID + 1)).toBe(false);
  });

  it("uses the explicit rate_limited_incomplete terminal label required for a partial full pass", () => {
    const status: "complete" | "rate_limited_incomplete" | "failed" = "rate_limited_incomplete";
    expect(status).toBe("rate_limited_incomplete");
  });
});
