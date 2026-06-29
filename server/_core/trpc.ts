import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import * as fieldWorkerDb from '../fieldWorkerDb';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

// ─────────────────────────────────────────────────────────────────────────────
// T14 Item 3 — Four-tier procedure model
//
// Tier hierarchy (most → least privileged):
//
//   superadminProcedure  → superadmin only
//     Destructive or owner-level operations: delete worker, delete customer,
//     Zoho sync, system config, user role management.
//
//   adminProcedure       → superadmin + admin
//     Head-of-operations tier: create/update workers, manage MAF tags,
//     send payment reminders, create violation types, financial reporting.
//
//   fieldManagerProcedure → superadmin + admin + field_manager
//     Field operations accessible to all admin-tier roles: create routes,
//     view customers, calendar management, compliance reads.
//
//   protectedProcedure   → any authenticated user (unchanged)
//   publicProcedure      → no auth required (unchanged)
//
// Role values in users.role (T14 Item 1 enum):
//   'superadmin' | 'admin' | 'field_manager' | 'supervisor' | 'user'
//
// Supervisor accounts are rejected at web app login (adminAuth.ts).
// They never reach any of these procedures via the web admin.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * superadminProcedure — superadmin only.
 * Owner-level destructive or configuration operations.
 */
export const superadminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== 'superadmin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  }),
);

/**
 * adminProcedure — superadmin + admin.
 * Head-of-operations tier: worker management, MAF tags, financial ops.
 */
export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    const hasAccess =
      ctx.user?.role === 'superadmin' ||
      ctx.user?.role === 'admin';
    if (!ctx.user || !hasAccess) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  }),
);

/**
 * fieldManagerProcedure — superadmin + admin + field_manager.
 * Field operations: route creation, customer views, calendar, compliance reads.
 */
export const fieldManagerProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    const hasAccess =
      ctx.user?.role === 'superadmin' ||
      ctx.user?.role === 'admin' ||
      ctx.user?.role === 'field_manager';
    if (!ctx.user || !hasAccess) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// T20 — workerProcedure: Bearer token authentication for mobile app procedures
//
// The Flutter fieldscheduler-mobile app sends `Authorization: Bearer <surveyToken>`
// on every request (see api_service.dart _getHeaders()). This middleware reads that
// token, validates it against the Survey App /users/me endpoint, looks up the
// corresponding shadow worker row, and sets ctx.workerId + ctx.workerSurveyAppUserId.
//
// Token cache (in-process Map, 5-minute TTL):
//   - Key: raw token string
//   - Value: { workerId: number; surveyAppUserId: string; expiresAt: number }
//   - On cache hit: check expiresAt. If expired, re-validate.
//   - On Survey App 401: do NOT cache. Propagate UNAUTHORIZED to caller.
//   - Process-local only. Each instance caches independently (fine for current scale).
//   - No explicit logout invalidation. 5-minute window is acceptable risk.
//
// Owner decision (T20 Decision 3): cache approved with these exact semantics.
// ─────────────────────────────────────────────────────────────────────────────

const SURVEY_API = process.env.SURVEY_API_URL || 'https://upwork.kowope.xyz';
const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type TokenCacheEntry = {
  workerId: number;
  surveyAppUserId: string;
  expiresAt: number;
};

const tokenCache = new Map<string, TokenCacheEntry>();

async function resolveWorkerFromToken(token: string): Promise<{ workerId: number; surveyAppUserId: string }> {
  const now = Date.now();

  // Cache hit
  const cached = tokenCache.get(token);
  if (cached && now < cached.expiresAt) {
    console.log('[token cache] HIT — workerId:', cached.workerId);
    return { workerId: cached.workerId, surveyAppUserId: cached.surveyAppUserId };
  }

  if (cached) {
    console.log('[token cache] MISS — TTL expired for workerId:', cached.workerId);
  } else {
    console.log('[token cache] MISS — token not in cache');
  }

  // Validate against Survey App
  let surveyUser: { id: string | number } | null = null;
  try {
    const res = await fetch(`${SURVEY_API}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 401) {
      // Do NOT cache rejections (Decision 3e)
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Survey App token rejected' });
    }
    if (!res.ok) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: `Survey App /users/me returned ${res.status}` });
    }
    const data = await res.json() as any;
    surveyUser = data?.user ?? data;
  } catch (err: any) {
    if (err instanceof TRPCError) throw err;
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Survey App unreachable during token validation' });
  }

  if (!surveyUser?.id) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Survey App /users/me returned no user id' });
  }

  const surveyAppUserId = String(surveyUser.id);
  const worker = await fieldWorkerDb.getWorkerBySurveyAppUserId(surveyAppUserId);
  if (!worker) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: `No shadow worker found for surveyAppUserId ${surveyAppUserId}` });
  }

  // Store in cache
  tokenCache.set(token, { workerId: worker.id, surveyAppUserId, expiresAt: now + TOKEN_CACHE_TTL_MS });
  console.log('[token cache] STORE — workerId:', worker.id, 'expires in 5m');

  return { workerId: worker.id, surveyAppUserId };
}

/**
 * workerProcedure — T20 mobile app authentication tier.
 *
 * Validates the Survey App Bearer token from the Authorization header.
 * Sets ctx.workerId and ctx.workerSurveyAppUserId for use in handlers.
 * Replaces publicProcedure for all procedures in SECURITY_DEBT.md.
 *
 * Mobile client: fieldscheduler-mobile already sends Authorization: Bearer <token>
 * on every request (no mobile rebuild required).
 */
export const workerProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    const authHeader = ctx.req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' });
    }
    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Empty Bearer token' });
    }
    const { workerId, surveyAppUserId } = await resolveWorkerFromToken(token);
    return next({
      ctx: {
        ...ctx,
        workerId,
        workerSurveyAppUserId: surveyAppUserId,
      },
    });
  }),
);

/**
 * Rule 28 — tRPC drift-observability middleware
 *
 * In non-production environments, logs any input keys that are NOT defined in the
 * procedure's Zod schema. These keys are silently stripped by tRPC (Zod .strip()
 * default), so without this middleware, payload drift goes undetected until
 * operational damage accumulates.
 *
 * Usage: wrap any procedure with .use(driftLogger("procedureName", schema))
 *   e.g. protectedProcedure.use(driftLogger("createWorker", createWorkerSchema)).input(...)
 *
 * Production behaviour: no-op (returns immediately to avoid log noise and latency).
 * Development/staging: logs [tRPC drift] warnings to stdout.
 *
 * Note: uses getRawInput() (tRPC v11 async API) to read the raw payload before
 * Zod strips unknown keys.
 *
 * History: four silent-stripping incidents documented in this engagement:
 *   Pattern #15 (assignedWorkerId vs workerId), AddCustomer.tsx drift,
 *   ClusterManagement.tsx ISO timestamp drift, Pattern #22 (homeDepotLat/Lng on updateWorker).
 */
export function driftLogger(procedureName: string, schema: { shape?: Record<string, unknown> }) {
  return t.middleware(async (opts) => {
    if (process.env.NODE_ENV !== 'production') {
      try {
        const rawInput = await opts.getRawInput();
        if (rawInput && typeof rawInput === 'object' && !Array.isArray(rawInput)) {
          const inputKeys = Object.keys(rawInput as Record<string, unknown>);
          const schemaKeys = schema.shape ? Object.keys(schema.shape) : [];
          const unknownKeys = inputKeys.filter(k => !schemaKeys.includes(k));
          if (unknownKeys.length > 0) {
            console.warn(
              `[tRPC drift] ${procedureName} received unknown keys that will be silently stripped: ` +
              `${unknownKeys.join(', ')}. ` +
              `Known keys: ${schemaKeys.join(', ')}.`
            );
          }
        }
      } catch {
        // getRawInput can throw if input is not yet available; silently skip
      }
    }
    return opts.next();
  });
}
