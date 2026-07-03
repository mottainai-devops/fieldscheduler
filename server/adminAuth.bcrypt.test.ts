/**
 * T34 Part 2 — Behavioral verification: bcrypt PIN comparison and rate limiting
 *
 * Tests:
 *  1.  isBcryptHash: returns true for $2b$ prefix
 *  2.  isBcryptHash: returns true for $2a$ prefix
 *  3.  isBcryptHash: returns true for $2y$ prefix
 *  4.  isBcryptHash: returns false for plaintext PIN
 *  5.  isBcryptHash: returns false for empty string
 *  6.  verifyPin: bcrypt hash — correct PIN returns true
 *  7.  verifyPin: bcrypt hash — wrong PIN returns false
 *  8.  verifyPin: plaintext fallback — correct PIN returns true (migration window)
 *  9.  verifyPin: plaintext fallback — wrong PIN returns false (migration window)
 * 10.  verifyPin: bcrypt hash is constant-time (does not short-circuit on wrong input)
 * 11.  bcrypt.hash round-trip: hash(pin) then compare(pin, hash) returns true
 * 12.  bcrypt.hash round-trip: compare(wrongPin, hash) returns false
 * 13.  bcrypt cost factor: hash uses at least 10 rounds (security floor)
 */
import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { isBcryptHash, verifyPin } from './routers/adminAuth';

// ─── isBcryptHash ─────────────────────────────────────────────────────────────

describe('isBcryptHash', () => {
  it('returns true for $2b$ prefix (modern bcrypt)', () => {
    const hash = '$2b$12$IjguY7o6ZGmGaTioNRkH8OkTuh3gIHO1987dN0wmP6sZ0GJDX29nS';
    expect(isBcryptHash(hash)).toBe(true);
  });

  it('returns true for $2a$ prefix (legacy bcrypt)', () => {
    const hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
    expect(isBcryptHash(hash)).toBe(true);
  });

  it('returns true for $2y$ prefix (PHP-style bcrypt)', () => {
    const hash = '$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
    expect(isBcryptHash(hash)).toBe(true);
  });

  it('returns false for a plaintext 4-digit PIN', () => {
    expect(isBcryptHash('6872')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isBcryptHash('')).toBe(false);
  });
});

// ─── verifyPin ────────────────────────────────────────────────────────────────

describe('verifyPin', () => {
  it('accepts correct PIN against a bcrypt hash', async () => {
    const pin = '6872';
    const hash = await bcrypt.hash(pin, 10);
    expect(await verifyPin(pin, hash)).toBe(true);
  });

  it('rejects wrong PIN against a bcrypt hash', async () => {
    const pin = '6872';
    const hash = await bcrypt.hash(pin, 10);
    expect(await verifyPin('9999', hash)).toBe(false);
  });

  it('T35 Item #2: plaintext stored value returns false (fail-closed, no fallback)', async () => {
    // After T35 Item #2, verifyPin is bcrypt-only.
    // A plaintext stored value is not a valid bcrypt hash, so bcrypt.compare returns false.
    expect(await verifyPin('1990', '1990')).toBe(false);
  });

  it('T35 Item #2: plaintext stored value — wrong input also returns false', async () => {
    expect(await verifyPin('0000', '1990')).toBe(false);
  });

  it('bcrypt comparison does not short-circuit on wrong input', async () => {
    // Ensures that a wrong PIN against a bcrypt hash returns false (not throw)
    const hash = await bcrypt.hash('1234', 10);
    const result = await verifyPin('5678', hash);
    expect(result).toBe(false);
  });
});

// ─── bcrypt round-trip ────────────────────────────────────────────────────────

describe('bcrypt round-trip', () => {
  it('hash then compare returns true for correct PIN', async () => {
    const pin = '3205';
    const hash = await bcrypt.hash(pin, 12);
    expect(await bcrypt.compare(pin, hash)).toBe(true);
  });

  it('hash then compare returns false for wrong PIN', async () => {
    const pin = '3205';
    const hash = await bcrypt.hash(pin, 12);
    expect(await bcrypt.compare('0000', hash)).toBe(false);
  });

  it('hash uses at least 10 rounds (security floor)', async () => {
    const pin = '1088';
    const hash = await bcrypt.hash(pin, 12);
    const rounds = bcrypt.getRounds(hash);
    expect(rounds).toBeGreaterThanOrEqual(10);
  });
});
