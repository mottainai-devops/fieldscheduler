# Security Debt — Public Write Procedures

**Created:** T19 (2026-06-29)
**Resolved:** T20 (2026-06-29)
**Status:** ✅ ALL PROCEDURES RESOLVED — `workerProcedure` Bearer token middleware implemented in commit `055f90a0`

---

## Resolution Summary (T20)

All 12 procedures below were migrated from `publicProcedure` to `workerProcedure` in commit `055f90a0`.

`workerProcedure` validates the `Authorization: Bearer <token>` header against the Survey App (`/users/me`), derives `workerId` and `workerSurveyAppUserId` server-side, and injects them into `ctx`. Client-sent identity fields have been removed from all Zod schemas.

**Negative verification (13/13 PASS):** All 13 procedures return HTTP 401 without a Bearer token. Gate is closed.

**Positive verification:** Deferred — requires a real Survey App Bearer token for a worker with a populated `surveyAppUserId` in the DB. To be verified on first mobile app use after production workers are registered in the Survey App.

---

## Context (Historical)

The `workerAuth` router and `workerNotificationsRouter` used `publicProcedure` for all
endpoints because the Flutter mobile app authenticates via Survey App Bearer tokens
stored in device secure storage — NOT via Manus OAuth session cookies. The
`protectedProcedure` middleware checks for a session cookie and would reject all mobile
app requests.

Security was handled at the application layer:
- Worker identity was verified via PIN or email+password at login
- Write mutations accepted `workerId` (or `routeId`) from the client payload
- The handler used the client-sent ID as the security constraint

**The risk (now resolved):** A malicious client could send any `workerId` value. The server trusted it.

---

## Procedures Resolved (12 total)

### Original 6 (identified T14, resolved T20)

| # | Procedure | Router | Old Constraint | Fix |
|---|-----------|--------|----------------|-----|
| 1 | `markCustomerPicked` | `workerAuth` | `workerId` from client | `ctx.workerId` from Bearer token |
| 2 | `skipCustomer` | `workerAuth` | `workerId` from client | `ctx.workerId` from Bearer token |
| 3 | `markCustomerComplete` | `workerAuth` | `routeId` only (no identity check) | `workerProcedure` required |
| 4 | `markCustomerIncomplete` | `workerAuth` | `routeId` only (no identity check) | `workerProcedure` required |
| 5 | `completeRoute` | `workerAuth` | `routeId` only (no identity check) | `workerProcedure` required |
| 6 | `startRoute` | `workerAuth` | `routeId` only (no identity check) | `workerProcedure` required |

### Added T19, resolved T20

| # | Procedure | Router | Old Constraint | Fix |
|---|-----------|--------|----------------|-----|
| 7 | `markAsRead` | `workerNotifications` | `workerId` from client | `ctx.workerId` from Bearer token |
| 8 | `markAllAsRead` | `workerNotifications` | `workerId` from client | `ctx.workerId` from Bearer token |

### Identified during T20 investigation, resolved T20

| # | Procedure | Router | Old Constraint | Fix |
|---|-----------|--------|----------------|-----|
| 9 | `createLinkageRequest` | `workerAuth` | `requestedBy` from client | `ctx.workerId` from Bearer token |
| 10 | `createViolation` | `workerAuth` | `reportedBy` from client | `ctx.workerId` from Bearer token |
| 11 | `setWebhookPreference` | `workerAuth` | `workerId` from client | `ctx.workerId` from Bearer token |
| 12 | `deleteCustomerNote` | `workerAuth` | No identity check at all | `workerProcedure` required |

---

## Notes (Post-Resolution)

- `workerAuth.login`, `workerAuth.supervisorLogin`, `workerAuth.verifyPin`, `workerAuth.logout` remain `publicProcedure` — they ARE the auth flow.
- `workerAuth.getWorker`, `workerAuth.getRoutesByWorkerId`, and other read-only queries remain `publicProcedure` — lower risk; migration deferred to T21+.
- `payments.uploadPaymentProof` remains `publicProcedure` — T19 Item 2b deferred; owner decision needed on amount/paymentMethod fields.
- `addCustomerNote` was also resolved in T20 (workerId derived from ctx) — not in the original 8 but fixed as part of the same sweep.
