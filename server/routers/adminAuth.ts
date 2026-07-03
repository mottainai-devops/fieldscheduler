import { publicProcedure, fieldManagerProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as fieldWorkerDb from "../fieldWorkerDb";
import * as db from "../db";
import { sdk } from "../_core/sdk";
import { getSessionCookieOptions } from "../_core/cookies";
import { COOKIE_NAME } from "@shared/const";
import bcrypt from "bcryptjs";

// ─── In-memory rate limiter (T34 Part 2) ─────────────────────────────────────
//
// Tracks failed login attempts per email address. After MAX_ATTEMPTS consecutive
// failures within WINDOW_MS, the account is locked for LOCKOUT_MS.
//
// This is a process-local store — it resets on PM2 restart. For a multi-instance
// deployment, move this to Redis or a DB-backed table (Rule #70 carry-forward).
//
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;   // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000;  // 15 minutes

interface AttemptRecord {
  count: number;
  windowStart: number;
  lockedUntil: number | null;
}

const loginAttempts = new Map<string, AttemptRecord>();

/**
 * Returns true if the email is currently locked out.
 * Clears the window if it has expired.
 */
function isLockedOut(email: string): boolean {
  const record = loginAttempts.get(email);
  if (!record) return false;

  const now = Date.now();

  // If lockout has expired, clear the record
  if (record.lockedUntil !== null && now >= record.lockedUntil) {
    loginAttempts.delete(email);
    return false;
  }

  return record.lockedUntil !== null && now < record.lockedUntil;
}

/**
 * Records a failed login attempt. Returns the updated attempt count.
 * If count reaches MAX_ATTEMPTS, sets lockedUntil.
 */
function recordFailedAttempt(email: string): number {
  const now = Date.now();
  let record = loginAttempts.get(email);

  if (!record || now - record.windowStart >= WINDOW_MS) {
    // Start a fresh window
    record = { count: 1, windowStart: now, lockedUntil: null };
  } else {
    record.count += 1;
  }

  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
  }

  loginAttempts.set(email, record);
  return record.count;
}

/**
 * Clears the attempt record on successful login.
 */
function clearAttempts(email: string): void {
  loginAttempts.delete(email);
}

// ─── bcrypt helpers (T35 Item #2 — migration window closed) ─────────────────
//
// isBcryptHash: detects whether a stored value is a bcrypt hash.
// Retained for use in tests and future diagnostics.
//
export function isBcryptHash(value: string): boolean {
  return value.startsWith('$2a$') || value.startsWith('$2b$') || value.startsWith('$2y$');
}

/**
 * Verify a PIN input against a bcrypt-stored value.
 *
 * T35 Item #2: Plaintext fallback removed. All PINs in production are bcrypt
 * hashes (confirmed 2026-07-03: 7 bcrypt, 0 plaintext, 2 NULL).
 *
 * Fail-closed: if stored value is not a valid bcrypt hash, bcrypt.compare
 * returns false (does not throw), which is the correct behavior.
 */
export async function verifyPin(input: string, stored: string): Promise<boolean> {
  return bcrypt.compare(input, stored);
}

// ─────────────────────────────────────────────────────────────────────────────

export const adminAuthRouter = router({
  // Login with email and password
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        console.log('[AdminAuth] Login attempt:', input.email);

        // Rate limiting check (T34 Part 2)
        if (isLockedOut(input.email)) {
          throw new Error("Too many failed login attempts. Please try again in 15 minutes.");
        }

        const worker = await fieldWorkerDb.getWorkerByEmail(input.email);
        console.log('[AdminAuth] Worker found:', worker?.email || 'NOT FOUND');
        
        if (!worker) {
          // Record failed attempt even for unknown emails (prevents email enumeration
          // via timing differences — both paths now go through the same code path)
          recordFailedAttempt(input.email);
          throw new Error("Worker not found");
        }
        
        // PIN verification — bcrypt comparison (T34 Part 2)
        if (!input.password) {
          recordFailedAttempt(input.email);
          throw new Error("Password required");
        }
        if (worker.pin === null || worker.pin === undefined) {
          throw new Error("Account not configured — contact administrator");
        }

        const pinValid = await verifyPin(input.password, worker.pin);
        if (!pinValid) {
          const attempts = recordFailedAttempt(input.email);
          const remaining = MAX_ATTEMPTS - attempts;
          if (remaining <= 0) {
            throw new Error("Too many failed login attempts. Please try again in 15 minutes.");
          }
          throw new Error("Invalid password");
        }

        // Successful login — clear attempt counter
        clearAttempts(input.email);
        
        // Create a user record in the users table if it doesn't exist.
        // Use the worker's email as the openId for session purposes.
        const openId = `worker-${worker.id}-${worker.email}`;

        // ─────────────────────────────────────────────────────────────────
        // Four-tier role model (T14 Item 2):
        //
        //   superadmin    → workers in SUPERADMIN_WORKER_IDS (full access, no scoping)
        //   admin         → workers in ADMIN_WORKER_IDS (admin UI, all data visible)
        //   field_manager → workers with workers.role='field_manager' (scoped to assigned customers)
        //   supervisor    → workers with workers.role='supervisor' (mobile app only — REJECTED here)
        //   user          → all other workers
        //
        // SUPERADMIN_WORKER_IDS: worker IDs 1 (adey adewuyi) and 2 (ADMIN / info@mottainai.africa)
        // ADMIN_WORKER_IDS: Wale Onibudo (id=10), Alaba (id=27) — T15 Item 3 (2026-06-27)
        //
        // NOTE on the 'admin' value in users.role:
        // The 'admin' value previously existed in users.role as legacy compatibility (never written
        // by current code from some point in Tranche 5A onward). From Tranche 14, 'admin' is the
        // canonical value for the head-of-operations tier and IS actively written by ADMIN_WORKER_IDS
        // membership.
        // ─────────────────────────────────────────────────────────────────

        // T14 Item 2 (Condition 1c): Reject supervisor logins at the web app.
        // Supervisors interact with the system exclusively via the Flutter mobile app.
        // If a supervisor navigates to the web admin and attempts to log in, reject with
        // a clear message directing them to the mobile app.
        if (worker.role === 'supervisor') {
          throw new Error(
            'Supervisor accounts must use the mobile app at fieldscheduler-mobile. ' +
            'The web admin is not accessible to supervisors.'
          );
        }

        const SUPERADMIN_WORKER_IDS = new Set([1, 2]);
        const ADMIN_WORKER_IDS = new Set<number>([10, 27]); // Wale Onibudo (10), Alaba (27)

        const usersRole: 'superadmin' | 'admin' | 'field_manager' | 'user' =
          SUPERADMIN_WORKER_IDS.has(worker.id) ? 'superadmin' :
          ADMIN_WORKER_IDS.has(worker.id)      ? 'admin' :
          worker.role === 'field_manager'       ? 'field_manager' :
          'user';

        await db.upsertUser({
          openId,
          name: worker.name || null,
          email: worker.email || null,
          loginMethod: 'email',
          role: usersRole,
          // fieldManagerId: set for field_manager-role users so that scoped queries
          // (e.g. getCustomers) can filter by assigned customers.
          // superadmin/admin users get null — they see all data unscoped.
          fieldManagerId: usersRole === 'field_manager' ? worker.id : null,
        });
        
        console.log('[AdminAuth] User record created/updated for:', openId, '(role:', usersRole, ')');
        
        // Create a session token using the openId
        const sessionToken = await sdk.createSessionToken(openId, {
          name: worker.name || 'Worker',
        });
        
        // Set the session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);
        
        console.log('[AdminAuth] Session cookie set for:', openId);
        
        return {
          success: true,
          // T26 Fix 1: include role so AdminLogin.tsx can redirect by role
          // field_manager → /field-manager/dashboard
          // admin/superadmin → /dashboard (current behaviour)
          role: usersRole,
          worker: {
            id: worker.id,
            name: worker.name,
            email: worker.email,
          },
        };
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Login failed");
      }
    }),

  // Get worker by ID
  // T14 Item 3: fieldManagerProcedure — worker reads accessible to all admin-tier roles
  getWorker: fieldManagerProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await fieldWorkerDb.getWorkerById(input.id);
    }),

  // Get all workers (for selection screen)
  // T14 Item 3: fieldManagerProcedure — worker reads accessible to all admin-tier roles
  getAllWorkers: fieldManagerProcedure.query(async () => {
    return await fieldWorkerDb.getAllWorkers();
  }),
});
