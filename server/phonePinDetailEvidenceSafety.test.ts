import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { withoutViolationEvidence } from './complianceDb';
import { withoutNotePhoto } from './notesDb';

describe('phone/PIN View Details evidence-safety hotfix', () => {
  it('returns violation metadata without durable keys, legacy URLs, or presigned URLs', () => {
    const result = withoutViolationEvidence({
      id: 42,
      status: 'reported',
      notes: 'Metadata only',
      evidenceKeys: '["violation-photos/worker-7/private.jpg"]',
      evidenceUrls: '["https://example.invalid/presigned-private-object"]',
    });

    expect(result).toEqual({ id: 42, status: 'reported', notes: 'Metadata only' });
    expect(JSON.stringify(result)).not.toContain('violation-photos/');
    expect(JSON.stringify(result)).not.toContain('presigned');
  });

  it('returns note metadata with no usable photo location', () => {
    const result = withoutNotePhoto({
      id: 99,
      noteText: 'Visit note',
      photoStorageKey: 'payment-proofs/customer-1/private.jpg',
      photoUrl: 'https://example.invalid/presigned-private-object',
    });

    expect(result).toEqual({ id: 99, noteText: 'Visit note', photoUrl: null });
    expect(JSON.stringify(result)).not.toContain('payment-proofs/');
    expect(JSON.stringify(result)).not.toContain('presigned');
  });

  it('routes phone/PIN detail reads through the metadata-only serializers', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, 'routers', 'workerAuth.ts'), 'utf8');

    expect(source).toMatch(/getViolationsByCustomer:\s*publicProcedure[\s\S]*?getViolationsByCustomer\(input\.customerId, \{ includeEvidence: false \}\)/);
    expect(source).toMatch(/getCustomerNotes:\s*publicProcedure[\s\S]*?getCustomerNotesWithReplies\(input\.customerId, \{ includePhoto: false \}\)/);
  });

  it('leaves the authenticated compliance read on the evidence-minting default path', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, 'routers', 'compliance.ts'), 'utf8');

    expect(source).toMatch(/getViolationsByCustomer:[\s\S]*?complianceDb\.getViolationsByCustomer\(input\.customerId\)/);
    expect(source).not.toMatch(/complianceDb\.getViolationsByCustomer\(input\.customerId, \{ includeEvidence: false \}\)/);
  });
});
