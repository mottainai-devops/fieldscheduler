import { TRPCError } from "@trpc/server";

type SupervisorWorkerMapping = {
  status: "active" | "inactive" | "on_leave" | string;
};

/**
 * A Survey identity may auto-provision a missing supervisor worker row, but it
 * must never silently reuse an existing row which has been deactivated or put
 * on leave. Keeping this as a small pure guard makes the policy testable
 * without handling Survey credentials in tests.
 */
export function requireActiveSupervisorMapping(
  worker: SupervisorWorkerMapping | null,
): void {
  if (worker && worker.status !== "active") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Supervisor access is inactive. Please contact your administrator to complete onboarding.",
    });
  }
}
