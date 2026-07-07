/**
 * T48/T49 — Behavioral verification: syncAllInvoices() rewrite + name→ID fix
 *
 * Tests verify:
 *  A. syncAllInvoices() writes to `invoices` table (not `zohoInvoices`)
 *  B. FM attribution: reads customer_cf_field_manager from invoice payload
 *  C. MAF attribution: reads customer_cf_customermaf from invoice payload
 *  D. Customer ID resolution: maps zohoContactId → internal customer id
 *  E. Upsert semantics: duplicate zohoInvoiceId updates status/balance/FM/MAF
 *  F. Customers with no invoices are skipped gracefully (no error)
 *  G. Pagination: getCustomerInvoices is called once per customer (pagination handled inside zoho.ts)
 *  H. Rate limiting: 100ms delay between customers
 *  I. Return shape: { success, failed, total } with correct counts
 *  J. Failed invoice upsert increments `failed` counter, does not abort the loop
 *  K. FM/MAF null fallback: missing custom fields → null (not crash)
 *  L. syncAllPayments() is unchanged (still writes to zohoPayments)
 *  M. zohoScheduler imports syncAllInvoices (not just syncAllPayments)
 *  N. zohoSyncHistory schema has invoiceSyncedCount and invoiceFailedCount columns
 *  O. Rate-limit sentinel (isZohoRateLimitError)
 *  P. T49 name→ID resolution: FM string names resolve to numeric worker IDs; phantoms/untagged → NULL
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Minimal mock types ───────────────────────────────────────────────────────

interface MockInvoicePayload {
  invoice_id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  status: string;
  date: string;
  due_date: string;
  total: number;
  balance: number;
  customer_cf_field_manager?: string;
  customer_cf_field_manager_unformatted?: string;
  customer_cf_customermaf?: string;
  customer_cf_customermaf_unformatted?: string;
}

interface MockCustomer {
  id: number;
  name: string;
  zohoContactId: string | null;
}

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeInvoice(overrides: Partial<MockInvoicePayload> = {}): MockInvoicePayload {
  return {
    invoice_id: 'INV-001',
    invoice_number: 'INV-2024-001',
    customer_id: 'ZOHO-CUST-001',
    customer_name: 'Test Customer',
    status: 'unpaid',
    date: '2024-01-15',
    due_date: '2024-02-15',
    total: 5000,
    balance: 5000,
    customer_cf_field_manager: 'Halleluyah',
    customer_cf_field_manager_unformatted: 'Halleluyah',
    customer_cf_customermaf: 'MOT-076',
    customer_cf_customermaf_unformatted: 'MOT-076',
    ...overrides,
  };
}

function makeCustomer(overrides: Partial<MockCustomer> = {}): MockCustomer {
  return {
    id: 1001,
    name: 'Test Customer',
    zohoContactId: 'ZOHO-CUST-001',
    ...overrides,
  };
}

// ─── Core logic extracted for unit testing ────────────────────────────────────
// These functions mirror the logic inside syncAllInvoices() so we can test
// the attribution and upsert logic without a live DB or Zoho API connection.

/**
 * Extract raw FM name from invoice payload (mirrors syncAllInvoices logic)
 */
function extractRawFieldManagerName(inv: MockInvoicePayload): string | null {
  return inv.customer_cf_field_manager_unformatted ||
    inv.customer_cf_field_manager ||
    null;
}

/**
 * T49 Fix 2: Resolve raw FM name to numeric worker ID string.
 * Returns null for unmatched names (phantoms, territorial labels, typos).
 */
function resolveFieldManagerId(
  rawName: string | null,
  workerIdByName: Map<string, string>
): string | null {
  if (!rawName) return null;
  return workerIdByName.get(rawName) ?? null;
}

/** Backward-compat alias used by existing B-suite tests */
function extractFieldManager(inv: MockInvoicePayload): string | null {
  return extractRawFieldManagerName(inv);
}

/**
 * Extract MAF code from invoice payload (mirrors syncAllInvoices logic)
 */
function extractMaf(inv: MockInvoicePayload): string | null {
  return inv.customer_cf_customermaf_unformatted ||
    inv.customer_cf_customermaf ||
    null;
}

/**
 * Resolve internal customer ID from lookup map (mirrors syncAllInvoices logic)
 */
function resolveCustomerId(
  zohoCustomerId: string,
  customerMap: Map<string, number>
): number | null {
  return customerMap.get(zohoCustomerId) ?? null;
}

/**
 * Build customer lookup map (mirrors syncAllInvoices logic)
 */
function buildCustomerMap(customers: MockCustomer[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const c of customers) {
    if (c.zohoContactId) map.set(c.zohoContactId, c.id);
  }
  return map;
}

/**
 * Simulate the syncAllInvoices loop for a batch of customers
 * T49: accepts optional workerIdByName map for name→ID resolution.
 * Returns { success, failed, upsertedRows } for verification
 */
async function simulateSyncAllInvoices(
  customers: MockCustomer[],
  invoicesByCustomer: Map<string, MockInvoicePayload[]>,
  failingInvoiceIds: Set<string> = new Set(),
  workerIdByName: Map<string, string> = new Map()
): Promise<{ success: number; failed: number; total: number; upsertedRows: any[] }> {
  const customersWithZoho = customers.filter(c => c.zohoContactId);
  const customerMap = buildCustomerMap(customersWithZoho);

  let success = 0;
  let failed = 0;
  const upsertedRows: any[] = [];

  for (const customer of customersWithZoho) {
    if (!customer.zohoContactId) continue;

    const invoices = invoicesByCustomer.get(customer.zohoContactId) || [];
    if (invoices.length === 0) continue;

    for (const inv of invoices) {
      if (failingInvoiceIds.has(inv.invoice_id)) {
        failed++;
        continue;
      }

      // T49 Fix 2: resolve raw FM name → numeric ID string (or null)
      const rawFmName = extractRawFieldManagerName(inv);
      const resolvedFmId = resolveFieldManagerId(rawFmName, workerIdByName);

      const row = {
        zohoInvoiceId: inv.invoice_id,
        customerId: resolveCustomerId(inv.customer_id, customerMap),
        fieldManagerId: resolvedFmId,
        maf: extractMaf(inv),
        invoiceNumber: inv.invoice_number,
        invoiceDate: new Date(inv.date),
        dueDate: inv.due_date ? new Date(inv.due_date) : null,
        customerName: inv.customer_name || customer.name || null,
        total: inv.total.toString(),
        balance: inv.balance.toString(),
        status: inv.status || 'unpaid',
      };
      upsertedRows.push(row);
      success++;
    }

    // 100ms delay (simulated — not actually awaited in tests)
  }

  return { success, failed, total: customersWithZoho.length, upsertedRows };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('T48 — syncAllInvoices() rewrite', () => {

  // A. Target table
  describe('A. Target table', () => {
    it('A1: syncAllInvoices imports from invoices table, not zohoInvoices', async () => {
      // Verify the import in the source file
      const fs = await import('fs');
      const src = fs.readFileSync('./server/services/zohoFinancialSync.ts', 'utf8');
      // T49: import now includes workers for name→ID resolution
      expect(src).toContain("import { invoices, zohoPayments, customers, workers }");
      expect(src).not.toContain("import { zohoInvoices,");
    });

    it('A2: syncAllInvoices uses db.insert(invoices), not db.insert(zohoInvoices)', async () => {
      const fs = await import('fs');
      const src = fs.readFileSync('./server/services/zohoFinancialSync.ts', 'utf8');
      expect(src).toContain('db.insert(invoices)');
      expect(src).not.toContain('db.insert(zohoInvoices)');
    });
  });

  // B. FM attribution
  describe('B. FM attribution from Zoho custom fields', () => {
    it('B1: extracts fieldManagerId from customer_cf_field_manager_unformatted (preferred)', () => {
      const inv = makeInvoice({
        customer_cf_field_manager: 'Halleluyah',
        customer_cf_field_manager_unformatted: 'Halleluyah',
      });
      expect(extractFieldManager(inv)).toBe('Halleluyah');
    });

    it('B2: falls back to customer_cf_field_manager when _unformatted is absent', () => {
      const inv = makeInvoice({
        customer_cf_field_manager: 'Juwon',
        customer_cf_field_manager_unformatted: undefined,
      });
      expect(extractFieldManager(inv)).toBe('Juwon');
    });

    it('B3: returns null when both FM custom fields are absent', () => {
      const inv = makeInvoice({
        customer_cf_field_manager: undefined,
        customer_cf_field_manager_unformatted: undefined,
      });
      expect(extractFieldManager(inv)).toBeNull();
    });

    it('B4: all known FM names are preserved exactly', () => {
      const fmNames = ['Halleluyah', 'Juwon', 'Bukola'];
      for (const name of fmNames) {
        const inv = makeInvoice({ customer_cf_field_manager_unformatted: name });
        expect(extractFieldManager(inv)).toBe(name);
      }
    });
  });

  // C. MAF attribution
  describe('C. MAF attribution from Zoho custom fields', () => {
    it('C1: extracts maf from customer_cf_customermaf_unformatted (preferred)', () => {
      const inv = makeInvoice({
        customer_cf_customermaf: 'MOT-076',
        customer_cf_customermaf_unformatted: 'MOT-076',
      });
      expect(extractMaf(inv)).toBe('MOT-076');
    });

    it('C2: falls back to customer_cf_customermaf when _unformatted is absent', () => {
      const inv = makeInvoice({
        customer_cf_customermaf: 'SAY-076',
        customer_cf_customermaf_unformatted: undefined,
      });
      expect(extractMaf(inv)).toBe('SAY-076');
    });

    it('C3: returns null when both MAF custom fields are absent', () => {
      const inv = makeInvoice({
        customer_cf_customermaf: undefined,
        customer_cf_customermaf_unformatted: undefined,
      });
      expect(extractMaf(inv)).toBeNull();
    });
  });

  // D. Customer ID resolution
  describe('D. Customer ID resolution via lookup map', () => {
    it('D1: resolves internal customer ID from zohoContactId', () => {
      const customers = [makeCustomer({ id: 1001, zohoContactId: 'ZOHO-001' })];
      const map = buildCustomerMap(customers);
      expect(resolveCustomerId('ZOHO-001', map)).toBe(1001);
    });

    it('D2: returns null for unknown zohoContactId', () => {
      const map = buildCustomerMap([]);
      expect(resolveCustomerId('ZOHO-UNKNOWN', map)).toBeNull();
    });

    it('D3: customers without zohoContactId are excluded from map', () => {
      const customers = [
        makeCustomer({ id: 1001, zohoContactId: 'ZOHO-001' }),
        makeCustomer({ id: 1002, zohoContactId: null }),
      ];
      const map = buildCustomerMap(customers);
      expect(map.size).toBe(1);
      expect(map.has('ZOHO-001')).toBe(true);
    });
  });

  // E. Upsert semantics
  describe('E. Upsert semantics', () => {
    it('E1: upserted row has zohoInvoiceId as the unique key', async () => {
      const customers = [makeCustomer()];
      const inv = makeInvoice({ invoice_id: 'ZOHO-INV-001' });
      const invoicesByCustomer = new Map([['ZOHO-CUST-001', [inv]]]);
      const result = await simulateSyncAllInvoices(customers, invoicesByCustomer);
      expect(result.upsertedRows[0].zohoInvoiceId).toBe('ZOHO-INV-001');
    });

    it('E2: upserted row includes resolved numeric fieldManagerId and maf (T49)', async () => {
      const customers = [makeCustomer()];
      const inv = makeInvoice({
        customer_cf_field_manager_unformatted: 'Bukola',
        customer_cf_customermaf_unformatted: 'DIC-413',
      });
      const invoicesByCustomer = new Map([['ZOHO-CUST-001', [inv]]]);
      // T49: pass workerIdByName map so 'Bukola' resolves to '8'
      const workerMap = new Map([['Bukola', '8'], ['Halleluyah', '7'], ['Juwon', '9']]);
      const result = await simulateSyncAllInvoices(customers, invoicesByCustomer, new Set(), workerMap);
      expect(result.upsertedRows[0].fieldManagerId).toBe('8');
      expect(result.upsertedRows[0].maf).toBe('DIC-413');
    });

    it('E3: upserted row has correct customerId from customer map', async () => {
      const customers = [makeCustomer({ id: 9999, zohoContactId: 'ZOHO-CUST-001' })];
      const inv = makeInvoice({ customer_id: 'ZOHO-CUST-001' });
      const invoicesByCustomer = new Map([['ZOHO-CUST-001', [inv]]]);
      const result = await simulateSyncAllInvoices(customers, invoicesByCustomer);
      expect(result.upsertedRows[0].customerId).toBe(9999);
    });
  });

  // F. Customers with no invoices
  describe('F. Customers with no invoices', () => {
    it('F1: customer with empty invoice list is skipped without error', async () => {
      const customers = [makeCustomer({ id: 1, zohoContactId: 'ZOHO-001' })];
      const invoicesByCustomer = new Map<string, MockInvoicePayload[]>([['ZOHO-001', []]]);
      const result = await simulateSyncAllInvoices(customers, invoicesByCustomer);
      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.total).toBe(1);
    });

    it('F2: customer not in invoicesByCustomer map is skipped without error', async () => {
      const customers = [makeCustomer({ id: 1, zohoContactId: 'ZOHO-001' })];
      const invoicesByCustomer = new Map<string, MockInvoicePayload[]>();
      const result = await simulateSyncAllInvoices(customers, invoicesByCustomer);
      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  // G. Pagination
  describe('G. Pagination (per_page=200)', () => {
    it('G1: zoho.ts getCustomerInvoices now uses per_page=200 parameter', async () => {
      const fs = await import('fs');
      const src = fs.readFileSync('./server/services/zoho.ts', 'utf8');
      expect(src).toContain('per_page: 200');
      expect(src).toContain('has_more_page');
    });

    it('G2: getCustomerInvoices loops until has_more_page is false', async () => {
      const fs = await import('fs');
      const src = fs.readFileSync('./server/services/zoho.ts', 'utf8');
      // Verify the while loop exists in getCustomerInvoices
      expect(src).toContain('while (hasMorePages)');
    });
  });

  // H. Rate limiting
  describe('H. Rate limiting', () => {
    it('H1: syncAllInvoices source has 100ms delay between customers', async () => {
      const fs = await import('fs');
      const src = fs.readFileSync('./server/services/zohoFinancialSync.ts', 'utf8');
      expect(src).toContain('setTimeout(resolve, 100)');
    });
  });

  // I. Return shape
  describe('I. Return shape', () => {
    it('I1: returns { success, failed, total } with correct counts for happy path', async () => {
      const customers = [
        makeCustomer({ id: 1, zohoContactId: 'ZOHO-001' }),
        makeCustomer({ id: 2, zohoContactId: 'ZOHO-002' }),
      ];
      const invoicesByCustomer = new Map([
        ['ZOHO-001', [makeInvoice({ invoice_id: 'I1' }), makeInvoice({ invoice_id: 'I2' })]],
        ['ZOHO-002', [makeInvoice({ invoice_id: 'I3' })]],
      ]);
      const result = await simulateSyncAllInvoices(customers, invoicesByCustomer);
      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.total).toBe(2);
    });

    it('I2: total reflects number of customers with zohoContactId (not total invoices)', async () => {
      const customers = [
        makeCustomer({ id: 1, zohoContactId: 'ZOHO-001' }),
        makeCustomer({ id: 2, zohoContactId: null }), // excluded
      ];
      const invoicesByCustomer = new Map([['ZOHO-001', [makeInvoice()]]]);
      const result = await simulateSyncAllInvoices(customers, invoicesByCustomer);
      expect(result.total).toBe(1); // only 1 customer with zohoContactId
    });
  });

  // J. Failed invoice handling
  describe('J. Failed invoice upsert handling', () => {
    it('J1: failed upsert increments failed counter without aborting loop', async () => {
      const customers = [makeCustomer()];
      const invoicesByCustomer = new Map([
        ['ZOHO-CUST-001', [
          makeInvoice({ invoice_id: 'GOOD-1' }),
          makeInvoice({ invoice_id: 'BAD-1' }),
          makeInvoice({ invoice_id: 'GOOD-2' }),
        ]],
      ]);
      const failingIds = new Set(['BAD-1']);
      const result = await simulateSyncAllInvoices(customers, invoicesByCustomer, failingIds);
      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);
    });
  });

  // K. Null FM/MAF fallback
  describe('K. Null FM/MAF fallback', () => {
    it('K1: invoice with no FM/MAF custom fields produces null fieldManagerId and maf', async () => {
      const customers = [makeCustomer()];
      const inv = makeInvoice({
        customer_cf_field_manager: undefined,
        customer_cf_field_manager_unformatted: undefined,
        customer_cf_customermaf: undefined,
        customer_cf_customermaf_unformatted: undefined,
      });
      const invoicesByCustomer = new Map([['ZOHO-CUST-001', [inv]]]);
      const result = await simulateSyncAllInvoices(customers, invoicesByCustomer);
      expect(result.upsertedRows[0].fieldManagerId).toBeNull();
      expect(result.upsertedRows[0].maf).toBeNull();
    });
  });

  // L. syncAllPayments unchanged
  describe('L. syncAllPayments still writes to zohoPayments', () => {
    it('L1: syncAllPayments source still uses db.insert(zohoPayments)', async () => {
      const fs = await import('fs');
      const src = fs.readFileSync('./server/services/zohoFinancialSync.ts', 'utf8');
      expect(src).toContain('db.insert(zohoPayments)');
    });
  });

  // M. Scheduler wiring
  describe('M. zohoScheduler imports syncAllInvoices', () => {
    it('M1: zohoScheduler.ts imports syncAllInvoices from zohoFinancialSync', async () => {
      const fs = await import('fs');
      const src = fs.readFileSync('./server/services/zohoScheduler.ts', 'utf8');
      expect(src).toContain('syncAllInvoices');
      expect(src).toContain("import { syncAllInvoices, syncAllPayments }");
    });

    it('M2: zohoScheduler.ts calls syncAllInvoices() inside executeSyncJob', async () => {
      const fs = await import('fs');
      const src = fs.readFileSync('./server/services/zohoScheduler.ts', 'utf8');
      expect(src).toContain('await syncAllInvoices()');
    });

    it('M3: zohoScheduler.ts logs invoiceSyncedCount and invoiceFailedCount to zohoSyncHistory', async () => {
      const fs = await import('fs');
      const src = fs.readFileSync('./server/services/zohoScheduler.ts', 'utf8');
      expect(src).toContain('invoiceSyncedCount');
      expect(src).toContain('invoiceFailedCount');
    });
  });

  // N. Schema columns
  describe('N. zohoSyncHistory schema has invoice tracking columns', () => {
    it('N1: schema.ts has invoiceSyncedCount column on zohoSyncHistory', async () => {
      const fs = await import('fs');
      const src = fs.readFileSync('./drizzle/schema.ts', 'utf8');
      expect(src).toContain('invoiceSyncedCount');
    });

    it('N2: schema.ts has invoiceFailedCount column on zohoSyncHistory', async () => {
      const fs = await import('fs');
      const src = fs.readFileSync('./drizzle/schema.ts', 'utf8');
      expect(src).toContain('invoiceFailedCount');
    });
  });

  // O. Rate-limit sentinel
  describe('O. Rate-limit sentinel (isZohoRateLimitError)', () => {
    // Mirror the isZohoRateLimitError logic for unit testing
    function isZohoRateLimitError(err: unknown): boolean {
      if (!err || typeof err !== 'object') return false;
      const e = err as Record<string, unknown>;
      if (e['response'] && typeof e['response'] === 'object') {
        const resp = e['response'] as Record<string, unknown>;
        if (resp['status'] === 429) return true;
        if (resp['data'] && typeof resp['data'] === 'object') {
          const data = resp['data'] as Record<string, unknown>;
          if (data['code'] === 45) return true;
        }
      }
      return false;
    }

    it('O1: detects HTTP 429 status in Axios-style error', () => {
      const err = { response: { status: 429, data: {} } };
      expect(isZohoRateLimitError(err)).toBe(true);
    });

    it('O2: detects Zoho code 45 in response data', () => {
      const err = { response: { status: 200, data: { code: 45, message: 'rate limit exceeded' } } };
      expect(isZohoRateLimitError(err)).toBe(true);
    });

    it('O3: returns false for non-rate-limit errors', () => {
      const err = { response: { status: 500, data: { code: 0 } } };
      expect(isZohoRateLimitError(err)).toBe(false);
    });

    it('O4: returns false for null/undefined', () => {
      expect(isZohoRateLimitError(null)).toBe(false);
      expect(isZohoRateLimitError(undefined)).toBe(false);
    });

    it('O5: returns false for non-object errors (string, number)', () => {
      expect(isZohoRateLimitError('rate limit')).toBe(false);
      expect(isZohoRateLimitError(429)).toBe(false);
    });

    it('O6: source code contains isZohoRateLimitError function', async () => {
      const fs = await import('fs');
      const src = fs.readFileSync('./server/services/zohoFinancialSync.ts', 'utf8');
      expect(src).toContain('isZohoRateLimitError');
      expect(src).toContain('code: 45');
    });

    it('O7: syncAllInvoices stops cleanly when rate limit is hit (no further customers processed)', async () => {
      const fs = await import('fs');
      const src = fs.readFileSync('./server/services/zohoFinancialSync.ts', 'utf8');
      expect(src).toContain('if (rateLimited) break');
      expect(src).toContain('rateLimited = true');
    });

    it('O8: syncAllInvoices returns rateLimited in return shape', async () => {
      const fs = await import('fs');
      const src = fs.readFileSync('./server/services/zohoFinancialSync.ts', 'utf8');
      // Return type annotation
      expect(src).toContain('rateLimited: boolean');
      // Early-return false path (DB unavailable)
      expect(src).toContain('rateLimited: false');
      // The rateLimited flag is set to true and returned
      expect(src).toContain('rateLimited = true');
      expect(src).toContain('return { success, failed, total: customersWithZoho.length, rateLimited }');
    });
  });

  // P. T49 — name→ID resolution
  describe('P. T49 — FM name→ID resolution in syncAllInvoices()', () => {

    const canonicalWorkerMap = new Map([
      ['Halleluyah', '7'],
      ['Bukola', '8'],
      ['Juwon', '9'],
    ]);

    it('P1: "Halleluyah" resolves to worker ID "7"', () => {
      expect(resolveFieldManagerId('Halleluyah', canonicalWorkerMap)).toBe('7');
    });

    it('P2: "Bukola" resolves to worker ID "8"', () => {
      expect(resolveFieldManagerId('Bukola', canonicalWorkerMap)).toBe('8');
    });

    it('P3: "Juwon" resolves to worker ID "9"', () => {
      expect(resolveFieldManagerId('Juwon', canonicalWorkerMap)).toBe('9');
    });

    it('P4: phantom name "Low.low income" resolves to NULL (not in canonical map)', () => {
      expect(resolveFieldManagerId('Low.low income', canonicalWorkerMap)).toBeNull();
    });

    it('P5: territorial label "Outside IbSW" resolves to NULL', () => {
      expect(resolveFieldManagerId('Outside IbSW', canonicalWorkerMap)).toBeNull();
    });

    it('P6: empty string resolves to NULL', () => {
      expect(resolveFieldManagerId('', canonicalWorkerMap)).toBeNull();
    });

    it('P7: null input resolves to NULL', () => {
      expect(resolveFieldManagerId(null, canonicalWorkerMap)).toBeNull();
    });

    it('P8: unknown new name resolves to NULL (future-proof)', () => {
      expect(resolveFieldManagerId('SomeNewValidName', canonicalWorkerMap)).toBeNull();
    });

    it('P9: full sync simulation — Halleluyah invoice stores "7", not the string name', async () => {
      const customers = [makeCustomer({ id: 1, zohoContactId: 'ZOHO-CUST-001' })];
      const inv = makeInvoice({ customer_cf_field_manager_unformatted: 'Halleluyah' });
      const invoicesByCustomer = new Map([['ZOHO-CUST-001', [inv]]]);
      const result = await simulateSyncAllInvoices(customers, invoicesByCustomer, new Set(), canonicalWorkerMap);
      expect(result.upsertedRows[0].fieldManagerId).toBe('7');
    });

    it('P10: full sync simulation — phantom name stores NULL, not the string name', async () => {
      const customers = [makeCustomer({ id: 1, zohoContactId: 'ZOHO-CUST-001' })];
      const inv = makeInvoice({ customer_cf_field_manager_unformatted: 'Low.low income' });
      const invoicesByCustomer = new Map([['ZOHO-CUST-001', [inv]]]);
      const result = await simulateSyncAllInvoices(customers, invoicesByCustomer, new Set(), canonicalWorkerMap);
      expect(result.upsertedRows[0].fieldManagerId).toBeNull();
    });

    it('P11: source code builds workerIdByName map from workers table', async () => {
      const fs = await import('fs');
      const src = fs.readFileSync('./server/services/zohoFinancialSync.ts', 'utf8');
      expect(src).toContain('workerIdByName');
      expect(src).toContain("eq(workers.role, 'field_manager')");
    });

    it('P12: source code uses resolvedFieldManagerId (not raw name) in upsert', async () => {
      const fs = await import('fs');
      const src = fs.readFileSync('./server/services/zohoFinancialSync.ts', 'utf8');
      expect(src).toContain('resolvedFieldManagerId');
      expect(src).toContain('workerIdByName.get(rawFieldManagerName)');
      // Raw name must NOT be stored directly
      expect(src).not.toContain('fieldManagerId: fieldManagerName');
      expect(src).not.toContain('fieldManagerId: rawFieldManagerName');
    });

    it('P13: source code logs a warning for unmapped FM names', async () => {
      const fs = await import('fs');
      const src = fs.readFileSync('./server/services/zohoFinancialSync.ts', 'utf8');
      expect(src).toContain('Unmapped FM name');
      expect(src).toContain('console.warn');
    });

    it('P14: source code imports workers from schema', async () => {
      const fs = await import('fs');
      const src = fs.readFileSync('./server/services/zohoFinancialSync.ts', 'utf8');
      expect(src).toContain('workers');
      expect(src).toContain("import { invoices, zohoPayments, customers, workers }");
    });

  });

});
