# R-009 — Field Scheduler Routing Addendum

**Evidence status:** This record supplements R-008 containment and the earlier R-009 scheduler diagnosis. It is a durable evidence artifact, not a deployment approval. **R-010 remains reserved for the observed 2026-08-24 scheduled Zoho sync.**

## Owner decisions recorded

| Item | Decision | Execution status |
|---|---|---|
| Synthetic test-supervisor shadow worker | Deactivate the synthetic worker only; preserve its database row | Executed; one row changed from `active` to `inactive` at `2026-08-23T17:10:20Z` |
| Gate D | Close as remediation-equivalent; route 1,003 run-16-associated customers to the owner’s genuine-assignment queue | Closed; no customer mutation performed |
| Gate 2 severity | Treat web `!worker.pin` behavior as an active bypass, not merely a response-shape redesign blocker | Corrected below |
| No-PIN interim containment | Inactivate only the designated active no-PIN workers after Adey supplies the approved list | Pending list and scoped write gate |
| Full worker-auth redesign | Bundle with the worker APK/default-deny tranche | Proposal only; no deployment |
| Scheduler | Maintain the already approved normal 09:00 UTC run; observe it for R-010 | Armed and monitored |

## Gate 2 severity correction

The browser worker selection page requests `workerAuth.getAllWorkers` before authentication. It looks up the selected worker and executes:

> `if (!worker.pin || worker.pin === pin) { setIsAuthenticated(true); ... }`

The active production worker aggregate at 2026-08-23 showed **8 active workers with no PIN**, **8 active workers with bcrypt-hashed PINs**, and **1 inactive worker with no PIN** (the approved synthetic test supervisor after deactivation). Consequently, each active no-PIN worker satisfies `!worker.pin` for any submitted PIN and is granted browser-worker access. This is an **active authentication bypass** for the eight currently active no-PIN accounts, subject to selection of that account in the public directory.

The equality branch cannot authenticate the eight bcrypt-hashed workers: a submitted plaintext PIN cannot equal the stored bcrypt hash string. The browser path has therefore been silently non-functional for the hashed-PIN population since bcrypt hashing first deployed.

### Hashing timeline

| UTC time | Evidence | Security relevance |
|---|---|---|
| 2026-07-03T12:58:34Z | Commit `bc9ef740` introduced bcrypt PIN hashing and the migration script | First code/migration boundary |
| 2026-07-03T12:58:36Z–12:59:11Z | Deployment workflow run `28662109797` for that commit completed successfully | Browser equality check became incompatible with hashed stored values in production |
| 2026-07-03T13:42:53Z | Commit `9e92d9f8` added `workerAuth.verifyPinBcrypt` | Server-side verifier became available |
| 2026-07-03T13:47:16Z | Commit `008bca26` removed plaintext fallback | Server-side authentication became bcrypt-only |

The hashing deployment is the earliest supported date for the browser regression. The public-list no-PIN bypass was already present in the earliest available worker-page source commitment (`90132e27`, 2026-04-18), but previous history is unavailable, so this record does not claim an earlier introduction date.

## Approved synthetic-worker cleanup evidence

The synthetic Survey account was disabled and rotated in R-008. Its automatically provisioned Field Scheduler shadow worker (ID `15007`) remained active until the owner-approved cleanup. The scoped transaction locked and checked that one record, updated only `status` from `active` to `inactive`, and returned `affectedRows=1`.

| Field | Before | After |
|---|---|---|
| Worker ID | 15007 | 15007 |
| Status | active | inactive |
| Role | supervisor | supervisor |
| Created at | 2026-08-23T11:41:41Z | unchanged |
| Updated at | 2026-08-23T11:41:41Z | 2026-08-23T17:10:20Z |
| Survey link | present | preserved |

No worker row was deleted, no other worker was changed, and no scheduler or credentials were altered.

## Gate D closure and process finding

The frozen baseline was 1,004 customers with both `maf` and `buildingId` null. Exactly one was created after 2026-07-20; 1,003 join `contactSyncFailures` for `syncRunId=16`. Available failure payloads do not include historical `buildingId`, and no July pre-fix customer snapshot/backup was available after the Jul 28 restart sequence. The original expected 87 cannot be reconstructed or proven.

The owner has closed Gate D as **remediation-equivalent**: the 1,003 run-16-associated customers move to the genuine-assignment queue. This is a routing decision, not proof that 87 rows were modified by the sync fix.

> **Process finding:** The sync-fix deployment’s durable-snapshot condition was never explicitly confirmed. The necessary evidence did not survive the Jul 28 restart sequence. Future gated data changes must report explicit completion of every condition in the next report, and evidence artifacts must be committed or stored in an approved durable location—not solely in `/tmp`.

## Zoho preflight versus actual job path

The original quota preflight refreshed using the `.env` `ZOHO_REFRESH_TOKEN`. It received `HTTP 401`, Zoho code `57`, from `GET /books/v3/contacts`, with no rate-limit headers.

The scheduled application path does not necessarily use that source: `zoho.ts` loads `zohoTokens.refreshToken` from the database at process startup, then refreshes with that token when the cached access token is expired. A read-only source comparison confirmed that the database refresh token **does not match** the `.env` refresh token. The original 401/code 57 is therefore a **preflight artifact**, not a demonstrated scheduled-job authorization failure.

A single read-only probe that replicated the actual scheduler construction—database refresh token, form-encoded OAuth token request, `Zoho-oauthtoken` header, and `/books/v3/contacts` with the configured organization scope—returned:

| Measure | Result |
|---|---|
| OAuth refresh | HTTP 200 |
| Books contacts request | HTTP 200 |
| Zoho response | `code=0`, `message=success` |
| Rate limit | `x-rate-limit-limit=11000` |
| Remaining at probe | `x-rate-limit-remaining=10982` |
| Reset indicator | `x-rate-limit-reset=20808` seconds |

The run remains armed: `enabled=1`, `scheduleTime=09:00`, `nextRunAt=2026-08-24T09:00:00Z`, and PM2 remained online after the probe. No run, restart, credential update, or scheduler setting was changed.

## R-010 evidence contract

R-010 will explicitly state which gate conditions were fulfilled, and which were not. It will include the raw new `zohoSyncHistory` row, timing and duration, rate-limit/retry evidence, the post-run MAF comparison against the frozen baseline, and the persisted next-run state. A high invoice count alone is expected after the dormant month and will not be classified as failure without raw error evidence.

## References

1. `client/src/pages/WorkerMobile.tsx`, client-side worker selection and PIN comparison.
2. `server/routers/workerAuth.ts`, bcrypt server verifier and public worker directory route.
3. Git commits `bc9ef740`, `9e92d9f8`, `008bca26`; GitHub Actions deployment run `28662109797`.
4. Production read-only worker aggregate and scoped worker ID 15007 transaction, 2026-08-23.
5. `server/services/zoho.ts`, actual token and contacts client path; production read-only preflight probes, 2026-08-23.
