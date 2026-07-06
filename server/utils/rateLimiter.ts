/**
 * DB-backed rate limiter for login attempts (T42 — Rule #70 closure).
 *
 * Replaces the in-memory Map in adminAuth.ts. Each failed login attempt
 * inserts a row into the `loginAttempts` table. Lockout is determined by
 * counting rows within a rolling 15-minute window.
 *
 * Behavioral note (T42, Note 1 from owner review):
 * The rolling window is STRICTER than the pre-T42 fixed-window-with-reset.
 * Pre-T42: attacker could pace 4 failures every 15+ minutes indefinitely.
 * Post-T42: any 5 failures within any rolling 15-minute period triggers lockout.
 * This is a security improvement, not a regression.
 *
 * Persistence: state survives PM2 restarts (the T42 delivery proof).
 */

import { sql } from 'drizzle-orm';
import { getDb } from '../db';

export const MAX_ATTEMPTS = 5;
export const WINDOW_MINUTES = 15;

/**
 * Returns true if the email is currently locked out.
 * Lockout = 5+ failed attempts within the last 15 minutes.
 */
export async function isLockedOut(email: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const [rows] = await db.execute(sql`
    SELECT COUNT(*) AS cnt
    FROM loginAttempts
    WHERE email = ${email}
      AND attemptedAt > DATE_SUB(NOW(), INTERVAL ${WINDOW_MINUTES} MINUTE)
  `);

  const count = (rows as any)[0]?.cnt ?? 0;
  return Number(count) >= MAX_ATTEMPTS;
}

/**
 * Records a failed login attempt.
 * Prunes old rows for this email (older than WINDOW_MINUTES) before inserting,
 * to prevent unbounded table growth.
 * Returns the current attempt count within the rolling window.
 */
export async function recordFailedAttempt(email: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  // Prune rows outside the rolling window for this email
  await db.execute(sql`
    DELETE FROM loginAttempts
    WHERE email = ${email}
      AND attemptedAt <= DATE_SUB(NOW(), INTERVAL ${WINDOW_MINUTES} MINUTE)
  `);

  // Insert the new failed attempt
  await db.execute(sql`
    INSERT INTO loginAttempts (email) VALUES (${email})
  `);

  // Return the current count within the rolling window
  const [rows] = await db.execute(sql`
    SELECT COUNT(*) AS cnt
    FROM loginAttempts
    WHERE email = ${email}
      AND attemptedAt > DATE_SUB(NOW(), INTERVAL ${WINDOW_MINUTES} MINUTE)
  `);

  return Number((rows as any)[0]?.cnt ?? 1);
}

/**
 * Clears all attempt records for the email on successful login.
 */
export async function clearAttempts(email: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.execute(sql`
    DELETE FROM loginAttempts WHERE email = ${email}
  `);
}
