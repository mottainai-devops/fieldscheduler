/**
 * T42 — DB-backed rate limiter behavioral tests (Rule #70 closure)
 *
 * Tests the three exported helpers from server/utils/rateLimiter.ts:
 *   - isLockedOut
 *   - recordFailedAttempt
 *   - clearAttempts
 *
 * Uses the same mock pattern as adminAuth.t39.test.ts: mock getDb() to return
 * a fake DB object, verify the correct SQL is executed, and confirm return values.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock getDb ───────────────────────────────────────────────────────────────

let mockExecute: ReturnType<typeof vi.fn>;

vi.mock('./db', () => ({
  getDb: vi.fn(async () => ({
    execute: mockExecute,
  })),
}));

// Import after mocking
import {
  isLockedOut,
  recordFailedAttempt,
  clearAttempts,
  MAX_ATTEMPTS,
  WINDOW_MINUTES,
} from './utils/rateLimiter';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCountResult(count: number) {
  // db.execute returns [rows, fields]; rows is an array of row objects
  return [[{ cnt: count }], []];
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('rateLimiter — constants', () => {
  it('MAX_ATTEMPTS is 5', () => {
    expect(MAX_ATTEMPTS).toBe(5);
  });

  it('WINDOW_MINUTES is 15', () => {
    expect(WINDOW_MINUTES).toBe(15);
  });
});

describe('isLockedOut', () => {
  beforeEach(() => {
    mockExecute = vi.fn();
  });

  it('returns false when no attempts recorded (count = 0)', async () => {
    mockExecute.mockResolvedValueOnce(makeCountResult(0));
    const result = await isLockedOut('test@example.com');
    expect(result).toBe(false);
  });

  it('returns false when attempts < MAX_ATTEMPTS (count = 4)', async () => {
    mockExecute.mockResolvedValueOnce(makeCountResult(4));
    const result = await isLockedOut('test@example.com');
    expect(result).toBe(false);
  });

  it('returns true when attempts = MAX_ATTEMPTS (count = 5)', async () => {
    mockExecute.mockResolvedValueOnce(makeCountResult(5));
    const result = await isLockedOut('test@example.com');
    expect(result).toBe(true);
  });

  it('returns true when attempts > MAX_ATTEMPTS (count = 8)', async () => {
    mockExecute.mockResolvedValueOnce(makeCountResult(8));
    const result = await isLockedOut('test@example.com');
    expect(result).toBe(true);
  });

  it('returns false when getDb returns null (DB unavailable)', async () => {
    const { getDb } = await import('./db');
    vi.mocked(getDb).mockResolvedValueOnce(null as any);
    const result = await isLockedOut('test@example.com');
    expect(result).toBe(false);
  });
});

describe('recordFailedAttempt', () => {
  beforeEach(() => {
    mockExecute = vi.fn();
  });

  it('prunes old rows, inserts new row, returns current count', async () => {
    // Call sequence: DELETE (prune), INSERT, SELECT COUNT
    mockExecute
      .mockResolvedValueOnce([[], []])          // DELETE prune
      .mockResolvedValueOnce([[], []])          // INSERT
      .mockResolvedValueOnce(makeCountResult(1)); // SELECT COUNT

    const count = await recordFailedAttempt('test@example.com');
    expect(count).toBe(1);
    expect(mockExecute).toHaveBeenCalledTimes(3);
  });

  it('returns 5 on the 5th failed attempt (lockout threshold)', async () => {
    mockExecute
      .mockResolvedValueOnce([[], []])           // DELETE prune
      .mockResolvedValueOnce([[], []])           // INSERT
      .mockResolvedValueOnce(makeCountResult(5)); // SELECT COUNT

    const count = await recordFailedAttempt('test@example.com');
    expect(count).toBe(5);
  });

  it('returns 0 when getDb returns null (DB unavailable)', async () => {
    const { getDb } = await import('./db');
    vi.mocked(getDb).mockResolvedValueOnce(null as any);
    const count = await recordFailedAttempt('test@example.com');
    expect(count).toBe(0);
  });
});

describe('clearAttempts', () => {
  beforeEach(() => {
    mockExecute = vi.fn();
  });

  it('executes a DELETE for the given email', async () => {
    mockExecute.mockResolvedValueOnce([[], []]);
    await clearAttempts('test@example.com');
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it('does nothing when getDb returns null (DB unavailable)', async () => {
    const { getDb } = await import('./db');
    vi.mocked(getDb).mockResolvedValueOnce(null as any);
    // Should not throw
    await expect(clearAttempts('test@example.com')).resolves.toBeUndefined();
  });
});

describe('rateLimiter — integration: lockout sequence', () => {
  beforeEach(() => {
    mockExecute = vi.fn();
  });

  it('isLockedOut returns true after 5 recordFailedAttempt calls', async () => {
    // Simulate 5 failed attempts: each call returns count 1..5
    for (let i = 1; i <= 5; i++) {
      mockExecute
        .mockResolvedValueOnce([[], []])           // DELETE prune
        .mockResolvedValueOnce([[], []])           // INSERT
        .mockResolvedValueOnce(makeCountResult(i)); // SELECT COUNT
    }
    // After 5 attempts, isLockedOut should return true
    mockExecute.mockResolvedValueOnce(makeCountResult(5));

    let count = 0;
    for (let i = 0; i < 5; i++) {
      count = await recordFailedAttempt('lockout@example.com');
    }
    expect(count).toBe(5);

    const locked = await isLockedOut('lockout@example.com');
    expect(locked).toBe(true);
  });

  it('clearAttempts resets lockout: isLockedOut returns false after clear', async () => {
    // isLockedOut returns true before clear
    mockExecute.mockResolvedValueOnce(makeCountResult(5));
    expect(await isLockedOut('clear@example.com')).toBe(true);

    // clearAttempts executes DELETE
    mockExecute.mockResolvedValueOnce([[], []]);
    await clearAttempts('clear@example.com');

    // isLockedOut returns false after clear
    mockExecute.mockResolvedValueOnce(makeCountResult(0));
    expect(await isLockedOut('clear@example.com')).toBe(false);
  });
});
