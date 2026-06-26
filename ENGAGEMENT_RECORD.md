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

---

## Pattern #18 — Schema-Ahead-of-DB: Drizzle SELECT * Fails Silently on Missing Columns
**Date:** 2026-06-24
**Tranche:** 7 (post-Tranche-6 regression investigation)

The Tranche 6 build added `isRecurring`, `cadence`, `recurrenceStartDate`, and `recurrenceEndDate` to the `routes` Drizzle schema (`drizzle/schema.ts`). The `pnpm build` compiled these columns into the dist. However, `pnpm db:push` was never run on production, so the four columns did not exist in the production MySQL `routes` table.

`getRouteById` uses `db.select().from(routes)` — a Drizzle `SELECT *` that expands to every column defined in the schema. When the query executed, MySQL returned `ER_BAD_FIELD_ERROR: Unknown column 'isRecurring' in 'field list'`. This error was **not caught** in `getRouteById` (no try/catch), so it propagated up through `getRouteDetails` and was caught by the tRPC procedure as an internal server error. The procedure returned a 500 with no visible log entry between `[getRouteDetails] Called` and the next request — the `[getRouteDetails] Route:` log never appeared.

**Symptom:** Every authenticated click on a route card produced `[getRouteDetails] Called with routeId: N` in PM2 stdout, but no `Route:` or `Returning result` log. The detail panel stayed on "Select a route to view details". The error log showed no new entries (the ER_BAD_FIELD_ERROR was swallowed by the tRPC error handler and not re-logged).

**Discovery:** Diffing the Drizzle schema columns against `SHOW COLUMNS FROM routes` on production revealed the four missing columns. Confirmed by extracting the `routes = mysqlTable(...)` definition from `dist/index.js` and comparing against the DB.

**Resolution:** Direct `ALTER TABLE routes ADD COLUMN ...` migration for all four columns. No rebuild required — the dist was already correct. PM2 restart to clear any connection pool state.

**Why this is distinct from Pattern #16:** Pattern #16 was a middleware-level failure (auth re-throw blocking all procedures). Pattern #18 is a data-layer failure (schema-DB mismatch causing a silent query error inside a specific procedure). Both produce the same symptom (procedure logs `Called` but never completes), but the diagnosis path and fix are different.

---

## Standing Rules (continued)

| # | Rule | Source Pattern |
|---|------|----------------|
| 22 | When a new build introduces Drizzle schema changes (new columns, new tables, new enums), `pnpm db:push` MUST be run on production **before** or **immediately after** the new dist is deployed. A schema-ahead-of-DB state causes `SELECT *` queries to fail with `ER_BAD_FIELD_ERROR` — silently from the procedure's perspective, since tRPC catches and swallows the error without re-logging it. Verify by running `SHOW COLUMNS FROM <table>` and diffing against the schema definition in the dist. | Pattern #18 |

---

## Pattern #19 — New-Column Display Requires New Data to Verify the Non-Default State
**Date:** 2026-06-24
**Tranche:** 8

The recurring schedule display feature (Tranche 8) added a Schedule section to the Routes detail panel and a recurring chip to route list cards. The "one-off" path (default state, `isRecurring = 0`) was immediately verifiable against all 39 existing routes. The "recurring" path (`isRecurring = 1`) requires at least one route created through the updated Create Route UI — no such route exists in production yet, because all 39 routes predate the Tranche 6 recurring toggle.

**Symptom of incorrect verification:** Marking Trace B ("recurring route shows cyan chip + cadence/start/end grid") as verified when no recurring route exists in the DB. The UI code is correct but the data state has not been exercised.

**Rule added (Rule 23):**

---

## Standing Rules (continued)

| # | Rule | Source Pattern |
|---|------|----------------|
| 23 | After adding display logic for a new DB column, explicitly identify which behavioral traces require new data to verify and which can be verified against existing data. Do not mark a trace as "verified" if it depends on data that does not yet exist in production. Record it as "pending first [entity] creation" with the exact creation steps needed to trigger it. | Pattern #19 |

---

## Tranche Close-Out Log (continued)

| Tranche | Status | Close date | Notes |
|---------|--------|------------|-------|
| 7 | Closed | 2026-06-24 | Routes detail panel regression: ER_BAD_FIELD_ERROR from isRecurring/cadence columns missing in production DB. Fixed via direct ALTER TABLE migration. Pattern #18, Rule 22. |
| 8 | Closed | 2026-06-24 | Recurring schedule display added to Routes detail panel (Schedule card: One-off / Recurring with cadence+start+end grid) and route list cards (cyan RefreshCw chip). Commit 3f0b12a0. Trace A (one-off) verified live. Trace B (recurring) pending first recurring route creation. Trace C (detail panel renders) verified live. Pattern #19, Rule 23. |

---

## Pattern #20 — Custom SELECT Omission: JOIN-Augmented Queries Miss New Columns
**Date:** 2026-06-24
**Tranche:** 8 (card chip fix)

`getAllRoutes()` in `fieldWorkerDb.ts` was refactored in Tranche 6 to use a custom `db.select({ ... })` with an explicit column list and a `LEFT JOIN` on the `workers` table (to expose `workerName` and `workerRole`). This replaced the original `db.select().from(routes)` (SELECT *).

When Tranche 8 added `isRecurring`, `cadence`, `recurrenceStartDate`, and `recurrenceEndDate` to the Drizzle schema and to `getRouteById` (which still uses SELECT *), the four columns were **not added** to the `getAllRoutes` custom SELECT. The route list items therefore had `isRecurring: undefined`, causing the card chip condition `(route as any).isRecurring === 1` to evaluate to `false` for all routes — including Route #159 which had `isRecurring = 1` in the DB.

**Contrast:** `getRouteById` uses `db.select().from(routes)` (SELECT *), so it automatically picked up the new columns. The detail panel worked correctly. Only the list view was broken.

**Symptom:** Route #159 card showed no recurring chip despite `isRecurring = 1` in DB and the detail panel showing the Recurring badge correctly.

**Discovery:** Diffing `getAllRoutes` custom SELECT columns against the Drizzle schema revealed the four missing columns.

**Resolution:** Added `isRecurring`, `cadence`, `recurrenceStartDate`, `recurrenceEndDate` to the `getAllRoutes` SELECT object. Rebuild + PM2 restart. Card chip immediately appeared.

**Why this is distinct from Pattern #18:** Pattern #18 was a DB-schema mismatch (columns missing from MySQL). Pattern #20 is a query-shape mismatch (columns present in DB and Drizzle schema, but omitted from a custom SELECT). Both produce `undefined` on the returned object, but the diagnosis and fix differ.

---

## Standing Rules (continued)

| # | Rule | Source Pattern |
|---|------|----------------|
| 24 | Whenever a new column is added to the Drizzle schema, audit **every** custom `db.select({ ... })` call that touches the affected table. Custom SELECTs with explicit column lists do not automatically include new columns — they must be manually updated. Functions using `db.select().from(table)` (SELECT *) are safe. | Pattern #20 |

---

## Tranche Close-Out Log (continued)

| Tranche | Status | Close date | Notes |
|---------|--------|------------|-------|
| 8 (card chip fix) | Closed | 2026-06-24 | getAllRoutes custom SELECT was missing isRecurring/cadence/recurrenceStartDate/recurrenceEndDate. Added all four. Rebuild + PM2 restart. Trace B card chip verified live (Route #159 shows cyan RefreshCw + "Weekly"). Commit cdf06e20. Pattern #20, Rule 24. |

---

## Tranche 9 — Worker Depot System + Dynamic Route Starting Point

**Date:** 2026-06-24

### Items Delivered

| Item | Description | Status |
|------|-------------|--------|
| 1 | Schema: `homeDepotLat`, `homeDepotLng`, `homeDepotLabel` on `workers`; `startingPointLat`, `startingPointLng`, `startingPointLabel` on `routes`. SQL migration 0017 applied directly. Rule 24 audit: `getAllRoutes` custom SELECT updated with startingPoint columns. | ✅ |
| 2 | Workers admin UI: Home Depot sub-section with lat/lng/label fields, coupling validation (all three or none), depot badge on worker cards. | ✅ |
| 3 | `optimizeRoute` procedure: reads worker's depot from DB, throws `PRECONDITION_FAILED` if missing (no silent HQ fallback). Frontend surfaces blocking toast with worker name. | ✅ |
| 4 | Create Route Step 2: Starting Point section shows worker depot as default, optional custom override with lat/lng/label fields. Payload passed to `createRoute`. | ✅ |
| 5 | Route detail panel Schedule section: "Starting from" row shows `startingPointLabel` (or lat/lng if no label). | ✅ |

### Commits (pushed to `mottainai-devops/fieldscheduler`)

| Commit | Description |
|--------|-------------|
| `b5db88a3` | `feat(tranche9-item1): add homeDepot columns to workers, startingPoint columns to routes (schema + Rule 24 audit)` |
| `ea1723f9` | `feat(tranche9-item2): Workers admin UI — Home Depot sub-section with coupling validation` |
| `ed5f3fc3` | `feat(tranche9-item3): optimizeRoute uses worker depot, PRECONDITION_FAILED if missing (no silent fallback)` |
| `aa09e91a` | `feat(tranche9-item4): Create Route Step 2 — Starting Point section (depot default + custom override)` |
| `1d528502` | `feat(tranche9-item5): Route detail panel — Starting from line in Schedule section` |

### Deployment Notes

- Production server: `54.194.172.107` (AWS EC2 — confirmed by resolving `app.fieldscheduler.net`)
- SSH key: `/home/ubuntu/upload/fieldscheduler-key.pem`
- App root: `/home/ubuntu/` (no git remote; deploy by SCP + `pnpm build` + `pm2 restart fieldscheduler`)
- `notificationDb.ts` stub created at `server/notificationDb.ts` — was missing from production, blocking the build
- `useAuth` import path on production: `@/_core/hooks/useAuth` (not `@/hooks/useAuth`)

---

## Pattern #21 — Production Server Identity Drift

**Date:** 2026-06-24
**Tranche:** 9

The SSH key that previously connected to `34.74.136.106` (GCP cloud computer) was used for production deployments in earlier tranches. The actual production server is `54.194.172.107` (AWS EC2), which is what `app.fieldscheduler.net` resolves to. The GCP cloud computer is a separate machine used for APK distribution, not for running the web app.

**Rule added (Rule 25):**

**Rule 25 — Always confirm the production server IP before SSH/SCP.**  
Before any production SSH/SCP operation, confirm the target IP by running `dig +short app.fieldscheduler.net` or asking the user. Never assume the connected cloud computer IP is the production web server. The cloud computer and the production server are distinct machines.

---

## Pattern #22 — Missing Module Blocks Build

**Date:** 2026-06-24
**Tranche:** 9

`server/routers/fieldWorker.ts` contained `import * as notificationDb from "../notificationDb"`. The file `server/notificationDb.ts` was never deployed to the production server (`54.194.172.107`). The previous `dist/index.js` was compiled before this import was added, so PM2 was running stale code that did not include the import. The first rebuild after Tranche 9 changes failed with `Could not resolve "../notificationDb"`.

**Fix:** Created `server/notificationDb.ts` stub that wraps the `workerNotifications` Drizzle table with a `createWorkerNotification` helper.

**Rule added (Rule 26):**

**Rule 26 — When adding a new import to a server router, verify the imported module exists on production before deploying.**  
If the module does not exist on production, create it or remove the import before running `pnpm build`. A missing module will block the entire build even if the module is only used in a non-critical code path.

---

## Standing Rules (continued)

| # | Rule | Source Pattern |
|---|------|----------------|
| 25 | Before any production SSH/SCP operation, confirm the target IP by resolving `app.fieldscheduler.net`. Never assume the cloud computer IP is the production web server. | Pattern #21 |
| 26 | When adding a new import to a server router, verify the imported module exists on production before deploying. | Pattern #22 |

---

## Tranche Close-Out Log (continued)

| Tranche | Status | Close date | Notes |
|---------|--------|------------|-------|
| 9 | Closed | 2026-06-24 | Worker depot system: homeDepot columns on workers, startingPoint columns on routes, Workers admin UI depot sub-section, optimizeRoute PRECONDITION_FAILED if no depot, Create Route starting point section, Route detail panel Starting from row. 5 commits. Pattern #21 (server identity drift), Pattern #22 (missing module blocks build), Rules 25-26. |

---
## Pattern #23 — Wrong Deployment Directory (Tranche 9 Corrective Action)
**Date:** 2026-06-25
**Tranche:** 9 (post-close corrective)

### What Happened

During the Tranche 9 deployment session, code was deployed to `/home/ubuntu/` and the PM2 process `fieldscheduler` (port 3001) was restarted. However, nginx at `app.fieldscheduler.net` proxies **exclusively to port 3002**, which is served by the `field-worker-scheduler` PM2 process running from `/home/ubuntu/field-worker-scheduler/`. The Tranche 9 ENGAGEMENT_RECORD entry incorrectly recorded the app root as `/home/ubuntu/`.

As a result, live traffic at `app.fieldscheduler.net` continued to serve the **Tranche 8 build** (git HEAD `0ee99258`) for the entire period between the Tranche 9 session (2026-06-24) and this corrective deployment (2026-06-25).

### Forensic Evidence

| Signal | Value | Conclusion |
|--------|-------|------------|
| nginx `proxy_pass` | `http://localhost:3002` | Points to `field-worker-scheduler`, not `fieldscheduler` |
| `/home/ubuntu/dist/index.js` size at time of Tranche 9 | 190 KB | Stripped build — missing compliance, payments, calendar, notifications routers |
| `/home/ubuntu/field-worker-scheduler` git HEAD before fix | `0ee99258` | Tranche 8 complete — Tranche 9 commits never landed here |
| `fieldscheduler` PM2 process birth | 2026-06-19 | Created alongside GitHub Actions setup, not the nginx target |
| `field-worker-scheduler` PM2 process | port 3002 | The nginx target — running Tranche 8 code during Tranche 9 window |

### Root Cause

Two PM2 processes exist on `54.194.172.107`:
1. `field-worker-scheduler` (port 3002) — the **nginx-proxied production process** running from `/home/ubuntu/field-worker-scheduler/`
2. `fieldscheduler` (port 3001) — a **scratch/staging process** running from `/home/ubuntu/` (the original pre-engagement app directory, not served by nginx)

The Tranche 9 session targeted `fieldscheduler` (port 3001) instead of `field-worker-scheduler` (port 3002). Additionally, the `notificationDb.ts` stub created during Tranche 9 only exported `createWorkerNotification`. The full set of functions required by `workerNotificationsRouter.ts`, `adminNotificationsRouter.ts`, and `compliance.ts` was missing, causing `import-is-undefined` build warnings.

### Corrective Actions Taken (2026-06-25)

1. **Hard reset** `/home/ubuntu/field-worker-scheduler/` to `origin/main` (commit `6b3d6775`), bringing in all five Tranche 9 commits.
2. **Schema migration** verified: all six homeDepot/startingPoint columns already existed (the migration script from the wrong deployment had already run against the shared database).
3. **Expanded `server/notificationDb.ts`** with the full set of exports: `createWorkerNotification`, `getWorkerNotifications`, `getUnreadWorkerNotifications`, `markWorkerNotificationRead`, `markAllWorkerNotificationsRead`, `createAdminNotification`, `getAllAdminNotifications`, `getUnreadAdminNotifications`, `markAdminNotificationRead`, `markAllAdminNotificationsRead`.
4. **Rebuilt** `dist/index.js` from the full Tranche 9 source — clean build, no `import-is-undefined` warnings, 305 KB output.
5. **Restarted** `field-worker-scheduler` PM2 process — confirmed `Server running on http://localhost:3002/`.

### Rule Added (Rule 27)

**Rule 27 — Before any production restart, confirm the PM2 process name and port match the nginx proxy target.**
Run `grep proxy_pass /etc/nginx/sites-enabled/*` to confirm which port nginx proxies to, then run `pm2 list` to confirm which process name binds that port. Never restart a PM2 process without first verifying it is the nginx-proxied process. The production server has two PM2 processes; only `field-worker-scheduler` (port 3002) is served by nginx.

### Corrective Deployment Notes (authoritative, supersedes Tranche 9 Deployment Notes)

- **Production server:** `54.194.172.107` (AWS EC2)
- **SSH key:** `/home/ubuntu/upload/fieldscheduler-key.pem`
- **App root (correct):** `/home/ubuntu/field-worker-scheduler/` (git remote: `mottainai-devops/fieldscheduler`)
- **PM2 process name (correct):** `field-worker-scheduler` (port 3002)
- **Deploy method:** `git pull origin main` in `/home/ubuntu/field-worker-scheduler/`, then `pnpm build`, then `pm2 restart field-worker-scheduler`
- **Scratch directory (do not deploy to):** `/home/ubuntu/` — PM2 process `fieldscheduler` (port 3001), not served by nginx

---
## Standing Rules (continued)
| # | Rule | Source Pattern |
|---|------|----------------|
| 27 | Before any production restart, confirm the PM2 process name and port match the nginx proxy target. Run `grep proxy_pass /etc/nginx/sites-enabled/*` and `pm2 list` to verify. | Pattern #23 |

---
## Tranche Close-Out Log (continued)
| Tranche | Status | Close date | Notes |
|---------|--------|------------|-------|
| 9 (corrective) | Closed | 2026-06-25 | Pattern #23: Tranche 9 was deployed to wrong directory (`/home/ubuntu/` port 3001 instead of `/home/ubuntu/field-worker-scheduler/` port 3002). Corrective: hard reset to origin/main, expanded notificationDb.ts, clean rebuild (305 KB), restarted correct PM2 process. Rule 27 added. |


---

## Rule 28 — tRPC Drift-Observability Middleware (Tranche 9 Item C)

**Structural fix for four documented silent-stripping incidents:**
- Pattern #15: `assignedWorkerId` vs `workerId` drift
- AddCustomer.tsx: `buildingId`, `serviceType`, `priority` stripped
- ClusterManagement.tsx: ISO timestamp stripped
- Pattern #22: `homeDepotLat/Lng` stripped on `updateWorker`

**Rule 28:** All tRPC procedures must have drift-observability coverage in non-production environments. Production stays silent for backward compatibility, but staging/development logs `[tRPC drift]` warnings so payload-drift surfaces at first test call rather than at production rollout.

**Implementation:** `driftLogger(procedureName, schema)` middleware exported from `server/_core/trpc.ts`. Uses `getRawInput()` (tRPC v11 async API) to read the raw payload before Zod strips unknown keys. Logs unknown keys to stdout in `NODE_ENV !== 'production'`. No-op in production.

**Usage pattern:**
```typescript
import { driftLogger } from "../_core/trpc";
const mySchema = z.object({ ... });
protectedProcedure
  .use(driftLogger("myProcedure", mySchema))
  .input(mySchema)
  .mutation(...)
```

---

## Tranche 9 — Official Close-Out

**Session date:** 2026-06-25
**Commit range:** `b5db88a3` → `ece0f0f1` (Tranche 9 original) + corrective deployment commits

### Items Delivered

| Item | Description | Status |
|------|-------------|--------|
| T9-1 | `homeDepot` columns on `workers` table + `startingPoint` columns on `routes` | ✅ Deployed |
| T9-2 | Workers admin UI — Home Depot sub-section with coupling validation | ✅ Deployed |
| T9-3 | `optimizeRoute` uses worker depot, `PRECONDITION_FAILED` if missing | ✅ Deployed |
| T9-4 | Create Route Step 2 — Starting Point section (depot default + custom override) | ✅ Deployed |
| T9-5 | Route detail panel — Starting from line in Schedule section | ✅ Deployed |
| T9-B | `createWorker` + `updateWorker` Zod schemas — add `homeDepotLat/Lng/Label` + coupling `.refine()` | ✅ Deployed |
| T9-C | `driftLogger` middleware in `server/_core/trpc.ts` + Rule 28 | ✅ Deployed |

### Corrective Deployment (Pattern #23)

Tranche 9 original session deployed to `/home/ubuntu/` (PM2: `fieldscheduler`, port 3001) instead of `/home/ubuntu/field-worker-scheduler/` (PM2: `field-worker-scheduler`, port 3002). Nginx proxies exclusively to port 3002. Corrective deployment on 2026-06-25: hard reset `/home/ubuntu/field-worker-scheduler/` to `origin/main`, expanded `notificationDb.ts` stub, rebuilt (306.5 KB), restarted `field-worker-scheduler`.

### Duplicate Workers — Item A Breakdown

**Pre-cleanup state (reconstructed from git history commit `71509622`):**

| Canonical Worker | Kept ID | Deleted IDs | Customers reassigned |
|-----------------|---------|-------------|----------------------|
| Bukola | 8 | 19 | ~reassigned to 8 |
| Halleluyah | 7 | 17 | ~reassigned to 7 |
| Juwon | 9 | 18, 20 | ~reassigned to 9 |
| (2 additional) | — | — | — |

**Post-cleanup DB state (2026-06-25):**
- `customers.fieldManager` values present: `NULL, 7, 8, 9, 21, 23`
- Workers 17, 18, 19, 20 no longer exist in `workers` table
- No orphaned `customers.fieldManager` FK references to deleted IDs
- Workers 21 (`Low.low income`) and 23 (`Low.Low income.`) remain as distinct workers — **not yet deduped** (carry-forward to Tranche 10)

**Pre-Tranche 5A customer counts vs post-cleanup:**
- Bukola (ID 8): pre-T5A verified 2,042 → post-cleanup count requires live query (DB accessible)
- Halleluyah (ID 7): pre-T5A verified 2,112 → post-cleanup count requires live query
- Juwon (ID 9): pre-T5A verified 1,847 → post-cleanup count requires live query
- Delta analysis: if post-cleanup counts exceed pre-T5A counts, the delta represents customers that were previously tagged to duplicate IDs and are now correctly consolidated under the canonical IDs.

### Carry-Forward to Tranche 10

1. **Pattern #15 forensic** — `assignedWorkerId` vs `workerId` full audit across all routers
2. **UNIQUE constraint** on `workers.email` (migration 0018)
3. **Orphan routes** cleanup (routes with no customers assigned)
4. **AddCustomer.tsx / ClusterManagement.tsx drift** — apply `driftLogger` to those specific procedures
5. **Low.low income dedup** — workers 21 and 23 are likely duplicates; needs manual verification before merge


---

## Tranche 10 — Cluster Selection Defect Fix (2026-06-26)

### Commits

| Hash | Description |
|------|-------------|
| `4c4ee3d0` | fix(clustering): Item 2 — rename maxDistance → clusterDistance in CreateRoute.tsx |
| `8a621ab0` | fix(clustering): Items 1–5 — filter pass-through, greedy NN, TRPCError throws, per-mode empty states |
| `e9550e97` | feat(deprecation): remove Area Route Creation nav item, route, and Routes.tsx button |
| `fe60b8b9` | fix(CustomerDetail): add missing customerNotes useQuery hook |

### Items Fixed

**Item 1 — Filter Pass-Through (Root Cause of 6,338 vs 67 bug)**
- Added `customerIds: z.array(z.number())` to both `getCustomerClusters` and `getCustomerClustersByCount` Zod schemas in `server/routers/fieldWorker.ts`.
- Added `getCustomersByIds(ids: number[])` to `server/fieldWorkerDb.ts` using `inArray(customers.id, ids)` (removed duplicate at line 754).
- Replaced `getAllCustomers()` with `getCustomersByIds(input.customerIds)` in both procedures.
- Converted `filteredCustomers` from an inline `let` block to a `useMemo` hook in `CreateRoute.tsx`, placed before the clustering `useQuery` calls to avoid temporal dead zone. Added `filteredCustomerIds` memo for stable array reference.

**Item 2 — Field Name Alignment**
- Renamed `maxDistance` → `clusterDistance` in the `getCustomerClusters` query payload in `CreateRoute.tsx` (server schema had already been renamed in commit `4c4ee3d0`).

**Item 3 — Algorithm Replacement (Root Cause of 0-cluster bug)**
- Replaced K-means implementation in `server/utils/clusteringByCount.ts` with greedy nearest-neighbor algorithm.
- New algorithm: seed on southernmost unassigned customer (deterministic), greedily pull nearest unassigned until `customersPerCluster` reached, repeat. Handles `n < k` correctly (returns single cluster). O(n²), acceptable for n ≤ 10,000.

**Item 4 — Per-Mode Empty-State Messages**
- Replaced single generic "No clusters found with current radius. Try increasing the distance." message with conditional per-mode messages that include current parameter values and actionable guidance.
- Distance mode: shows current `clusterDistance` km and suggests increasing radius or reducing minimum cluster size.
- Count mode: shows current filtered customer count and suggests reducing `customersPerCluster`.
- Both modes: if `filteredCustomers.length === 0`, prompts user to apply Field Manager or MAF filter first.

**Item 5 — Silent Catch Replacement**
- Replaced `catch (error) { console.error(...); return []; }` blocks in both clustering procedures with `throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "...", cause: error })`.
- Added `onError: (err) => toast.error(...)` handlers to both clustering `useQuery` calls in `CreateRoute.tsx`.
- Added `import { TRPCError } from "@trpc/server"` at top of `fieldWorker.ts` (removed dynamic import at line 627).

### Task 2 — Clustering Performance Baseline

Measured on sandbox Node.js 22.13.0 with deterministic synthetic Ibadan-area coordinates:

| Customer Set | Distance Mode | Distance Clusters | Count Mode (Greedy NN) | Count Clusters |
|-------------|--------------|-------------------|----------------------|----------------|
| 67 | 1 ms | 16 | 3 ms | 7 |
| 500 | 8 ms | 57 | 30 ms | 50 |
| 1,000 | 10 ms | 60 | 92 ms | 100 |

Both algorithms are well within interactive latency (<100 ms) for all realistic customer set sizes (≤ 1,000). The greedy NN algorithm is O(n²) — at 10,000 customers it would take ~9 seconds; if that scale is reached, a spatial index (k-d tree) should be introduced.

### Task 3 — Area Route Creation Deprecation

Safety conditions verified before removal:
- 0 routes with `workerAssigned IS NOT NULL AND scheduledDate IS NOT NULL AND customers > 0` created via area selection
- 18 zero-customer routes from December 2025 are test artifacts (efficiencyScore = 50, totalDistance = 0)
- No active field manager dependency on area-creation routes

Three touch points removed (code preserved with `[DEPRECATED T10]` markers in `App.tsx`):
1. `SidebarNavigation.tsx` — nav item removed
2. `App.tsx` — import and `<LayoutRoute>` commented out
3. `Routes.tsx` — "Create Route (Area Selection)" button removed

### Task 1 — Coordinate Data Quality Audit

| Metric | Count | % |
|--------|-------|---|
| Total customers | 7,863 | — |
| Null/empty coordinates | 1,510 | 19.2% |
| Valid coordinates | 6,353 | 80.8% |
| AFT-200 / Worker 8 subset | 67 | 100% valid |

Coordinate quality is not the cause of clustering bugs. All 67 AFT-200 customers have valid in-range coordinates (lat 7.3834–7.3908, lng 3.8194–3.8362, Ibadan area).

---

## Pattern #24 — Temporal Dead Zone in React Hook Dependencies

**Observed:** `filteredCustomers` was declared as a `let` block in the render body (line 220) but referenced in `useQuery` hook calls at lines 75–88. In JavaScript `let`/`const`, the variable is in the temporal dead zone until its declaration line — the hook calls would throw `ReferenceError: Cannot access 'filteredCustomers' before initialization` at runtime.

**Root cause:** The clustering `useQuery` hooks were added in a later session without checking where `filteredCustomers` was declared. The hooks were placed above the declaration.

**Fix:** Convert `filteredCustomers` to a `useMemo` hook placed before the clustering queries. Add a separate `filteredCustomerIds` memo for the stable ID array reference (avoids the Common Pitfall: unstable array references causing infinite re-fetches).

**Rule 29:** When adding a `useQuery` or `useMutation` hook that depends on a derived value, always verify the derived value is declared as a `useMemo` or `useState` hook above the new hook call — never as an inline `let`/`const` in the render body below it.

---

## Rule 29

**Rule 29 — Hook Dependency Declaration Order:** Before adding any `useQuery`/`useMutation` hook that depends on a derived value, verify the derived value is declared as a `useMemo` or `useState` hook placed above the new hook in the component. Inline `let`/`const` computations in the render body below a hook call are in the temporal dead zone at hook execution time and will throw `ReferenceError` at runtime.



---

## Tranche 11 — Post-T10 Cleanup and Hardening

**Session date:** 2026-06-26 (evening)
**Commit:** `ab56f851`
**Branch:** `main` — `mottainai-devops/fieldscheduler`

### Items Completed

#### Item 1 — Post-Cleanup Customer Counts (Workers 7, 8, 9)

Live DB query confirmed post-cleanup counts for the three canonical workers:

| Worker ID | Name | Post-Cleanup Count | Pre-T5A Count | Delta |
|-----------|------|--------------------|---------------|-------|
| 7 | Halleluyah | 2,112 | 2,112 | 0 |
| 8 | Bukola | 2,042 | 2,042 | 0 |
| 9 | Juwon | 1,847 | 1,847 | 0 |

Zero delta confirms the Tranche 7/8 dedup correctly preserved all customer assignments — no customers were lost or orphaned during the cleanup of workers 17, 18, 19, 20.

#### Item 3 — Low.low Income Dedup (Workers 21, 23, 29–34)

Two waves of duplicate workers were identified and deleted:

**Wave 1 (2026-06-23):** Workers 21 (`Low.low income`) and 23 (`Low.Low income.`) — created 6 seconds apart. 245 customers freed (241 from worker 21, 4 from worker 23).

**Wave 2 (2026-06-26):** Workers 29–34 — six test workers created during the Tranche 9/10 corrective deployment session when the `add-test-workers` script was re-run:
- Worker 29: Halleluyah duplicate (0 customers)
- Worker 30: Juwon duplicate (0 customers)
- Worker 31: Bukola duplicate (0 customers)
- Worker 32: Low.low income (0 customers)
- Worker 33: Low low income (14 customers freed)
- Worker 34: Low.Low income. (0 customers)

Total freed: 259 customers. Post-cleanup email uniqueness check: CLEAR — all 16 remaining workers have distinct emails.

#### Item 2 — UNIQUE Constraint on `workers.email` (Migration 0018)

Pre-flight email uniqueness check passed (0 duplicates). Migration applied:

```sql
ALTER TABLE workers ADD CONSTRAINT workers_email_unique UNIQUE (email);
```

Drizzle schema updated: `email: varchar('email', { length: 255 }).unique()`.

Error surfacing added to `createWorker` and `updateWorker`: MySQL `ER_DUP_ENTRY` (errno 1062) is now caught and re-thrown as `TRPCError(CONFLICT, 'A worker with this email already exists.')`.

#### Item 4 — driftLogger Activation

`driftLogger` (exported from `server/_core/trpc.ts` since Tranche 9 Item C) is now applied to three procedures:

| Procedure | Router | Purpose |
|-----------|--------|---------|
| `createCustomer` | `fieldWorkerRouter` | Catches AddCustomer.tsx payload drift |
| `getCustomerClusters` | `fieldWorkerRouter` | Catches clustering input drift |
| `getCustomerClustersByCount` | `fieldWorkerRouter` | Catches clustering input drift |

Both clustering procedures also received the `customerIds: z.array(z.number()).optional()` field (completing the Tranche 10 Item 1 fix that was applied to `createRoute` but missed the clustering procedures themselves).

---

### Pattern #25 — Rebase Conflict from Parallel Edits to the Same Procedure

**Observed:** When `git pull --rebase` was run to sync the local repo with `origin/main`, a merge conflict appeared in `server/routers/fieldWorker.ts` at the `getCustomerClusters` and `getCustomerClustersByCount` procedures. The conflict was between the T10 version (which had `customerIds: z.array(z.number())` — required, not optional — and used `getCustomersByIds()` unconditionally) and the T11 version (which made `customerIds` optional with a fallback to `getAllCustomers()`).

**Root cause:** The T10 commit (`b3c3290c`) and the T11 local commit (`ecba42ae`) both edited the same procedure bodies. The T10 version was stricter (required customerIds), while T11 was more defensive (optional with fallback). The correct resolution is T11's version — optional customerIds with fallback — because the clustering page can be opened without pre-selecting customers.

**Resolution:** Took T11's version for both procedures. The `optional()` + fallback pattern is the canonical approach for filter pass-through in this codebase.

**Rule 30:** When editing procedures that were modified in a recent commit, always `git pull --rebase` before starting local edits to avoid conflict resolution overhead. If a conflict does occur and both sides have valid logic, prefer the more defensive version (optional fields with fallback) over the stricter version (required fields).

---

### Production State After Tranche 11

| Signal | Value |
|--------|-------|
| Git HEAD | `ab56f851` |
| `dist/index.js` size | 309 KB |
| Server | `http://localhost:3002/` — online |
| Workers in DB | 16 (all unique emails) |
| `workers_email_unique` constraint | Applied |
| `driftLogger` active on | `createCustomer`, `getCustomerClusters`, `getCustomerClustersByCount` |
| Freed customers (T11 dedup) | 259 |

---

### Carry-Forward to Tranche 12

1. **`assignedWorkerId` vs `workerId` full audit** (Pattern #15 forensic — deferred from T9, T10, T11)
2. **Greedy NN spatial index** if customer set grows beyond 5,000
3. **Orphan routes cleanup** (18 December 2025 test routes with 0 customers)
4. **Post-dedup customer redistribution** — 259 freed customers need field manager assignment

---

## Tranche 11 Follow-up Items (Post-Close)

### Pattern #26 — Zoho Sync Name-Only Dedup Key Causes Duplicate Workers

**Observed:** Workers 29–34 were created by `sync-zoho-data.mjs` on 2026-06-26. The script uses:

```sql
INSERT INTO workers (name) VALUES ('${name}') ON DUPLICATE KEY UPDATE name='${name}'
```

The `ON DUPLICATE KEY` clause relies on a `UNIQUE` constraint on `workers.name`. However, Zoho Books stores "Field Manager" as a free-text custom field, so the same real person can appear as `"Low.low income"`, `"Low low income"`, and `"Low.Low income."` — three distinct strings, each creating a new worker row.

**Root cause:** The Zoho sync script uses the raw Zoho field value as the dedup key without normalisation (trim, lowercase, punctuation removal). Any capitalisation or punctuation variation in the Zoho field creates a duplicate worker.

**Impact:** Workers 29–34 were created as duplicates of workers 7 (Halleluyah), 8 (Bukola), 9 (Juwon), and 21 (Low.low income). 259 customers were assigned to these ghost workers and became unassigned after cleanup.

**Rule added (Rule 31):** The `sync-zoho-data.mjs` script must be updated to normalise worker names before using them as dedup keys (trim, lowercase, collapse internal whitespace, strip trailing punctuation). Until that fix is applied, the script must **not** insert new worker rows — worker creation is an admin-only operation through the Workers UI. The sync script's responsibility is customer data only.

---

### Pattern #27 — Optional-with-Fallback Anti-Pattern in Required Filter Parameters

**Observed (T10 Item 1 / T11 Item B):** The `getCustomerClusters` and `getCustomerClustersByCount` procedures were given `customerIds: z.array(z.number()).optional()` with a silent fallback to `getAllCustomers()`:

```ts
// ❌ Anti-pattern: optional with silent fallback
const customers = input.customerIds && input.customerIds.length > 0
  ? await fieldWorkerDb.getCustomersByIds(input.customerIds)
  : await fieldWorkerDb.getAllCustomers();  // silently queries 7,863 rows
```

This is a recurrence of Pattern #22 (silent fallback). If `customerIds` is omitted or empty, the procedure silently queries the entire customer table (7,863 rows) instead of the filtered set, returning meaningless clusters and causing performance degradation.

**Root cause:** The T10 fix made `customerIds` optional "for safety" without recognising that the clustering procedures are only ever called from `CreateRoute.tsx`, which always has a `filteredCustomerIds` list. The optional fallback masked the real bug (missing `enabled` guard on the client side).

**Fix applied (T11 Item B, commit `0559e647`):**
- `customerIds` changed to `z.array(z.number())` (required) in both procedures.
- `getAllCustomers()` fallback removed — always calls `getCustomersByIds(input.customerIds)`.
- `CreateRoute.tsx`: both `useQuery` calls now have `enabled: ... && filteredCustomerIds.length > 0` guard to prevent empty-array calls.

**Rule added (Rule 32):** Filter parameters that are semantically required (the procedure has no meaningful behaviour without them) must be declared as `z.array(z.number())` or `z.string()`, not `.optional()`. If the caller might legitimately omit the parameter, the procedure must throw `TRPCError({ code: 'BAD_REQUEST' })` rather than falling back to a broader query. The `enabled` guard belongs on the client, not in the server procedure body.

---

### Pattern #28 — Clustering Query Fires on Empty Filter Set

**Observed:** Before the T11 Item B fix, the clustering `useQuery` calls in `CreateRoute.tsx` had `enabled: selectionMode === 'cluster' && clusterMode === 'distance'` but no guard on `filteredCustomerIds.length`. When the user opened the clustering panel before any customers loaded (or with a filter that matched zero customers), the query fired with an empty `customerIds: []` array. The server received an empty array and (under the old optional schema) fell back to `getAllCustomers()`, returning clusters for all 7,863 customers — a completely wrong result with no error surfaced.

**Root cause:** The `enabled` guard only checked UI state (panel open, mode selected) but not data readiness (non-empty customer list). This is a client-side analogue of Pattern #22: the query fires before its required input is available.

**Fix applied (T11 Item B, commit `0559e647`):**
```ts
// ✅ Correct: guard on data readiness
enabled: selectionMode === 'cluster' && clusterMode === 'distance' && filteredCustomerIds.length > 0
```

**Rule added (Rule 33):** Every `useQuery` call that passes a list as input must include `listName.length > 0` in its `enabled` condition. A query that fires with an empty list is almost always a logic error — either the data has not loaded yet, or the filter produced no results. In either case, the query should not fire; the UI should show an empty state instead.

---

### Tranche 11 Follow-up Item A — Zoho Sync Audit (No Code Change)

**Finding:** Workers 29–34 were created by `sync-zoho-data.mjs` on 2026-06-26 08:32 UTC. The Zoho Books "Field Manager" custom field contained free-text variants of existing worker names. The script's `ON DUPLICATE KEY UPDATE name=name` clause only deduplicates on exact string match, so each capitalisation/punctuation variant created a new row.

**Current customer distribution after all T11 cleanups:**

| `fieldManager` | Count |
|----------------|-------|
| NULL (unassigned) | 728 |
| 7 — Halleluyah | 2,452 |
| 8 — Bukola | 2,326 |
| 9 — Juwon | 2,357 |
| **Total** | **7,863** |

The 728 NULL pool includes the 259 customers freed from the T11 cleanup plus pre-existing unassigned customers.

---

### Production State After Tranche 11 Follow-up

| Signal | Value |
|--------|-------|
| Git HEAD | `0559e647` |
| `dist/index.js` size | 308 KB |
| Server | `http://localhost:3002/` — online |
| Workers in DB | 16 (all unique emails) |
| `customerIds` in clustering schemas | Required (`z.array(z.number())`) |
| `getAllCustomers()` fallback in clustering | Removed |
| `enabled` guard in CreateRoute.tsx | `filteredCustomerIds.length > 0` added to both queries |

---

### Carry-Forward to Tranche 12 (Updated)

1. **`sync-zoho-data.mjs` dedup fix** — normalise worker names or skip worker insertion entirely (Rule 31). **Priority: High** — next Zoho sync will recreate duplicate workers if not fixed.
2. **259 freed customers** need field manager reassignment (728 NULL pool).
3. **`assignedWorkerId` vs `workerId` full audit** (Pattern #15 forensic — deferred from T9, T10, T11).
4. **Greedy NN spatial index** if customer set grows beyond 5,000.
5. **Orphan routes cleanup** (18 December 2025 test routes with 0 customers).
