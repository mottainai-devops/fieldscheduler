import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
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
