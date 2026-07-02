/**
 * T32 — Behavioral verification: canonical constants canonicalization
 *
 * Tests:
 *  1.  INVOICE_STATUS completeness: all 7 expected status values present
 *  2.  INVOICE_STATUS no extra values: exactly 7 values, no additions
 *  3.  OUTSTANDING_STATUSES subset: all members are valid INVOICE_STATUS values
 *  4.  OUTSTANDING_STATUSES excludes void: T29 Rule #63
 *  5.  OUTSTANDING_STATUSES excludes paid
 *  6.  OUTSTANDING_STATUSES excludes partially_paid
 *  7.  OUTSTANDING_STATUSES includes overdue
 *  8.  OUTSTANDING_STATUSES includes sent
 *  9.  OUTSTANDING_STATUSES includes draft
 * 10.  OUTSTANDING_STATUSES does NOT include unpaid (unpaid is valid but not outstanding)
 * 11.  SKIP_REASONS completeness: all 8 canonical skip reason values present
 * 12.  SKIP_REASONS no stale values: old pre-T13 values not present
 * 13.  ROUTING_REASONS completeness: all 5 routing reason values present
 * 14.  ROUTING_REASONS value/label pairs: each entry has non-empty value and label
 * 15.  NULL_MAF_SENTINEL: value is '__NULL__' (contract for server/client parity)
 * 16.  NULL_MAF_DISPLAY_LABEL: value is '(No MAF set)' (contract for UI parity)
 */
import { describe, it, expect } from 'vitest';
import {
  INVOICE_STATUS,
  OUTSTANDING_STATUS_LIST,
  OUTSTANDING_STATUSES,
  InvoiceStatus,
} from '../shared/constants/invoice-status';
import { SKIP_REASONS } from '../shared/const';
import { ROUTING_REASONS } from '../shared/const';
import { NULL_MAF_SENTINEL, NULL_MAF_DISPLAY_LABEL } from '../shared/constants/maf';

// ─── Expected canonical values ────────────────────────────────────────────────
const EXPECTED_INVOICE_STATUSES: InvoiceStatus[] = [
  'void', 'draft', 'sent', 'overdue', 'paid', 'partially_paid', 'unpaid',
];

const EXPECTED_OUTSTANDING_STATUSES: InvoiceStatus[] = [
  'overdue', 'sent', 'draft',
];

// Canonical skip reasons as of T13 (schema: routeScheduleCustomers.skipReason)
const EXPECTED_SKIP_REASONS = [
  'no_access', 'customer_request', 'customer_not_present', 'safety_concern',
  'bin_not_out', 'permanent_moved', 'permanent_closed', 'other',
];

// Stale values that existed before T13 and must NOT appear in the canonical const
const STALE_SKIP_REASONS = [
  'customer_not_home', 'bin_full', 'health_safety', 'vehicle_issue',
  'access_denied', 'no_bin', 'wrong_address',
];

const EXPECTED_ROUTING_REASONS = [
  'regular', 'callback', 'complaint', 'compliance', 'other',
];

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('T32 — Canonical Constants Canonicalization', () => {

  // ─── INVOICE_STATUS ──────────────────────────────────────────────────────
  describe('INVOICE_STATUS', () => {
    it('1. completeness: all 7 expected status values present', () => {
      for (const status of EXPECTED_INVOICE_STATUSES) {
        expect(Object.values(INVOICE_STATUS)).toContain(status);
      }
    });

    it('2. no extra values: exactly 7 values, no additions', () => {
      expect(Object.values(INVOICE_STATUS)).toHaveLength(7);
    });
  });

  // ─── OUTSTANDING_STATUSES ─────────────────────────────────────────────────
  describe('OUTSTANDING_STATUSES', () => {
    it('3. subset: all members are valid INVOICE_STATUS values', () => {
      const validStatuses = Object.values(INVOICE_STATUS);
      for (const status of OUTSTANDING_STATUSES) {
        expect(validStatuses).toContain(status);
      }
    });

    it('4. excludes void: T29 Rule #63 — void invoices never count as outstanding', () => {
      expect(OUTSTANDING_STATUSES).not.toContain('void');
    });

    it('5. excludes paid: paid invoices are not outstanding', () => {
      expect(OUTSTANDING_STATUSES).not.toContain('paid');
    });

    it('6. excludes partially_paid: partially paid invoices are not outstanding', () => {
      expect(OUTSTANDING_STATUSES).not.toContain('partially_paid');
    });

    it('7. includes overdue', () => {
      expect(OUTSTANDING_STATUSES).toContain('overdue');
    });

    it('8. includes sent', () => {
      expect(OUTSTANDING_STATUSES).toContain('sent');
    });

    it('9. includes draft', () => {
      expect(OUTSTANDING_STATUSES).toContain('draft');
    });

    it('10. does NOT include unpaid: unpaid is a valid status but not outstanding', () => {
      expect(OUTSTANDING_STATUSES).not.toContain('unpaid');
    });

    it('10b. OUTSTANDING_STATUS_LIST is a pre-quoted SQL fragment for template interpolation', () => {
      // OUTSTANDING_STATUS_LIST is a string like "'overdue', 'sent', 'draft'"
      // not an array — it is used directly in sql.raw() template literals
      expect(typeof OUTSTANDING_STATUS_LIST).toBe('string');
      expect(OUTSTANDING_STATUS_LIST).toContain("'overdue'");
      expect(OUTSTANDING_STATUS_LIST).toContain("'sent'");
      expect(OUTSTANDING_STATUS_LIST).toContain("'draft'");
    });
  });

  // ─── SKIP_REASONS ─────────────────────────────────────────────────────────
  describe('SKIP_REASONS', () => {
    it('11. completeness: all 8 canonical skip reason values present', () => {
      const values = SKIP_REASONS.map(r => r.value);
      for (const reason of EXPECTED_SKIP_REASONS) {
        expect(values).toContain(reason);
      }
    });

    it('12. no stale values: old pre-T13 values not present', () => {
      const values = SKIP_REASONS.map(r => r.value);
      for (const stale of STALE_SKIP_REASONS) {
        expect(values).not.toContain(stale);
      }
    });
  });

  // ─── ROUTING_REASONS ──────────────────────────────────────────────────────
  describe('ROUTING_REASONS', () => {
    it('13. completeness: all 5 routing reason values present', () => {
      const values = ROUTING_REASONS.map(r => r.value);
      for (const reason of EXPECTED_ROUTING_REASONS) {
        expect(values).toContain(reason);
      }
    });

    it('14. value/label pairs: each entry has non-empty value and label', () => {
      for (const entry of ROUTING_REASONS) {
        expect(entry.value).toBeTruthy();
        expect(entry.label).toBeTruthy();
      }
    });
  });

  // ─── MAF constants ────────────────────────────────────────────────────────
  describe('MAF constants', () => {
    it('15. NULL_MAF_SENTINEL: value is \'__NULL__\' (server/client parity contract)', () => {
      expect(NULL_MAF_SENTINEL).toBe('__NULL__');
    });

    it('16. NULL_MAF_DISPLAY_LABEL: value is \'(No MAF set)\' (UI parity contract)', () => {
      expect(NULL_MAF_DISPLAY_LABEL).toBe('(No MAF set)');
    });
  });
});
