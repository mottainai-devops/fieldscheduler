import { describe, expect, it, vi } from "vitest";
import { buildSurveyAssignedLots } from "./surveyAssignedLots";

describe("buildSurveyAssignedLots", () => {
  it("preserves Franchisee-scoped upstream webhook metadata without a public all-lots lookup", async () => {
    const fetchImpl = vi.fn();
    const result = await buildSurveyAssignedLots(
      {
        companyId: null,
        assignedLots: [
          { lotCode: "DIC-410", lotName: "Lot 410", companyName: "Scoped Franchisee", paytWebhook: "payt", monthlyWebhook: "monthly" },
        ],
      },
      { fetchImpl },
    );

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result).toEqual([
      expect.objectContaining({
        lotCode: "DIC-410",
        paytWebhook: "payt",
        monthlyWebhook: "monthly",
        lotNumber: 410,
      }),
    ]);
  });

  it("retains the existing company-bound enrichment behavior for ordinary users", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => [{ result: { data: { json: { lots: [{ lotCode: "REG-001", paytWebhook: "payt", monthlyWebhook: "monthly", id: 7, lotNumber: 1 }] } } } }],
    }));
    const result = await buildSurveyAssignedLots(
      { companyId: "COMPANY-A", assignedLots: [{ lotCode: "REG-001", lotName: "Regular lot" }] },
      { adminApi: "https://admin.example", fieldSchedulerServiceToken: "test-service-token", fetchImpl },
    );

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl.mock.calls[0]?.[0]).toContain("lots.lookupForFieldScheduler");
    expect(fetchImpl.mock.calls[0]?.[1]?.headers).toMatchObject({
      "x-field-scheduler-service-token": "test-service-token",
    });
    expect(result).toEqual([
      expect.objectContaining({ lotCode: "REG-001", paytWebhook: "payt", monthlyWebhook: "monthly", lotId: 7 }),
    ]);
  });

  it("uses no private location or customer data in a cache entry", async () => {
    const result = await buildSurveyAssignedLots({
      assignedLots: [{ lotCode: "MOT-027", lotName: "Lot 027" }],
    });
    expect(result[0]).toEqual({
      lotCode: "MOT-027",
      lotName: "Lot 027",
      companyName: null,
      paytWebhook: null,
      monthlyWebhook: null,
      lotId: null,
      lotNumber: 27,
    });
  });
});
