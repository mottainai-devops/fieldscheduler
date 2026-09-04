import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { requireActiveSupervisorMapping } from "./supervisorLoginGuard";

describe("requireActiveSupervisorMapping", () => {
  it("allows a Survey-mapped active supervisor through the normal login path", () => {
    expect(() => requireActiveSupervisorMapping({ status: "active" })).not.toThrow();
  });

  it("allows a missing mapping to reach the established auto-provision path", () => {
    expect(() => requireActiveSupervisorMapping(null)).not.toThrow();
  });

  it("fails closed for an inactive mapped supervisor with a clear onboarding message", () => {
    try {
      requireActiveSupervisorMapping({ status: "inactive" });
      throw new Error("Expected inactive mapping to be rejected");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("FORBIDDEN");
      expect((error as TRPCError).message).toBe(
        "Supervisor access is inactive. Please contact your administrator to complete onboarding.",
      );
    }
  });

  it("fails closed for a mapped supervisor on leave without silently reusing the row", () => {
    expect(() => requireActiveSupervisorMapping({ status: "on_leave" })).toThrow(
      "Supervisor access is inactive. Please contact your administrator to complete onboarding.",
    );
  });
});
