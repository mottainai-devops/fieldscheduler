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

### Pattern #8 — Missing data write that role check depends on
**Discovered:** 2026-06-23, during P1/P2 pre-5B verification.

**Instance:** `fieldWorker.getCustomers` was gated on `ctx.user.role === 'field_manager'`
to scope customers to a field manager's own assignments. However, `adminAuth.login`
never wrote the `fieldManagerId` column to the `users` table — the column did not
exist in the production schema. Even after the column was added (P1 fix), the
scoping still failed because the role check used the wrong value: `adminAuth.login`
maps `workers.role='field_manager'` → `users.role='admin'`, so
`ctx.user.role === 'field_manager'` never matched for Bukola.

**Two sub-failures:**
1. The `fieldManagerId` column was not written at all (P1 fix: added column +
   `upsertUser` write + deploy.yml inline migration).
2. The role check used the wrong field (`users.role`) instead of the data field
   that was actually populated (`users.fieldManagerId`).

**Fix:** `getCustomers` now checks `ctx.user.fieldManagerId !== null` (the data
field that is actually written) rather than `ctx.user.role === 'field_manager'`
(a derived value that is aliased differently by the login path).

Commit: `59d30506`

**Rule added (Rule 9):**

**Rule 9 — Coupled-data integrity: write the field wherever the entity is created or updated.**  
When a query or access-control check depends on a data field (e.g. `fieldManagerId`),
that field must be written in *every* code path that creates or updates the entity
(login, registration, admin edit, import). A check that depends on a field that is
never written is a silent always-fail. Additionally, the check must use the field
that is actually written, not a derived or aliased value that may differ across
login paths.

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
| 9 | When a check depends on a data field, write that field in every create/update path. Use the field that is actually written, not a derived alias. | Pattern #8 |

---

## Tranche Close-Out Log

| Tranche | Status | Close date | Notes |
|---------|--------|------------|-------|
| Phase A | Closed | 2026-06-23 | Recycling-bin-backfill decommissioned; normalizeBinType hard-reject confirmed |
| 5A | Closed | 2026-06-23 | All 5 items verified. Ancillary: adminAuth role-mapping fix (d6edae67), useAuth fix (790576a3) |
| 5B | Pending | — | Tariff parity & validation |

---

### Pattern #9 — Role-alias scoping bypass: admin-role users see 0 rows

**Discovered:** 2026-06-24, during Dashboard 0-customers investigation (Tranche 5B close-out).

**Instance:** `fieldWorker.getCustomers` was updated in Pattern #8 to check
`ctx.user.fieldManagerId !== null` instead of `ctx.user.role === 'field_manager'`.
This correctly scoped supervisors (users.role='field_manager') to their own
customers. However, it also scoped **admin-role users** (field_manager workers
mapped to users.role='admin' by `adminAuth.login`) to their own customers —
because `fieldManagerId` is set for all workers, including admins.

Worker id 1 (`adeyadewuyi@gmail.com`) has `workers.role='field_manager'`, which
maps to `users.role='admin'` and `users.fieldManagerId=1`. With the Pattern #8
fix, `getCustomers` saw `fieldManagerId=1` and scoped to customers with
`fieldManager=1` — returning 0 rows because no customers are assigned to worker 1.

**Fix:** The scoping condition is now:
```ts
const isScoped = ctx.user.fieldManagerId && ctx.user.role !== 'admin';
```
Admin-role users (full UI access) see all customers regardless of `fieldManagerId`.
Supervisor-role users (scoped access) see only their assigned customers.

Commit: `d94540ff`

**Rule added (Rule 10):**

**Rule 10 — Scoping guards must be paired with an admin-bypass clause.**  
When a query is scoped by a data field (e.g. `fieldManagerId`), the guard must
also check that the user is not an admin-level role. Admin users must always see
the full dataset. The pattern is:
```ts
const isScoped = ctx.user.scopingField && ctx.user.role !== 'admin';
```
A scoping guard without an admin-bypass will silently return 0 rows for admin
accounts whose `scopingField` happens to be set but has no matching data.

---

### Pattern #10 — Load-bearing fallback removal without data backfill

**Discovered:** 2026-06-24, during Item 4 (building_id fallback) analysis (Tranche 5B).

**Instance:** The `_buildingId` getter in `pickup_submission_screen.dart` fell back
to `mafCode` when `buildingId` was null. The mafCode fallback was load-bearing:
the FieldScheduler `customers` table has 229 customers (3%) with null `buildingId`,
and 5,439 customers (77%) whose `buildingId` is in a non-canonical shape (e.g.,
`TKB-052`, `SAY-076`, `CUM-415`) that does not match the ArcGIS composite pattern.

Removing the mafCode fallback without first populating `buildingId` in the
FieldScheduler database would have caused submission failures for ~80% of customers.

**FieldScheduler buildingId shape audit (2026-06-24):**

| Shape | Count | % | Example |
|-------|-------|---|---------|
| Null/empty | 229 | 3% | — |
| TKB-XXX | 1,086 | 15% | `TKB-052` |
| MOT-XXX (mafCode as buildingId) | 268 | 4% | `MOT-027` |
| Other (SAY, CUM, etc.) | 5,439 | 77% | `SAY-076`, `CUM-415` |
| Composite ArcGIS pattern | 0 | 0% | — |
| **Total** | **7,022** | | |

**Fix (two-phase):**
- Phase 4a (data): Populate `buildingId` in FieldScheduler from the Mottainai
  platform CustomerData records. The canonical `buildingId` is the composite
  ArcGIS string (e.g., `"9591 LASIKA06 006"`). The current non-canonical shapes
  (TKB, SAY, CUM) are lot-code abbreviations that must be resolved against the
  Mottainai platform before the mafCode fallback can be removed.
- Phase 4b (code): Remove the mafCode fallback **only after** Phase 4a is complete
  and verified. Commit `b91e2c8` (Item 4 code change) is staged but must not be
  deployed until Phase 4a data sync is confirmed.

**Rule added (Rule 11):**

**Rule 11 — Load-bearing fallbacks must be documented before removal.**  
Before removing any fallback (e.g., `?? mafCode`, `|| 'medium'`, `|| 'other'`),
audit the production data to determine what percentage of records would be affected
if the fallback were absent. If >1% of records depend on the fallback, the removal
must be preceded by a data backfill that eliminates the dependency. Document the
audit results in the PR description.

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
| 9 | When a check depends on a data field, write that field in every create/update path. Use the field that is actually written, not a derived alias. | Pattern #8 |
| 10 | Scoping guards must include an admin-bypass clause. Admin-role users must always see the full dataset. | Pattern #9 |
| 11 | Load-bearing fallbacks must be audited before removal. If >1% of records depend on the fallback, backfill the data first. | Pattern #10 |

---

## Tranche Close-Out Log

| Tranche | Status | Close date | Notes |
|---------|--------|------------|-------|
| Phase A | Closed | 2026-06-23 | Recycling-bin-backfill decommissioned; normalizeBinType hard-reject confirmed |
| 5A | Closed | 2026-06-23 | All 5 items verified. Ancillary: adminAuth role-mapping fix (d6edae67), useAuth fix (790576a3) |
| 5B | Partially closed | 2026-06-24 | Items 1/1b/2/3/5 delivered. Item 4 split into 4a (data backfill, pending) + 4b (code, staged). Dashboard 0-customers fixed (d94540ff). |

---

### Pattern #11 — Role enum aliasing without a third tier

**Discovered:** 2026-06-24, during Dashboard 0-customers fix (Tranche 5B addendum).

**Instance:** The `adminAuth.login` role mapping used a two-tier model:
- `workers.role='field_manager'` → `users.role='admin'`
- `workers.role='supervisor'` → `users.role='field_manager'`

This collapsed two semantically distinct worker types (system admins and route
field managers) into the same `users.role='admin'` value. When a scoping guard
was added to bypass scoping for `role='admin'`, it bypassed scoping for ALL
field_manager workers — including Bukola (who should be scoped to her 2,042
customers) and adey (who should see all 7,022).

**Root cause:** The two-tier model assumed `admin` meant "no scoping" and
`field_manager` meant "scoped." But the role mapping made all field_manager
workers into `admin` users, so the scoping guard could not distinguish them.

**Fix:** Three-tier model:
- `SYSTEM_ADMIN_WORKER_IDS = [1, 2]` → `users.role='system_admin'`, `fieldManagerId=null`
- All other `field_manager` workers → `users.role='field_manager'`, `fieldManagerId=worker.id`
- `adminProcedure` accepts both `system_admin` and `field_manager`
- `getCustomers` scopes by `fieldManagerId` presence (only set for field_manager-role users)

**Behavioral trace (2026-06-24, commit 3208e048):**

| User | Role | fieldManagerId | customerCount | Expected | Pass |
|------|------|----------------|---------------|----------|------|
| adey (worker 1) | system_admin | null | 7,022 | all | ✓ |
| info@mottainai (worker 2) | system_admin | null | 7,022 | all | ✓ |
| Bukola (worker 8) | field_manager | 8 | 2,042 | scoped | ✓ |
| Halleluyah (worker 7) | field_manager | 7 | 2,112 | scoped | ✓ |
| Juwon (worker 9) | field_manager | 9 | 1,847 | scoped | ✓ |

**Rule added (Rule 12):**

---

### Pattern #12 — Schema migration not applied to production DB

**Discovered:** 2026-06-24, during three-tier role model implementation.

**Instance:** `drizzle/schema.ts` was updated to include `system_admin` in the
`users.role` enum. The code was committed and deployed. But `pnpm db:push`
requires an interactive TTY and could not be run in the sandbox. The production
database still had the old enum, so `adminAuth.login` failed with a MySQL error
when trying to insert `role='system_admin'`.

**Fix:** Added `runSystemAdminRoleMigration()` as an idempotent startup migration
(same pattern as `runSupervisorRoleMigration`). The migration runs `MODIFY COLUMN`
on every server startup, which is a no-op if the enum already contains `system_admin`.

**Rule added (Rule 13):**

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
| 9 | When a check depends on a data field, write that field in every create/update path. Use the field that is actually written, not a derived alias. | Pattern #8 |
| 10 | Scoping guards must include an admin-bypass clause. Admin-role users must always see the full dataset. | Pattern #9 |
| 11 | Load-bearing fallbacks must be audited before removal. If >1% of records depend on the fallback, backfill the data first. | Pattern #10 |
| 12 | When a role enum has ≥3 semantically distinct access levels, use ≥3 distinct enum values. Never alias two different access levels to the same role string. | Pattern #11 |
| 13 | Every schema change that adds an enum value must be accompanied by an idempotent startup migration. `pnpm db:push` is not sufficient for production deployments that lack interactive TTY access. | Pattern #12 |

---

## Tranche Close-Out Log

| Tranche | Status | Close date | Notes |
|---------|--------|------------|-------|
| Phase A | Closed | 2026-06-23 | Recycling-bin-backfill decommissioned; normalizeBinType hard-reject confirmed |
| 5A | Closed | 2026-06-23 | All 5 items verified. Ancillary: adminAuth role-mapping fix (d6edae67), useAuth fix (790576a3) |
| 5B | Partially closed | 2026-06-24 | Items 1/1b/2/3/5 delivered. Item 4 split into 4a (data backfill, pending) + 4b (code, staged). Three-tier role model implemented (3208e048). All 5 users pass behavioral trace. |

---

### Pattern #13 — Feature partially shipped: deprecation claimed at backend, client never updated

**Discovered:** 2026-06-24, during Tranche 5B Survey App audit.

**Instance:** `120 LITRE WHEELIE BIN` was deprecated in Phase A. The deprecation
was claimed as complete: `normalizeBinType.js` rejects it at the backend, and the
FieldScheduler mobile app was updated to the canonical 6-entry list. However, the
Survey App (`mottainai-survey-app`) was never updated. Both `pickup_form_screen.dart`
(v1 legacy) and `pickup_form_screen_v2.dart` (active screen, routed from
`home_screen.dart`) still contained `'120 LITRE WHEELIE BIN'` in `_binTypes`.

This is the same shape as Patterns #7–12: a feature is partially shipped, the
incomplete portion is hidden by framing the work as "deprecated" or "fixed" without
verifying every client surface.

**Clients audited for 120L status (2026-06-24):**

| Client | File | Status before fix |
|--------|------|-------------------|
| `mottainai-platform-backend` | `normalizeBinType.js` | ✓ Removed (Phase A) |
| `fieldscheduler-mobile` | `pickup_submission_screen.dart` | ✓ Removed (Tranche 5B Item 5) |
| `mottainai-admin-dashboard` | `FixedBilling.tsx` + `fixedBilling.ts` | ✓ Removed (Tranche 5B Item 5) |
| `mottainai-survey-app` | `pickup_form_screen_v2.dart` (active) | ✗ **Still present — Phase A regression** |
| `mottainai-survey-app` | `pickup_form_screen.dart` (v1 legacy) | ✗ **Still present — Phase A regression** |

**Fix (2026-06-24):** Removed `'120 LITRE WHEELIE BIN'` from `_binTypes` in both
`pickup_form_screen_v2.dart` and `pickup_form_screen.dart`. Both lists are now
exactly the 6 canonical entries. Commit: `adf469c`.

**Other Phase A regressions audited (2026-06-24) — all CLEAR:**

| Item | What was checked | Result |
|------|-----------------|--------|
| Recycling Bin | `_binTypes` in both screens | Not present ✓ |
| 660 LITRE | `_binTypes` in both screens | Not present ✓ |
| Bag / Skip (bare) / Container / Other / sachet / 360L | `_binTypes` in both screens | Not present ✓ |
| 18 CBM DINO BIN_ | `_binTypes` in both screens | Not present ✓ |
| 27 CBM COMPACTOR_ | `_binTypes` in both screens | Not present ✓ |
| Hidden email default `tinuogundiran@gmail.com` | All Dart files, all JSON/YAML | Not present ✓ |
| Hidden email default `operations@mottainai.africa` | All Dart files, all JSON/YAML | Not present ✓ |

The Survey App does not use ArcGIS Survey123 XLSForm. It is a Flutter app
(`mottainai_survey`, v3.3.7) whose bin type list is defined in Dart source code.
The "XLSForm" framing in the task description referred to the same Dart dropdown
list — there is no separate `.xlsx` form file in the repository.

**Rule added (Rule 15):**

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
| 9 | When a check depends on a data field, write that field in every create/update path. Use the field that is actually written, not a derived alias. | Pattern #8 |
| 10 | Scoping guards must include an admin-bypass clause. Admin-role users must always see the full dataset. | Pattern #9 |
| 11 | Load-bearing fallbacks must be audited before removal. If >1% of records depend on the fallback, backfill the data first. | Pattern #10 |
| 12 | When a role enum has ≥3 semantically distinct access levels, use ≥3 distinct enum values. Never alias two different access levels to the same role string. | Pattern #11 |
| 13 | Every schema change that adds an enum value must be accompanied by an idempotent startup migration. `pnpm db:push` is not sufficient for production deployments that lack interactive TTY access. | Pattern #12 |
| 14 | (Reserved — see Rule 12 source) | Pattern #11 |
| 15 | When deprecating a value or feature, enumerate every client/surface that exposes it and verify removal in each explicitly. Backend rejection without client-side removal creates supervisor-facing dead options that submit and fail silently or with confusing errors. Add per-client closure checks to the deprecation checklist. | Pattern #13 |

---

## Tranche Close-Out Log

| Tranche | Status | Close date | Notes |
|---------|--------|------------|-------|
| Phase A | Closed | 2026-06-23 | Recycling-bin-backfill decommissioned; normalizeBinType hard-reject confirmed |
| 5A | Closed | 2026-06-23 | All 5 items verified. Ancillary: adminAuth role-mapping fix (d6edae67), useAuth fix (790576a3) |
| 5B | Closed | 2026-06-24 | All items delivered. Item 3 migration: 7,602 CustomerData + 1,824 FormSubmission arcgisBuildingId backfilled. Item 4b: mafCode fallback removed (26626c2, 2c21d0d). Item 5: Fixed Billing canonical 6-entry list aligned across all layers (ac370a5); MongoDB migrated. Rule 16 logged. |

---

### Pattern #14 — Canonical list drift across system layers
**Discovered:** 2026-06-24, during Tranche 5B Item 5 close-out.
**Instance:** The Fixed Billing `BinTypeEnum` (backend Zod schema) and `BIN_TYPES`
(admin dashboard frontend) contained 9 entries (`120L`, `240L`, `660L`, `1100L`,
`MAMMOTH (1100 LITRE)`, `7-11 TONNE COMPACTOR`, `27 CBM DINO BIN`, `sachet`,
`other`) that did not match the canonical 6-entry list used by the Survey App
pickup form and the FieldScheduler mobile app. The two lists had diverged silently
over multiple tranches. The MongoDB live data (2 agreements, 2 tariff schedules)
also used the shorthand `240L` instead of the canonical `240 LITRE WHEELIE BIN`.
**Fix:** BinTypeEnum and BIN_TYPES aligned to canonical 6 entries. MongoDB data
migrated. Committed `ac370a5` to `mottainai-admin-dashboard` main.
**Rule added (Rule 16):**

---

## Standing Rules

| # | Rule | Source Pattern |
|---|------|----------------|
| 1 | No empty catch blocks. Every catch must at minimum `console.error(e)`. | Pattern #6 |
| 2 | Background-job pattern for endpoints that run >2s. No synchronous long-running handlers. | Phase A close-out |
| 3 | One-shot crons must be flagged in PR review with a comment explaining why they are not recurring. | Phase A close-out |
| 4 | Behavioral verification required for all new features. Code existence is not sufficient evidence. | Phase A close-out |
| 5 | Role checks must log a `warn` when they deny a user whose underlying data suggests they should have had access. Silent denial hides role-mapping bugs. | Pattern #7a |
| 6 | 404s from internal API calls must never be silently caught. Log at `error` level. A 404 from an internal endpoint is always a code bug. | Pattern #7b |
| 7 | Token helper return types must be explicit (`string`, not `object`). All callers must have a type assertion that would fail at compile time if the shape changes. | Pattern #4 |
| 8 | Cache fallbacks to stale data must log a `warn` with the cache key and staleness duration. Fallbacks are not silent. | Pattern #2 |
| 9 | When a query or access-control check depends on a data field, write that field's null/empty/malformed rate before shipping. If >5% of records are in a bad state, block the feature until the data is clean. | Pattern #9 |
| 10 | Enum values that appear in multiple system layers (mobile app, backend Zod schema, admin dashboard frontend, MongoDB data) must be defined in one canonical source and cross-referenced in all others. Any change to the canonical list requires a migration plan for all layers simultaneously. | Pattern #14 |
| 11 | Load-bearing fallbacks must be audited before removal. If >1% of records depend on the fallback, backfill the data first. | Pattern #10 |
| 12 | When a role enum has ≥3 semantically distinct access levels, use ≥3 distinct enum values. Never alias two different access levels to the same role string. | Pattern #11 |
| 13 | Every schema change that adds an enum value must be accompanied by an idempotent startup migration. `pnpm db:push` is not sufficient for production deployments that lack interactive TTY access. | Pattern #12 |
| 14 | (Reserved — see Rule 12 source) | Pattern #11 |
| 15 | When deprecating a value or feature, enumerate every client/surface that exposes it and verify removal in each explicitly. Backend rejection without client-side removal creates supervisor-facing dead options. Add per-client closure checks to the deprecation checklist. | Pattern #13 |
| 16 | When a canonical list (enum, dropdown choices, bin types, status codes) is used across ≥2 system layers, every layer must reference the same authoritative constant. Shorthand aliases (e.g., `240L` for `240 LITRE WHEELIE BIN`) must not be introduced in any layer. Drift is detected by comparing all layer definitions against the canonical source at each tranche close-out. | Pattern #14 |


---

## Tranche Close-Out Log (continued)

| Tranche | Status | Close date | Notes |
|---------|--------|------------|-------|
| 6 | Closed | 2026-06-24 | All 4 items delivered. Item 2: Route Schedules nav removed, test schedule wiped (19922c39). Item 4: RequireAdmin gate on /create-route and /area-route-creation, adminProcedure on createRoute (9583714a). Item 1: recurring route toggle (isRecurring/cadence/recurrenceStartDate/recurrenceEndDate) on both Create Route flows; DB schema + tRPC Zod schema + DB helper updated; AreaRouteCreation payload shape corrected (281757fc). Item 3: getAllRoutes now returns workerRole; Assignee Role chip-filter (All/Field Manager/Supervisor) added to Routes.tsx filter panel (281757fc). |

---

### Pattern #15 — Mutation payload field-name drift between UI and backend contract
**Discovered:** 2026-06-24, during Tranche 6 Item 1 implementation.
**Instance:** `AreaRouteCreation.tsx` was calling `createRoute` with
`assignedWorkerId` (not `workerId`), `vehicleId: null` (not `undefined`), and
`scheduledDate: new Date(scheduledDate)` (a Date object, not a string). The
backend Zod schema expected `workerId: z.number().optional()`,
`vehicleId: z.number().optional()`, and `scheduledDate: z.string().optional()`.
The mismatch was silent: tRPC stripped unrecognised keys and coerced the Date
to undefined, so routes were created without a worker assignment or scheduled
date. The bug was only discovered when the recurring-field extension required
reading the full payload shape.
**Fix:** Corrected all three field names/types in the `mutateAsync` call.
**Rule added (Rule 17):**

---

## Standing Rules (continued)

| # | Rule | Source Pattern |
|---|------|----------------|
| 17 | When adding new fields to a tRPC mutation, re-read the full `mutateAsync` call site to verify every existing field name and type matches the current Zod schema. Payload drift (wrong key name, wrong type, extra null vs undefined) is silent in tRPC and will not surface as a type error if the field is `.optional()`. | Pattern #15 |

---

## Regression Investigation: Routes Detail Panel (Post-Tranche 6)

**Reported:** Routes detail panel stuck on "Select a route to view details" for all 39 routes after Tranche 6 deployment. Owner confirmed click handler fires (highlight applies), but `routeDetails` never populates.

**Investigation path:**
1. Checked `Routes.tsx` click chain: `onClick → setSelectedRoute(route.id)` → `getRouteDetails.useQuery({ id: selectedRoute! }, { enabled: selectedRoute !== null })` — logic correct, no change in 281757fc that would break this.
2. Checked git diff of 281757fc: only `filterAssigneeRole` state + filter logic + UI chips added. No change to `selectedRoute` state, `getRouteDetails` query, or detail panel conditional.
3. Checked production server (`54.194.172.107`): production runs from `/home/ubuntu/field-worker-scheduler` (git head `d3eb7cb1`), a **separate codebase** from `/tmp/fieldscheduler-repo`. Tranche 6 changes were never deployed to production.
4. PM2 error log showed repeated `[Database] Failed to upsert user: DrizzleQueryError … Data truncated for column 'role' at row 1` — `upsertUser` re-throws, propagating through the tRPC middleware chain and aborting every `protectedProcedure` call after login.
5. Root cause: `drizzle/schema.ts` defined `users.role` as `mysqlEnum(["user","admin","field_manager"])` but the DB enum already contained `system_admin` (added by the `systemAdminRole` migration). The Drizzle type and the DB were out of sync.

**Fix:** Added `"system_admin"` to `users.role` mysqlEnum in production `drizzle/schema.ts`, rebuilt, restarted PM2. Committed as `2c664ebc`.

**Pattern #16 — Auth middleware re-throw blocks all protectedProcedures silently**
When `upsertUser` (or any function called in the tRPC middleware context-building phase) throws, **every** `protectedProcedure` call fails for that session. The failure is silent from the UI perspective: the click handler fires, the query fires, the server logs "Called with routeId: X", but the procedure body never executes. The symptom looks like a frontend rendering bug but is actually a server-side auth middleware crash.

**Rule 19 — Drizzle schema enums must be kept in sync with DB migrations**
When a DB migration adds a new enum value (e.g., `ALTER TABLE … MODIFY COLUMN role ENUM(…, 'system_admin')`), the corresponding `mysqlEnum([…])` in `drizzle/schema.ts` must be updated in the same commit. A mismatch causes `WARN_DATA_TRUNCATED` on insert/update, which Drizzle surfaces as a thrown error. Because `upsertUser` re-throws, this silently breaks all authenticated tRPC calls.

---

## Pattern #17 — Partial Deployment / Wrong-Base Build

**Date:** 2026-06-24
**Tranche:** 6 (post-close hotfix)

A hotfix commit (`2c664ebc` — Drizzle schema enum fix) was built and deployed directly on the production server without first pulling the latest `origin/main`. At the time of the hotfix, production was at `d3eb7cb1`, which predated all four Tranche 6 commits (`19922c39`, `9583714a`, `281757fc`, `50ebfaa5`). The hotfix was committed locally on the production server, creating a divergent branch. The built dist reflected only the hotfix on the old base — Tranche 6 features were silently absent from the deployed bundle.

**Symptom:** The detail panel fix worked (confirming the hotfix was live), but the Filters panel, status chips, assignee role filter, recurring toggle, and Route Schedules nav removal were all missing — because those changes were on `origin/main` but not in the production working tree.

**Discovery:** `git log --oneline` on the production server showed `d3eb7cb1` as the pre-hotfix base, with no Tranche 6 commits in history. `git fetch` revealed `origin/main` was 8 commits ahead.

**Resolution:** `git pull --rebase origin main` on the production server (the hotfix was automatically dropped as already-upstream since the same change existed in `50ebfaa5`), followed by a clean rebuild from `50ebfaa5`.

---

## Standing Rules (continued)

| # | Rule | Source Pattern |
|---|------|----------------|
| 21 | Hotfixes deployed to production must be built from current `origin/main`, not from a locally diverged base. Before making any change on the production server: (1) `git pull --rebase origin main`, (2) apply fix, (3) commit, push, build. Verify deployment with `git log --oneline -5` on the production server — the top commit must match `origin/main HEAD`. Building from an older base silently drops all intervening commits from the deployed bundle. | Pattern #17 |
