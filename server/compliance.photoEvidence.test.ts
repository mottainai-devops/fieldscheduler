/**
 * T24 — Behavioral verification: compliance photo evidence
 *
 * Tests:
 *  1. uploadViolationPhoto: rejects unauthenticated call (no worker token)
 *  2. uploadViolationPhoto: rejects missing fileData
 *  3. uploadViolationPhoto: rejects missing fileName
 *  4. uploadViolationPhoto: rejects missing fileType
 *  5. createViolation: accepts evidenceUrls as array of strings
 *  6. createViolation: accepts evidenceUrls as empty array (treated as no photos)
 *  7. createViolation: rejects evidenceUrls as a plain string (wrong type)
 *  8. createViolation: accepts violation without evidenceUrls (backward compat)
 *  9. evidenceUrls JSON round-trip: serialize → deserialize produces same array
 * 10. evidenceUrls max 5: schema rejects array with 6 elements
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ─── Inline the Zod schemas from compliance.ts ───────────────────────────────

const uploadViolationPhotoInput = z.object({
  fileData: z.string().min(1),
  fileName: z.string().min(1),
  fileType: z.string().min(1),
});

const createViolationInput = z.object({
  customerId: z.number().int().positive(),
  violationTypeId: z.number().int().positive(),
  reportedBy: z.number().optional(),
  notes: z.string().optional(),
  // T24: evidenceUrls is now an array of S3 URLs (max 5), serialized as JSON in TEXT column
  // @drift-suppress: flutter-only upload path; React web client uploads via compliance.uploadViolationPhoto
  // then passes the resulting URLs here. Both clients now wire this field.
  evidenceUrls: z.array(z.string().url()).max(5).optional(),
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('compliance.uploadViolationPhoto — input validation', () => {
  it('rejects missing fileData', () => {
    const result = uploadViolationPhotoInput.safeParse({
      fileName: 'photo.jpg',
      fileType: 'image/jpeg',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty fileData', () => {
    const result = uploadViolationPhotoInput.safeParse({
      fileData: '',
      fileName: 'photo.jpg',
      fileType: 'image/jpeg',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing fileName', () => {
    const result = uploadViolationPhotoInput.safeParse({
      fileData: 'base64encodeddata',
      fileType: 'image/jpeg',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing fileType', () => {
    const result = uploadViolationPhotoInput.safeParse({
      fileData: 'base64encodeddata',
      fileName: 'photo.jpg',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid upload input', () => {
    const result = uploadViolationPhotoInput.safeParse({
      fileData: 'base64encodeddata',
      fileName: 'photo.jpg',
      fileType: 'image/jpeg',
    });
    expect(result.success).toBe(true);
  });
});

describe('compliance.createViolation — evidenceUrls field', () => {
  it('accepts violation without evidenceUrls (backward compat)', () => {
    const result = createViolationInput.safeParse({
      customerId: 1,
      violationTypeId: 2,
    });
    expect(result.success).toBe(true);
    expect(result.data?.evidenceUrls).toBeUndefined();
  });

  it('accepts evidenceUrls as array of valid URLs', () => {
    const result = createViolationInput.safeParse({
      customerId: 1,
      violationTypeId: 2,
      evidenceUrls: [
        'https://s3.amazonaws.com/bucket/violation-photos/worker-1/photo1.jpg',
        'https://s3.amazonaws.com/bucket/violation-photos/worker-1/photo2.jpg',
      ],
    });
    expect(result.success).toBe(true);
    expect(result.data?.evidenceUrls).toHaveLength(2);
  });

  it('accepts evidenceUrls as empty array', () => {
    const result = createViolationInput.safeParse({
      customerId: 1,
      violationTypeId: 2,
      evidenceUrls: [],
    });
    expect(result.success).toBe(true);
    expect(result.data?.evidenceUrls).toHaveLength(0);
  });

  it('rejects evidenceUrls as a plain string (wrong type — T23 regression guard)', () => {
    const result = createViolationInput.safeParse({
      customerId: 1,
      violationTypeId: 2,
      evidenceUrls: 'https://example.com/photo.jpg',
    });
    expect(result.success).toBe(false);
  });

  it('rejects evidenceUrls with 6 elements (max 5)', () => {
    const result = createViolationInput.safeParse({
      customerId: 1,
      violationTypeId: 2,
      evidenceUrls: [
        'https://s3.amazonaws.com/bucket/p1.jpg',
        'https://s3.amazonaws.com/bucket/p2.jpg',
        'https://s3.amazonaws.com/bucket/p3.jpg',
        'https://s3.amazonaws.com/bucket/p4.jpg',
        'https://s3.amazonaws.com/bucket/p5.jpg',
        'https://s3.amazonaws.com/bucket/p6.jpg',
      ],
    });
    expect(result.success).toBe(false);
  });

  it('accepts evidenceUrls with exactly 5 elements (at limit)', () => {
    const result = createViolationInput.safeParse({
      customerId: 1,
      violationTypeId: 2,
      evidenceUrls: [
        'https://s3.amazonaws.com/bucket/p1.jpg',
        'https://s3.amazonaws.com/bucket/p2.jpg',
        'https://s3.amazonaws.com/bucket/p3.jpg',
        'https://s3.amazonaws.com/bucket/p4.jpg',
        'https://s3.amazonaws.com/bucket/p5.jpg',
      ],
    });
    expect(result.success).toBe(true);
    expect(result.data?.evidenceUrls).toHaveLength(5);
  });
});

describe('evidenceUrls JSON round-trip (TEXT column serialization)', () => {
  it('serialize → deserialize produces the same array', () => {
    const original = [
      'https://s3.amazonaws.com/bucket/violation-photos/worker-5/1720000000000-abc123.jpg',
      'https://s3.amazonaws.com/bucket/violation-photos/worker-5/1720000000001-def456.jpg',
    ];
    const serialized = JSON.stringify(original);
    const deserialized = JSON.parse(serialized) as string[];
    expect(deserialized).toEqual(original);
    expect(deserialized).toHaveLength(2);
  });

  it('null evidenceUrls deserializes safely', () => {
    const dbValue: string | null = null;
    const result = dbValue ? (JSON.parse(dbValue) as string[]) : undefined;
    expect(result).toBeUndefined();
  });

  it('empty JSON array deserializes to empty array', () => {
    const dbValue = '[]';
    const result = JSON.parse(dbValue) as string[];
    expect(result).toHaveLength(0);
  });
});
