/**
 * server/utils/pinHashing.ts
 *
 * Shared bcrypt helpers for worker PIN management.
 *
 * T35 (Rule #71 closure): All PIN writes must go through hashPin().
 * The BCRYPT_COST constant is the single point of change if we later
 * increase the cost factor or migrate to argon2.
 *
 * Usage:
 *   import { hashPin, isBcryptHash, verifyPinBcrypt } from '../utils/pinHashing';
 *
 *   // On write (createWorker / updateWorker):
 *   const hashed = await hashPin(plaintext);
 *
 *   // On read (verifyPin):
 *   const valid = await verifyPinBcrypt(input, stored);
 */

import bcrypt from 'bcryptjs';

export const BCRYPT_COST = 12;

/**
 * Hash a plaintext PIN with bcrypt (cost=12).
 * Throws if the input is empty or undefined.
 */
export async function hashPin(plaintext: string): Promise<string> {
  if (!plaintext) throw new Error('PIN cannot be empty');
  return bcrypt.hash(plaintext, BCRYPT_COST);
}

/**
 * Detect whether a stored value is a bcrypt hash.
 * Supports $2a$, $2b$, $2y$ prefixes.
 */
export function isBcryptHash(value: string): boolean {
  return value.startsWith('$2a$') || value.startsWith('$2b$') || value.startsWith('$2y$');
}

/**
 * Verify a PIN input against a stored bcrypt hash.
 * This is the bcrypt-only version — no plaintext fallback.
 * Used by workerAuth.verifyPin (mobile app PIN login).
 *
 * If the stored value is not a bcrypt hash, bcrypt.compare will return false
 * (it will not throw), which is the correct behavior: fail closed.
 */
export async function verifyPinBcrypt(input: string, stored: string): Promise<boolean> {
  return bcrypt.compare(input, stored);
}
