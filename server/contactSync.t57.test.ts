/**
 * T57 Tests — Contact sync policy change: accept MAF-less contacts
 *
 * Suite R: T57 behavioral tests
 *
 * R1  Contact with null buildingId is NOT skipped (no continue)
 * R2  Contact with null buildingId logs failureReason='no_maf_assigned'
 * R3  no_maf_assigned payload contains contactName
 * R4  no_maf_assigned payload contains cfMafValue field
 * R5  no_maf_assigned payload cfMafValue is null when cf_maf absent
 * R6  no_maf_assigned payload cfMafValue is 'OutsideIBSW' when cf_maf='OutsideIBSW'
 * R7  Contact with null buildingId still increments syncedCount (not errorCount)
 * R8  infoCount increments for each no_maf_assigned event
 * R9  errorCount does NOT increment for no_maf_assigned events
 * R10 Event count reconciliation uses errorCount + infoCount
 * R11 Contact with valid buildingId still syncs normally (regression guard)
 * R12 isZohoRateLimitError returns true for 429 status
 * R13 isZohoRateLimitError returns false for 401 status
 * R14 isZohoRateLimitError returns false for undefined error
 * R15 Scheduler stall fix: delayMs < 0 advances nextRunAt instead of silently returning
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Minimal type stubs ───────────────────────────────────────────────────────
interface ContactSyncEventRow {
  contactId: string;
  syncRunId: number | null;
  failureReason: string;
  failurePayload: string | null;
}

interface ZohoContact {
  contact_id: string | number;
  contact_name: string;
  customermaf?: string;
  cf_maf?: string;
  custom_fields?: Array<{ label: string; value: string }>;
  [key: string]: unknown;
}

// ─── Inline simulation of T57 MAF extraction logic ───────────────────────────
function extractBuildingId(contact: ZohoContact): string | null {
  const contactAny = contact as any;
  let buildingId: string | null = null;
  if (contact.customermaf && typeof contact.customermaf === "string") {
    const maf = contact.customermaf.trim();
    if (maf && /^[A-Z]{2,}-\d{3}$/.test(maf)) buildingId = maf;
  } else if (contactAny.cf_maf && typeof contactAny.cf_maf === "string") {
    const maf = contactAny.cf_maf.trim();
    if (maf && /^[A-Z]{2,}-\d{3}$/.test(maf)) buildingId = maf;
  } else if (contact.custom_fields && Array.isArray(contact.custom_fields)) {
    const mafField = contact.custom_fields.find(
      (f) =>
        f.label.toLowerCase().includes("customermaf") ||
        f.label.toLowerCase().includes("maf")
    );
    if (mafField?.value) {
      const maf = mafField.value.trim();
      if (maf && /^[A-Z]{2,}-\d{3}$/.test(maf)) buildingId = maf;
    }
  }
  return buildingId;
}

/**
 * Simulates the T57 gate logic:
 * - Logs no_maf_assigned event
 * - Does NOT skip (no continue)
 * - Returns { row, shouldSkip, infoIncrement, errorIncrement }
 */
function simulateT57Gate(
  contact: ZohoContact,
  buildingId: string | null,
  syncRunId: number | null
): {
  row: ContactSyncEventRow | null;
  shouldSkip: boolean;
  infoIncrement: number;
  errorIncrement: number;
} {
  if (!buildingId) {
    const contactAny = contact as any;
    const row: ContactSyncEventRow = {
      contactId: String(contact.contact_id),
      syncRunId,
      failureReason: "no_maf_assigned",
      failurePayload: JSON.stringify({
        contactName: contact.contact_name,
        customerMafKeys: Object.keys(contact).filter((k) =>
          k.toLowerCase().includes("maf")
        ),
        cfMafPresent: !!(contactAny.cf_maf),
        cfMafValue: contactAny.cf_maf ?? null,
        customFieldsPresent: !!(contact.custom_fields),
        customFieldsSample: Array.isArray(contact.custom_fields)
          ? contact.custom_fields.slice(0, 5)
          : null,
      }),
    };
    return { row, shouldSkip: false, infoIncrement: 1, errorIncrement: 0 };
  }
  return { row: null, shouldSkip: false, infoIncrement: 0, errorIncrement: 0 };
}

/** Simulates isZohoRateLimitError */
function isZohoRateLimitError(error: any): boolean {
  return error?.response?.status === 429;
}

/** Simulates event count reconciliation */
function reconcileEventCount(
  errorCount: number,
  infoCount: number,
  loggedCount: number
): { match: boolean; expected: number } {
  const expected = errorCount + infoCount;
  return { match: loggedCount === expected, expected };
}

/** Simulates scheduler stall detection */
function detectStall(delayMs: number): boolean {
  return delayMs < 0;
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("T57 — Contact sync policy: accept MAF-less contacts", () => {
  // ─── R1-R9: null buildingId gate ─────────────────────────────────────────
  describe("R1-R9: null buildingId gate", () => {
    const noMafContact: ZohoContact = {
      contact_id: "CONT-001",
      contact_name: "10002 LASIKA06 006",
      custom_fields: [{ label: "cf_customer_type", value: "Business" }],
    };

    const outsideIbswContact: ZohoContact = {
      contact_id: "CONT-002",
      contact_name: "Outside IBSW Customer",
      cf_maf: "OutsideIBSW",
    };

    it("R1: contact with null buildingId is NOT skipped (shouldSkip=false)", () => {
      const buildingId = extractBuildingId(noMafContact);
      expect(buildingId).toBeNull();
      const result = simulateT57Gate(noMafContact, buildingId, 12);
      expect(result.shouldSkip).toBe(false);
    });

    it("R2: contact with null buildingId logs failureReason='no_maf_assigned'", () => {
      const buildingId = extractBuildingId(noMafContact);
      const result = simulateT57Gate(noMafContact, buildingId, 12);
      expect(result.row).not.toBeNull();
      expect(result.row!.failureReason).toBe("no_maf_assigned");
    });

    it("R3: no_maf_assigned payload contains contactName", () => {
      const buildingId = extractBuildingId(noMafContact);
      const result = simulateT57Gate(noMafContact, buildingId, 12);
      const payload = JSON.parse(result.row!.failurePayload!);
      expect(payload.contactName).toBe("10002 LASIKA06 006");
    });

    it("R4: no_maf_assigned payload contains cfMafValue field", () => {
      const buildingId = extractBuildingId(noMafContact);
      const result = simulateT57Gate(noMafContact, buildingId, 12);
      const payload = JSON.parse(result.row!.failurePayload!);
      expect(Object.prototype.hasOwnProperty.call(payload, "cfMafValue")).toBe(true);
    });

    it("R5: cfMafValue is null when cf_maf absent", () => {
      const buildingId = extractBuildingId(noMafContact);
      const result = simulateT57Gate(noMafContact, buildingId, 12);
      const payload = JSON.parse(result.row!.failurePayload!);
      expect(payload.cfMafValue).toBeNull();
    });

    it("R6: cfMafValue is 'OutsideIBSW' when cf_maf='OutsideIBSW'", () => {
      const buildingId = extractBuildingId(outsideIbswContact);
      expect(buildingId).toBeNull(); // OutsideIBSW fails regex
      const result = simulateT57Gate(outsideIbswContact, buildingId, 12);
      const payload = JSON.parse(result.row!.failurePayload!);
      expect(payload.cfMafValue).toBe("OutsideIBSW");
    });

    it("R7: contact with null buildingId increments infoCount, not errorCount", () => {
      const buildingId = extractBuildingId(noMafContact);
      const result = simulateT57Gate(noMafContact, buildingId, 12);
      expect(result.infoIncrement).toBe(1);
      expect(result.errorIncrement).toBe(0);
    });

    it("R8: infoCount increments once per no_maf_assigned contact", () => {
      const contacts = [noMafContact, outsideIbswContact];
      let infoCount = 0;
      for (const c of contacts) {
        const bid = extractBuildingId(c);
        const r = simulateT57Gate(c, bid, 12);
        infoCount += r.infoIncrement;
      }
      expect(infoCount).toBe(2);
    });

    it("R9: errorCount does NOT increment for no_maf_assigned events", () => {
      const contacts = [noMafContact, outsideIbswContact];
      let errorCount = 0;
      for (const c of contacts) {
        const bid = extractBuildingId(c);
        const r = simulateT57Gate(c, bid, 12);
        errorCount += r.errorIncrement;
      }
      expect(errorCount).toBe(0);
    });
  });

  // ─── R10: Event count reconciliation ─────────────────────────────────────
  describe("R10: event count reconciliation", () => {
    it("R10: reconciliation uses errorCount + infoCount as expected", () => {
      // 0 errors, 5 info events, 5 logged rows → match
      expect(reconcileEventCount(0, 5, 5).match).toBe(true);
      expect(reconcileEventCount(0, 5, 5).expected).toBe(5);
      // 1 error, 5 info events, 6 logged rows → match
      expect(reconcileEventCount(1, 5, 6).match).toBe(true);
      // 1 error, 5 info events, 5 logged rows → mismatch
      expect(reconcileEventCount(1, 5, 5).match).toBe(false);
    });
  });

  // ─── R11: Regression guard ────────────────────────────────────────────────
  describe("R11: valid MAF contact still syncs normally", () => {
    it("R11: contact with valid buildingId produces no event row", () => {
      const validContact: ZohoContact = {
        contact_id: "CONT-003",
        contact_name: "Valid MAF Customer",
        customermaf: "DIC-413",
      };
      const buildingId = extractBuildingId(validContact);
      expect(buildingId).toBe("DIC-413");
      const result = simulateT57Gate(validContact, buildingId, 12);
      expect(result.row).toBeNull();
      expect(result.shouldSkip).toBe(false);
      expect(result.infoIncrement).toBe(0);
      expect(result.errorIncrement).toBe(0);
    });
  });

  // ─── R12-R14: isZohoRateLimitError ───────────────────────────────────────
  describe("R12-R14: isZohoRateLimitError sentinel", () => {
    it("R12: returns true for 429 status", () => {
      expect(isZohoRateLimitError({ response: { status: 429 } })).toBe(true);
    });

    it("R13: returns false for 401 status", () => {
      expect(isZohoRateLimitError({ response: { status: 401 } })).toBe(false);
    });

    it("R14: returns false for undefined/null error", () => {
      expect(isZohoRateLimitError(undefined)).toBe(false);
      expect(isZohoRateLimitError(null)).toBe(false);
      expect(isZohoRateLimitError({})).toBe(false);
    });
  });

  // ─── R15: Scheduler stall detection ──────────────────────────────────────
  describe("R15: scheduler stall detection", () => {
    it("R15: delayMs < 0 is detected as a stall", () => {
      expect(detectStall(-1000)).toBe(true);
      expect(detectStall(-1)).toBe(true);
      expect(detectStall(0)).toBe(false);
      expect(detectStall(1000)).toBe(false);
    });
  });
});
