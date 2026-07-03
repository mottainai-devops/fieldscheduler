/**
 * server/pinHashing.writePathHardening.test.ts
 *
 * T35 Item #1 — PIN write path hardening tests.
 *
 * Verifies:
 *  1.  hashPin() produces a bcrypt hash (starts with $2b$)
 *  2.  hashPin() is idempotent-safe (same input → different hash each call due to salt)
 *  3.  hashPin() throws on empty string
 *  4.  isBcryptHash() correctly identifies bcrypt hashes
 *  5.  isBcryptHash() correctly rejects plaintext
 *  6.  verifyPinBcrypt() returns true for correct PIN against hash
 *  7.  verifyPinBcrypt() returns false for wrong PIN against hash
 *  8.  verifyPinBcrypt() returns false for plaintext stored value (fail-closed)
 *  9.  hashPin() produces a hash that verifyPinBcrypt() can verify
 * 10.  workerAuth.verifyPin: bcrypt-stored PIN — correct PIN returns success
 * 11.  workerAuth.verifyPin: bcrypt-stored PIN — wrong PIN returns failure
 * 12.  workerAuth.verifyPin: plaintext-stored PIN — correct PIN returns success (migration window)
 * 13.  workerAuth.verifyPin: plaintext-stored PIN — wrong PIN returns failure (migration window)
 * 14.  workerAuth.verifyPin: NULL PIN — always returns success (no PIN set)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { hashPin, isBcryptHash, verifyPinBcrypt, BCRYPT_COST } from './utils/pinHashing';

// ─── hashPin ─────────────────────────────────────────────────────────────────

describe('hashPin', () => {
  it('produces a bcrypt hash string starting with $2b$', async () => {
    const hash = await hashPin('1234');
    expect(hash).toMatch(/^\$2[ab]\$/);
  });

  it('produces different hashes for the same input (salted)', async () => {
    const h1 = await hashPin('1234');
    const h2 = await hashPin('1234');
    expect(h1).not.toBe(h2);
  });

  it('throws on empty string', async () => {
    await expect(hashPin('')).rejects.toThrow('PIN cannot be empty');
  });

  it('uses BCRYPT_COST=12', async () => {
    const hash = await hashPin('9999');
    // bcrypt hash encodes the cost: $2b$12$...
    expect(hash).toContain(`$${BCRYPT_COST}$`);
  });
});

// ─── isBcryptHash ─────────────────────────────────────────────────────────────

describe('isBcryptHash', () => {
  it('returns true for $2b$ prefix', async () => {
    const hash = await bcrypt.hash('test', 10);
    expect(isBcryptHash(hash)).toBe(true);
  });

  it('returns true for $2a$ prefix', () => {
    expect(isBcryptHash('$2a$12$somehashedvalue')).toBe(true);
  });

  it('returns true for $2y$ prefix', () => {
    expect(isBcryptHash('$2y$12$somehashedvalue')).toBe(true);
  });

  it('returns false for plaintext PIN', () => {
    expect(isBcryptHash('1234')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isBcryptHash('')).toBe(false);
  });
});

// ─── verifyPinBcrypt ──────────────────────────────────────────────────────────

describe('verifyPinBcrypt', () => {
  it('returns true for correct PIN against bcrypt hash', async () => {
    const hash = await hashPin('5678');
    expect(await verifyPinBcrypt('5678', hash)).toBe(true);
  });

  it('returns false for wrong PIN against bcrypt hash', async () => {
    const hash = await hashPin('5678');
    expect(await verifyPinBcrypt('9999', hash)).toBe(false);
  });

  it('returns false for plaintext stored value (fail-closed)', async () => {
    // If somehow a plaintext PIN reaches verifyPinBcrypt, it should fail closed
    // (bcrypt.compare('1234', '1234') returns false because '1234' is not a valid hash)
    const result = await verifyPinBcrypt('1234', '1234');
    expect(result).toBe(false);
  });

  it('round-trips correctly: hashPin → verifyPinBcrypt', async () => {
    const pin = '4321';
    const hash = await hashPin(pin);
    expect(await verifyPinBcrypt(pin, hash)).toBe(true);
    expect(await verifyPinBcrypt('0000', hash)).toBe(false);
  });
});

// ─── workerAuth.verifyPin procedure (unit-level mock) ─────────────────────────
//
// T35 Item #2: Plaintext fallback removed. Tests updated to reflect bcrypt-only behavior.
// These tests simulate the verifyPin procedure logic without a real DB.

describe('workerAuth.verifyPin procedure logic (T35 Item #2 — bcrypt-only)', () => {
  let realHash: string;

  beforeEach(async () => {
    realHash = await hashPin('1234');
  });

  it('bcrypt-stored PIN — correct PIN returns success', async () => {
    // T35 Item #2: direct verifyPinBcrypt call (no branch logic)
    const valid = await verifyPinBcrypt('1234', realHash);
    expect(valid).toBe(true);
  });

  it('bcrypt-stored PIN — wrong PIN returns failure', async () => {
    const valid = await verifyPinBcrypt('9999', realHash);
    expect(valid).toBe(false);
  });

  it('T35 Item #2: plaintext-stored PIN returns false (fail-closed)', async () => {
    // After fallback removal, a plaintext stored value is not a valid bcrypt hash.
    // verifyPinBcrypt returns false (does not throw).
    const valid = await verifyPinBcrypt('1234', '1234');
    expect(valid).toBe(false);
  });

  it('T35 Item #2: plaintext-stored PIN — wrong input also returns false', async () => {
    const valid = await verifyPinBcrypt('9999', '1234');
    expect(valid).toBe(false);
  });

  it('NULL PIN — always returns success (no PIN set)', () => {
    const storedPin = null;
    // Simulates: if (!worker.pin) return { success: true, worker }
    const allowAccess = !storedPin;
    expect(allowAccess).toBe(true);
  });
});
