# R-011 — Gated Resilience, Worker Authentication, Incremental Invoice, and Mobile Submission Tranche

**Status:** Proposal only. No application code, scheduler configuration, mobile build, or production deployment is authorized by this document.  
**Why now:** id 30 and id 31 both stopped the financial invoice phase at the Zoho rate limit while persisting `success`; id 31 advanced only from 27,777 to 27,801 invoice upserts. The current scheduler also re-persisted `nextRunAt` at 00:00 despite its configured 09:00 time.

## Recommended sequence

| Order | Component | Proposed effort | Why this order | Gate before implementation/deploy |
|---:|---|---:|---|---|
| 1 | Scheduler resilience | 2–3 engineering days | Restores predictable scheduling and makes failed boot/load observable before further automated changes. | Owner approves design, failure alert recipient, and deployment window. |
| 2 | T59 incremental invoice sync | 2–4 engineering days | Directly addresses id 30/id 31 quota stops; must report financial completeness accurately before downstream testing. | Owner approves cursor/checkpoint semantics and one controlled baseline run plan. |
| 3 | Pre-login worker verification redesign | 2–3 engineering days | Eliminates raw PIN response exposure and client-side bypass while retaining the necessary bootstrap login path. | Owner approves web/mobile behavior, session lifetime, and security regression contract. |
| 4 | Gate A/B mobile submission repair and coordinated APK release | 3–5 engineering days | Requires the hardened server contract and the client decoder fix to land together, followed by targeted field acceptance. | Owner approves controlled-write envelope, release version, and recipient/testing checklist. |

> The estimates are planning ranges, not commitments. If work is performed serially, the proposed tranche is approximately **9–15 engineering days** excluding review, release coordination, and field acceptance time.

## Component A — Scheduler resilience

### Current evidence

The success path in `zohoScheduler.ts` calls `calculateNextRunTime("daily", "00:00", undefined)`; the failure path does the same. id 30 therefore rescheduled id 31 at 00:00, and id 31 persisted id 32 at 00:00 despite `zohoSyncJobs.scheduleTime = "09:00"`. At boot, `initializeScheduler()` calls `loadAndScheduleJobs()` once. A database refusal in that call is logged but not retried, leaving no scheduled timeout after a process/network restart.

### Scope

1. Pass the stored schedule type, time, and day into both terminal reschedule paths. Remove both hard-coded `"00:00"` values.
2. Make startup loading an explicit readiness state. Retry database/job loading with bounded exponential backoff and structured failure logging; keep the service health state **unready** until at least one load succeeds.
3. Add a dead-man evaluator based on the persisted job cadence and last **terminal** sync history row. When a job is enabled and overdue beyond an approved grace period, issue an owner alert with job ID, expected time, last terminal result, and error state.
4. Add a scheduler status/health record that distinguishes `armed`, `unarmed_database_unavailable`, `running`, `completed`, `failed`, and `rate_limited_incomplete`.

### Tests and acceptance gates

| Test | Acceptance condition |
|---|---|
| Success reschedule | A 09:00 daily job persists the next 09:00 UTC run, never 00:00 unless configured that way. |
| Failure reschedule | A controlled sync failure retains the configured 09:00 cadence and records the failure. |
| Boot database refusal | Startup retries; no false `armed` status is reported before the job table is loaded. |
| Recovery | A later successful database connection loads exactly one timeout per enabled job. |
| Dead-man | An overdue enabled job emits one deduplicated alert and clears only on a terminal history row. |

## Component B — Server-side pre-login worker verification

### Current evidence

The legacy web `WorkerMobile.tsx` compares `!worker.pin || worker.pin === pin` in the browser. This allowed no-PIN workers to pass and makes raw equality impossible against bcrypt values. The mobile application already uses phone lookup then `workerAuth.verifyPin`, but that procedure can currently return the complete worker row. `getAllWorkers` must not remain a credential-bearing response in any route.

### Scope

1. Replace the web client-side PIN comparison with a server-side bootstrap verification mutation. It accepts only a worker identifier plus PIN, applies the existing database-backed rate limiter, and performs bcrypt verification server-side.
2. Return only a minimal post-verification context (`workerId`, display name, role/session capability)—never a stored PIN, hash, email, phone, location, survey ID, route data, or arbitrary worker row.
3. Create a short-lived server-issued worker session boundary for web worker routes. Do not treat `localStorage.workerAuthenticated` as authorization.
4. Convert all public worker directory serializers to an explicit allow-list, currently `{ id, name }` only. Move rich worker reads behind the relevant worker session or an authenticated web admin session.
5. Align the mobile verify response to the same minimal context and preserve its Survey bearer flow; do not make a blind `protectedProcedure` flip that would strand deployed APKs.

### Tests and acceptance gates

| Test | Acceptance condition |
|---|---|
| Directory serialization | Every public worker-list response has exactly permitted directory fields and no `pin` key. |
| Bootstrap verification | Correct PIN establishes the limited session; wrong PIN and no-PIN rows fail closed. |
| Rate limiter | Repeated bad PIN attempts lock by the approved current policy and do not enumerate workers. |
| Session boundary | A web route cannot be used by merely populating local storage. |
| Regression clients | Web PIN login and current Flutter phone/PIN login pass their explicit contract tests. |
| Clean-session security | Customer, worker-rich, route-rich, payment, and PIN-bearing reads are denied or minimized according to the approved default-deny mapping. |

## Component C — T59 incremental invoice synchronization

### Current evidence

`syncAllInvoices()` enumerates every customer with a Zoho contact ID and calls `getCustomerInvoices()` for each. The result is an idempotent full re-upsert that consumes the quota before it completes: id 30 stopped at 27,777 invoices; id 31 stopped at 27,801. The current rate-limit sentinel logs a clean stop and returns a result that the scheduler persists as successful.

### Scope

1. Add a durable, auditable financial checkpoint separate from ordinary `updatedAt`, including: last successful **full** invoice pass, filter start time, attempt start/end, rate-limit outcome, and sync version.
2. Apply Zoho Books’ `last_modified_time` filtering to the invoice request path using an explicit UTC checkpoint. Retain pagination and per-page retry behavior.
3. Advance the checkpoint **only after a complete, non-rate-limited invoice pass**. A 429 leaves the prior checkpoint intact and records `rate_limited_incomplete`, so no changes are silently skipped.
4. Use an overlap window around the checkpoint, then idempotently upsert by `zohoInvoiceId`, to absorb delayed edits and clock skew.
5. Persist distinct financial completion fields in history: `invoiceStatus` (`complete`, `rate_limited_incomplete`, `failed`), `invoiceCheckpointFrom`, `invoiceCheckpointTo`, and retry/429 count. Scheduler `success` must no longer hide an incomplete financial pass.

### Tests and acceptance gates

| Test | Acceptance condition |
|---|---|
| Filter construction | Requests contain the correct UTC `last_modified_time` filter and preserve organization, token, and pagination parameters. |
| Complete pass | Checkpoint advances only after every filtered page succeeds. |
| 429 stop | Checkpoint does not advance; run is visibly `rate_limited_incomplete`; next run resumes from the preserved checkpoint. |
| Overlap/idempotency | Boundary invoices are safely re-upserted without duplicates or missed modified invoices. |
| Baseline comparison | One approved controlled baseline/full-pass comparison validates incremental results against current invoices before the full scan is retired. |

## Component D — Gate A/B mobile submission repair and coordinated APK release

### Current evidence

Flutter `_handleResponse()` returns an array unchanged when a tRPC response is array-shaped, while photo-backed calls are typed as `Future<Map<String, dynamic>>`. `workerAuth.createViolation` returns the raw `complianceDb.createViolation()` result. This is the unresolved List-to-Map contract risk reported by the field team. Text-only note submission has a void wrapper; payment-proof upload remains a likely photo-path trigger until the controlled test proves the exact call path.

### Scope

1. **Gate A — controlled write envelope:** create one clearly marked no-route/no-MAF test customer record only if needed; submit one photo-backed compliance report and one photo-backed visit note; capture response envelope metadata; delete created database records and S3 objects in the same session; capture before/after counts.
2. **Gate B — server contracts:** return explicit domain envelopes from every mobile mutation, for example `{ success: true, violation: { id, noticeNumber } }`, rather than raw Drizzle results. Normalize upload success envelopes and enforce ownership at the server.
3. **Flutter decoder:** make response decoding type-safe; map tRPC envelopes to typed models, reject unexpected arrays with a descriptive contract error, and keep void side-effect calls void.
4. **Coordinated APK:** bundle the compatible worker bootstrap changes from Component B with the decoder changes in one FieldWorker build. Preserve the Survey bearer headers already validated in Gate 1.
5. **Release and acceptance:** Build & Release workflow, signed artifact and checksum, recipient delivery to Halleluyah/Bukola/Juwon, then the owner-approved checklist covering phone/PIN bootstrap, route visibility, photo report, photo note, offline/retry behavior, and an authenticated customer read.

### Tests and acceptance gates

| Test | Acceptance condition |
|---|---|
| Gate A envelope | Both controlled writes return explicit success envelopes; cleanup leaves no test rows or S3 objects. |
| Server contracts | Every mutation has a stable object envelope; no raw Drizzle array crosses the API boundary. |
| Flutter decoder | Map, list, error, and null response-shape tests pass; unexpected arrays do not cast to maps. |
| Build | Flutter analyzer/test suite and release workflow succeed from the exact tagged commit. |
| Field acceptance | Halleluyah, Bukola, and Juwon complete the approved checklist before wider distribution. |

## Approval decision matrix

| Decision | Requested owner approval |
|---|---|
| A — Scheduler resilience | Approve the exact scope, health/dead-man alert recipient, and a deployment window. |
| C — T59 incremental invoices | Approve checkpoint schema, overlap policy, and one controlled full-versus-incremental baseline. |
| B — Pre-login redesign | Approve the bootstrap/session contract and inclusion in the coordinated APK release. |
| D — Gate A/B + APK | Approve the controlled write test envelope and release/testing recipients. |

## Explicit non-actions

This proposal does **not** modify the current scheduler, clear the rate-limit state, run a manual Zoho sync, alter the mobile app, build an APK, change any public procedure, or deploy code. Each component remains separately gated.

## Evidence basis

1. `zohoScheduler.ts` terminal paths at lines 201–212 and 244–252; scheduling/loading paths at lines 259–358.
2. `zohoFinancialSync.ts` full-customer loop at lines 65–164 and id 30/id 31 production evidence.
3. `WorkerMobile.tsx` browser-side `!worker.pin || worker.pin === pin` path and `workerAuth`/Flutter contract evidence.
4. R-010 operational record and id-31 terminal history/log snapshot.
