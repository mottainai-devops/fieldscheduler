# Fieldscheduler Engagement Record

This file tracks process decisions, silent-failure patterns, and standing rules
established during the engagement. It is the authoritative reference for
"why we do things this way" and must be updated whenever a new pattern is
identified or an existing rule is reinforced.

---

## Silent-Failure Pattern Log

Silent failures are bugs where the system continues operating without surfacing
an error, masking the root cause. Each entry documents the pattern, the
instance, and the rule added to prevent recurrence.

### Pattern #1 — Zoho catch returns error
**Instance:** Zoho sync catch block returned an error object instead of
throwing, causing the caller to treat a failed sync as success.  
**Rule added:** Catch blocks in integration code must either re-throw or
explicitly surface the error to the caller. Never return an error object from
a function whose return type is a success value.

---

### Pattern #2 — LotCache silent fallback
**Instance:** LotCache miss fell back to stale data without logging, causing
workers to operate on outdated lot assignments.  
**Rule added:** Cache misses that fall back to stale data must log a `warn`
with the cache key and staleness duration. Fallbacks are not silent.

---

### Pattern #3 — Offline mode crash on getRouteCustomers
**Instance:** `getRouteCustomers` threw synchronously in offline mode; the
caller had no try/catch, crashing the route detail screen.  
**Rule added:** All DB/network calls in components that may render offline must
be wrapped with explicit error boundaries or try/catch. Offline is a first-class
state, not an edge case.

---

### Pattern #4 — getAccessToken returning wrong shape
**Instance:** `getAccessToken` returned `{ token: string }` but callers
expected a raw string, causing silent `undefined` in Authorization headers.  
**Rule added:** Token helper return types must be explicit (`string`, not
`object`). All callers must have a type assertion or destructuring that would
fail at compile time if the shape changes.

---

### Pattern #5 — Recon cron schema validation swallowed
**Instance:** Zod validation errors in the recon cron job were caught and
logged at `debug` level, causing the job to silently skip invalid records.  
**Rule added:** Schema validation failures in background jobs must be logged
at `error` level and counted. If the failure rate exceeds a threshold, the job
must abort and alert rather than skip silently.

---

### Pattern #6 — Six empty catch blocks
**Instance:** Six catch blocks across the codebase were `catch (e) {}` with no
logging, swallowing errors from route creation, customer sync, and compliance
submission.  
**Rule added:** Empty catch blocks are banned. Every catch must at minimum
`console.error(e)`. PR review must flag any `catch` with an empty body.

---

### Pattern #7 — adminAuth.login + useAuth not raising on role mismatch
**Discovered:** 2026-06-23, during Tranche 5A behavioral verification.

**Instance (two parts):**

**Part A — adminAuth.login never set role.**  
`adminAuth.login` called `upsertUser` without a `role` parameter. Every login
defaulted to `role: "user"` in the `users` table regardless of the worker's
actual role in the `workers` table. The `adminProcedure` gate on
`financial.getMetricsByFieldManager` and `financial.getMetricsByMAF` silently
returned FORBIDDEN to every logged-in user. The UI showed empty data panels
with no error message. The pencil icon for rescheduling (Tranche 5A item c)
was never rendered for any user.

**Fix:** `adminAuth.login` now maps `workers.role` → `users.role`:
- `field_manager` → `admin` (full edit access)
- `supervisor` → `field_manager` (read-heavy, limited edits)
- anything else → `user`

Commit: `d6edae67`

**Part B — @/hooks/useAuth queried a non-existent endpoint.**  
`client/src/hooks/useAuth.tsx` fetched `/api/user` (HTTP 404). The hook
always returned `user: undefined`, making `isAdmin` and `isFieldManager`
permanently `false` on the frontend. No error was thrown or logged; the hook
silently behaved as if the user was unauthenticated.

**Fix:** `useAuth.tsx` rewritten to use `trpc.auth.me.useQuery()`, the same
endpoint used by `RequireAuth` and `DashboardLayout`.

Commit: `790576a3`

**Why it was silent:**  
- `adminProcedure` throws `FORBIDDEN` but the tRPC client surfaces this as
  a query error, which React Query catches and stores in `.error`. The
  `FinancialDashboard` component never checked `.error` — it only checked
  `isLoading`, so the empty state looked like a loading state.
- `useAuth` returning `undefined` is indistinguishable from "not yet loaded"
  in a component that only checks `if (!user)`.

**Rules added (two new rules):**

**Rule 7a — Role checks must warn on silent denial.**  
When a role check fails for a user whose underlying data suggests they *should*
have had access (e.g., `workers.role === 'field_manager'` but `users.role ===
'user'`), the server must log a `warn`:
```
[Auth] Role gate denied user {openId} on {procedure}: users.role={role} but
workers.role={workerRole}. Possible role-mapping bug.
```
Silent denial is the failure mode that hid this bug for the entire lifetime of
the financial dashboard.

**Rule 7b — 404s from internal API calls must never be silently caught.**  
Any `fetch` or tRPC call to an internal endpoint that returns 404 must be
logged at `error` level and surfaced to error tracking. A 404 from an internal
endpoint is always a code bug (wrong path, missing route), not a runtime
condition to handle gracefully.

---

## Standing Rules (Cumulative)

The following rules are active for all future work on this codebase:

| # | Rule | Source |
|---|------|--------|
| 1 | No empty catch blocks. Every catch must at minimum `console.error(e)`. | Pattern #6 |
| 2 | Background-job pattern for endpoints that run >2s. No synchronous long-running handlers. | Phase A close-out |
| 3 | One-shot crons must be flagged in PR review with a comment explaining why they are not recurring. | Phase A close-out |
| 4 | Behavioral verification required for all new features. Code existence is not sufficient evidence. | Phase A close-out |
| 5 | Role checks must log a `warn` when they deny a user whose underlying data suggests they should have had access. | Pattern #7a |
| 6 | 404s from internal API calls must never be silently caught. Log at `error` and surface to error tracking. | Pattern #7b |
| 7 | Token helper return types must be explicit. No `object` wrappers around raw token strings. | Pattern #4 |
| 8 | Cache fallbacks to stale data must log a `warn` with key and staleness duration. | Pattern #2 |

---

## Tranche Close-Out Log

| Tranche | Status | Close date | Notes |
|---------|--------|------------|-------|
| Phase A | Closed | 2026-06-23 | Recycling-bin-backfill decommissioned; normalizeBinType hard-reject confirmed |
| 5A | Closed | 2026-06-23 | All 5 items verified. Ancillary: adminAuth role-mapping fix (d6edae67), useAuth fix (790576a3) |
| 5B | Pending | — | Tariff parity & validation |
