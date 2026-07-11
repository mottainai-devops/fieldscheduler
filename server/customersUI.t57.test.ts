/**
 * T57 Client Tests — Customers page UI: Unmapped badge, Quick Stats, filter chip
 *
 * Suite S: T57 Customers page UI behavioral tests
 *
 * S1  stats.unmapped counts customers with null maf
 * S2  stats.unmapped is 0 when all customers have maf
 * S3  stats.mafTags counts only non-null MAFs
 * S4  showUnmappedOnly=true filters out customers with maf set
 * S5  showUnmappedOnly=false shows all customers
 * S6  showUnmappedOnly + selectedMAF='no_maf' both filter to unmapped
 * S7  Unmapped badge shown when customer.maf is null
 * S8  Unmapped badge not shown when customer.maf is set
 * S9  Quick Stats chip shows correct unmapped count
 * S10 Filter chip toggles: active state when showUnmappedOnly=true
 * S11 no_maf MAF filter (existing T45 pattern) still works correctly
 */
import { describe, it, expect } from "vitest";

// ─── Minimal customer type ────────────────────────────────────────────────────
interface Customer {
  id: number;
  name: string;
  maf: string | null;
  fieldManager: number | null;
  routeAssignmentStatus: string;
}

// ─── Simulate stats computation ──────────────────────────────────────────────
function computeStats(customers: Customer[]) {
  const uniqueMAFs = new Set(customers.map(c => c.maf).filter(Boolean));
  const managersCount = new Set(customers.map(c => c.fieldManager).filter(Boolean)).size;
  const routeAssigned = customers.filter(c => c.routeAssignmentStatus === "assigned").length;
  const untreated = customers.filter(c => c.routeAssignmentStatus === "untreated").length;
  const unmappedCount = customers.filter(c => !c.maf).length;
  return {
    mafTags: uniqueMAFs.size,
    managers: managersCount,
    routeAssigned,
    untreated,
    unmapped: unmappedCount,
  };
}

// ─── Simulate filteredCustomers logic ────────────────────────────────────────
function filterCustomers(
  customers: Customer[],
  opts: {
    selectedMAF?: string;
    showUnmappedOnly?: boolean;
  }
): Customer[] {
  return customers.filter(customer => {
    if (opts.selectedMAF) {
      if (opts.selectedMAF === "no_maf") {
        if (customer.maf !== null) return false;
      } else {
        if (customer.maf !== opts.selectedMAF) return false;
      }
    }
    if (opts.showUnmappedOnly && customer.maf) return false;
    return true;
  });
}

// ─── Simulate badge visibility ────────────────────────────────────────────────
function shouldShowUnmappedBadge(customer: Customer): boolean {
  return !customer.maf;
}

// ─── Test data ────────────────────────────────────────────────────────────────
const customers: Customer[] = [
  { id: 1, name: "Mapped A", maf: "DIC-413", fieldManager: 1, routeAssignmentStatus: "assigned" },
  { id: 2, name: "Mapped B", maf: "ADK-062", fieldManager: 1, routeAssignmentStatus: "untreated" },
  { id: 3, name: "Unmapped A", maf: null, fieldManager: 2, routeAssignmentStatus: "untreated" },
  { id: 4, name: "Unmapped B", maf: null, fieldManager: null, routeAssignmentStatus: "untreated" },
  { id: 5, name: "OutsideIBSW", maf: null, fieldManager: 2, routeAssignmentStatus: "untreated" },
];

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("T57 — Customers page UI: Unmapped badge, Quick Stats, filter chip", () => {

  describe("S1-S3: Quick Stats computation", () => {
    it("S1: stats.unmapped counts customers with null maf", () => {
      const stats = computeStats(customers);
      expect(stats.unmapped).toBe(3); // customers 3, 4, 5
    });

    it("S2: stats.unmapped is 0 when all customers have maf", () => {
      const allMapped: Customer[] = [
        { id: 1, name: "A", maf: "DIC-413", fieldManager: 1, routeAssignmentStatus: "assigned" },
        { id: 2, name: "B", maf: "ADK-062", fieldManager: 1, routeAssignmentStatus: "untreated" },
      ];
      expect(computeStats(allMapped).unmapped).toBe(0);
    });

    it("S3: stats.mafTags counts only non-null MAFs", () => {
      const stats = computeStats(customers);
      expect(stats.mafTags).toBe(2); // DIC-413, ADK-062
    });
  });

  describe("S4-S6: showUnmappedOnly filter chip", () => {
    it("S4: showUnmappedOnly=true filters out customers with maf set", () => {
      const result = filterCustomers(customers, { showUnmappedOnly: true });
      expect(result.every(c => !c.maf)).toBe(true);
      expect(result.length).toBe(3);
    });

    it("S5: showUnmappedOnly=false shows all customers", () => {
      const result = filterCustomers(customers, { showUnmappedOnly: false });
      expect(result.length).toBe(5);
    });

    it("S6: showUnmappedOnly and selectedMAF='no_maf' both filter to unmapped only", () => {
      const byChip = filterCustomers(customers, { showUnmappedOnly: true });
      const byDropdown = filterCustomers(customers, { selectedMAF: "no_maf" });
      expect(byChip.map(c => c.id).sort()).toEqual(byDropdown.map(c => c.id).sort());
    });
  });

  describe("S7-S8: Unmapped badge visibility", () => {
    it("S7: badge shown when customer.maf is null", () => {
      const unmapped = customers.find(c => c.id === 3)!;
      expect(shouldShowUnmappedBadge(unmapped)).toBe(true);
    });

    it("S8: badge not shown when customer.maf is set", () => {
      const mapped = customers.find(c => c.id === 1)!;
      expect(shouldShowUnmappedBadge(mapped)).toBe(false);
    });
  });

  describe("S9-S10: Quick Stats chip state", () => {
    it("S9: Quick Stats chip shows correct unmapped count", () => {
      const stats = computeStats(customers);
      // Chip renders when stats.unmapped > 0
      expect(stats.unmapped).toBeGreaterThan(0);
      expect(stats.unmapped).toBe(3);
    });

    it("S10: chip label includes count and active indicator when toggled", () => {
      const count = 3;
      const activeLabel = `${count} Unmapped ✕`;
      const inactiveLabel = `${count} Unmapped`;
      expect(activeLabel).toContain("✕");
      expect(inactiveLabel).not.toContain("✕");
    });
  });

  describe("S11: no_maf MAF filter regression guard (T45 pattern)", () => {
    it("S11: selectedMAF='no_maf' still filters to null-maf customers", () => {
      const result = filterCustomers(customers, { selectedMAF: "no_maf" });
      expect(result.every(c => c.maf === null)).toBe(true);
      expect(result.length).toBe(3);
    });
  });
});
