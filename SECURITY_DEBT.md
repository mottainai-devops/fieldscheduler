# Security Debt — Public Write Procedures

**Created:** T19 (2026-06-29)
**Status:** All procedures below are deferred to the Security Debt Tranche (T20+)

---

## Context

The `workerAuth` router and `workerNotificationsRouter` use `publicProcedure` for all
endpoints because the Flutter mobile app authenticates via Survey App Bearer tokens
stored in device secure storage — NOT via Manus OAuth session cookies. The
`protectedProcedure` middleware checks for a session cookie and would reject all mobile
app requests.

Security for these endpoints is currently handled at the application layer:
- Worker identity is verified via PIN or email+password at login
- Write mutations accept `workerId` (or `routeId`) from the client payload
- The handler uses the client-sent ID as the security constraint (e.g., `WHERE workerId = ?`)

**The risk:** A malicious client can send any `workerId` value. The server trusts it.
This is acceptable today because:
- The mobile app only knows its own `selectedWorkerId` from the supervisorLogin flow
- Real attack scenario requires modifying the mobile client
- The Mottainai supervisor accounts are not high-value targets

**The correct fix (deferred):** Switch to authenticated procedures that derive `workerId`
from the session token rather than the client payload. This requires implementing Bearer
token support in the tRPC middleware first.

---

## Procedures (8 total)

### Original 6 (identified in T14, deferred through T15–T19)

| # | Procedure | Router | Security Constraint | Risk |
|---|-----------|--------|---------------------|------|
| 1 | `markCustomerPicked` | `workerAuth` | `workerId` from client payload | Worker can mark any customer picked |
| 2 | `skipCustomer` | `workerAuth` | `workerId` from client payload | Worker can skip any customer |
| 3 | `markCustomerComplete` | `workerAuth` | `routeId` from client payload (no workerId check) | Any client can complete any route stop |
| 4 | `markCustomerIncomplete` | `workerAuth` | `routeId` from client payload (no workerId check) | Any client can undo any completion |
| 5 | `completeRoute` | `workerAuth` | `routeId` from client payload (no workerId check) | Any client can complete any route |
| 6 | `startRoute` | `workerAuth` | `routeId` from client payload (no workerId check) | Any client can start any route |

### Added in T19 (same shape, same deferred fix)

| # | Procedure | Router | Security Constraint | Risk |
|---|-----------|--------|---------------------|------|
| 7 | `markAsRead` | `workerNotifications` | `workerId` from client payload | Worker can mark any worker's notification as read |
| 8 | `markAllAsRead` | `workerNotifications` | `workerId` from client payload | Worker can mark all notifications read for any worker |

---

## Fix Strategy (deferred to Security Debt Tranche)

1. Implement Bearer token support in the tRPC middleware (`server/_core/trpc.ts`)
2. Create `mobileProcedure` — authenticates via Bearer token, injects `ctx.worker`
3. Replace `publicProcedure` on all 8 procedures with `mobileProcedure`
4. Remove `workerId` from client-sent payloads where it is only used as a security
   constraint (derive from `ctx.worker.id` instead)
5. For `routeId`-only procedures (3–6): add a `ctx.worker.id` ownership check against
   the route's assigned worker before writing

---

## Notes

- `workerAuth.login`, `workerAuth.supervisorLogin`, `workerAuth.verifyPin`,
  `workerAuth.logout` are intentionally `publicProcedure` — they ARE the auth flow.
- `workerAuth.getWorker`, `workerAuth.getRoutesByWorkerId`, etc. are read-only queries —
  lower risk, but should also be migrated when Bearer token support is implemented.
- `workerNotifications.getWorkerNotifications`, `workerNotifications.getUnreadCount` are
  read-only queries — same deferred migration path.
- `workerAuth.createViolation` and `payments.uploadPaymentProof` are also `publicProcedure`
  write mutations but are compliance/evidence writes — add to this list when scoping the
  security debt tranche.
