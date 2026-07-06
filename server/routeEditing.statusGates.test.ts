/**
 * T40 — Route editing status gates and constants
 *
 * Tests cover:
 *   1. EDITABLE_ROUTE_STATUSES includes expected statuses
 *   2. LOCKED_ROUTE_STATUSES includes in_progress and completed
 *   3. DELETABLE_ROUTE_STATUSES matches EDITABLE set
 *   4. routeStatusGateMessage returns correct message for locked status
 *   5. routeDeleteGateMessage returns correct message for locked status
 *   6. updateRoute input schema: accepts all editable statuses
 *   7. updateRoute input schema: accepts pending_assignment (T40 addition)
 *   8. updateRoute input schema: accepts routingReasonNote (T40 addition)
 *   9. updateRoute input schema: routingReasonNote max 500 chars
 *  10. addCustomerToRoute input schema: valid input
 *  11. removeCustomerFromRoute input schema: valid input
 *  12. reorderRouteCustomers input schema: valid input with min 1 element
 *  13. reorderRouteCustomers input schema: rejects empty array
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  EDITABLE_ROUTE_STATUSES,
  LOCKED_ROUTE_STATUSES,
  DELETABLE_ROUTE_STATUSES,
  routeStatusGateMessage,
  routeDeleteGateMessage,
} from "../shared/constants/routes";

// ── Inline Zod schemas matching the tRPC procedure inputs ────────────────────
// These mirror the exact schemas in server/routers/fieldWorker.ts so we can
// test them in isolation without spinning up a tRPC server.

const updateRouteSchema = z.object({
  id: z.number(),
  workerId: z.number().optional(),
  vehicleId: z.number().optional(),
  totalDistance: z.string().optional(),
  estimatedDuration: z.string().optional(),
  efficiencyScore: z.number().optional(),
  status: z.enum(["assigned", "pending", "pending_assignment", "in_progress", "completed", "cancelled", "optimized"]).optional(),
  scheduledDate: z.string().optional(),
  customerIds: z.array(z.number()).optional(),
  dispatchedAt: z.string().optional(),
  routingReasonNote: z.string().max(500).optional(),
});

const addCustomerToRouteSchema = z.object({
  routeId: z.number(),
  customerId: z.number(),
});

const removeCustomerFromRouteSchema = z.object({
  routeId: z.number(),
  customerId: z.number(),
});

const reorderRouteCustomersSchema = z.object({
  routeId: z.number(),
  orderedCustomerIds: z.array(z.number()).min(1),
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("T40 — Route status constants", () => {
  it("EDITABLE_ROUTE_STATUSES contains all expected editable statuses", () => {
    const expected = ["pending", "pending_assignment", "optimized", "assigned", "cancelled"];
    for (const s of expected) {
      expect(EDITABLE_ROUTE_STATUSES).toContain(s);
    }
    expect(EDITABLE_ROUTE_STATUSES).toHaveLength(5);
  });

  it("LOCKED_ROUTE_STATUSES contains in_progress and completed only", () => {
    expect(LOCKED_ROUTE_STATUSES).toContain("in_progress");
    expect(LOCKED_ROUTE_STATUSES).toContain("completed");
    expect(LOCKED_ROUTE_STATUSES).toHaveLength(2);
  });

  it("DELETABLE_ROUTE_STATUSES is the same set as EDITABLE_ROUTE_STATUSES", () => {
    expect(DELETABLE_ROUTE_STATUSES).toEqual(EDITABLE_ROUTE_STATUSES);
  });

  it("routeStatusGateMessage includes the blocked status in the message", () => {
    const msg = routeStatusGateMessage("in_progress");
    expect(msg).toContain("in_progress");
    expect(msg).toContain("Cannot modify");
  });

  it("routeStatusGateMessage lists all editable statuses in the message", () => {
    const msg = routeStatusGateMessage("completed");
    for (const s of EDITABLE_ROUTE_STATUSES) {
      expect(msg).toContain(s);
    }
  });

  it("routeDeleteGateMessage includes the blocked status in the message", () => {
    const msg = routeDeleteGateMessage("in_progress");
    expect(msg).toContain("in_progress");
    expect(msg).toContain("Cannot delete");
  });
});

describe("T40 — updateRoute input schema", () => {
  it("accepts minimal valid input (id only)", () => {
    const result = updateRouteSchema.safeParse({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("accepts all editable status values", () => {
    const editableStatuses = ["assigned", "pending", "pending_assignment", "cancelled", "optimized"];
    for (const status of editableStatuses) {
      const result = updateRouteSchema.safeParse({ id: 1, status });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.status).toBe(status);
    }
  });

  it("accepts pending_assignment as a valid status (T40 addition)", () => {
    const result = updateRouteSchema.safeParse({ id: 1, status: "pending_assignment" });
    expect(result.success).toBe(true);
  });

  it("accepts routingReasonNote up to 500 chars (T40 addition)", () => {
    const note = "a".repeat(500);
    const result = updateRouteSchema.safeParse({ id: 1, routingReasonNote: note });
    expect(result.success).toBe(true);
  });

  it("rejects routingReasonNote over 500 chars", () => {
    const note = "a".repeat(501);
    const result = updateRouteSchema.safeParse({ id: 1, routingReasonNote: note });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status value", () => {
    const result = updateRouteSchema.safeParse({ id: 1, status: "unknown_status" });
    expect(result.success).toBe(false);
  });
});

describe("T40 — addCustomerToRoute input schema", () => {
  it("accepts valid input", () => {
    const result = addCustomerToRouteSchema.safeParse({ routeId: 10, customerId: 42 });
    expect(result.success).toBe(true);
  });

  it("rejects missing routeId", () => {
    const result = addCustomerToRouteSchema.safeParse({ customerId: 42 });
    expect(result.success).toBe(false);
  });

  it("rejects missing customerId", () => {
    const result = addCustomerToRouteSchema.safeParse({ routeId: 10 });
    expect(result.success).toBe(false);
  });
});

describe("T40 — removeCustomerFromRoute input schema", () => {
  it("accepts valid input", () => {
    const result = removeCustomerFromRouteSchema.safeParse({ routeId: 10, customerId: 42 });
    expect(result.success).toBe(true);
  });

  it("rejects missing routeId", () => {
    const result = removeCustomerFromRouteSchema.safeParse({ customerId: 42 });
    expect(result.success).toBe(false);
  });
});

describe("T40 — reorderRouteCustomers input schema", () => {
  it("accepts valid input with multiple customers", () => {
    const result = reorderRouteCustomersSchema.safeParse({
      routeId: 10,
      orderedCustomerIds: [3, 1, 2],
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid input with single customer", () => {
    const result = reorderRouteCustomersSchema.safeParse({
      routeId: 10,
      orderedCustomerIds: [5],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty orderedCustomerIds array", () => {
    const result = reorderRouteCustomersSchema.safeParse({
      routeId: 10,
      orderedCustomerIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing orderedCustomerIds", () => {
    const result = reorderRouteCustomersSchema.safeParse({ routeId: 10 });
    expect(result.success).toBe(false);
  });
});
