# R-010 — Scheduled Zoho Sync, MAF State, and Worker-Containment Evidence

**Run date:** 2026-08-24 UTC  
**Scope:** Owner-approved 09:00 UTC scheduled sync; read-only run observation; approved no-PIN containment; rotation-scope and identity dependency findings.  
**No manual sync, scheduler mutation, process restart, credential update, or customer mutation was performed.**

## Executive record

The scheduled run **did execute** at `09:00:00Z`. It created immutable history row **id 30**, completed with `status=success` at `10:24:17Z`, and ran for **5,056,833 ms** (1h 24m 16.833s). Contact synchronization completed with no reported contact failures. The financial phase encountered three logged invoice 429 retries and then a logged rate-limit stop; the job nevertheless persisted `success` and `invoiceFailedCount=0`. That outcome must not be read as proof that every possible invoice page was fetched: the financial-sync log says it stopped cleanly after the rate-limit event and will retry idempotently from the beginning on a future run.

The job’s persisted `nextRunAt` is now **2026-08-25T00:00:00Z**, despite the configured `scheduleTime=09:00`. This confirms the known hard-coded-`00:00` rescheduling defect remains live and must be corrected in the approved scheduler-resilience tranche. No scheduler state was changed in this work.

## 1. Raw terminal sync-history row

```json
{
  "id": 30,
  "syncType": "scheduled",
  "status": "success",
  "startedAt": "2026-08-24T09:00:00.000Z",
  "completedAt": "2026-08-24T10:24:17.000Z",
  "totalContacts": 8794,
  "syncedContacts": 8794,
  "failedContacts": 0,
  "excludedContacts": 1432,
  "invoiceSyncedCount": 27777,
  "invoiceFailedCount": 0,
  "durationMs": 5056833,
  "errorMessage": null
}
```

| Measure | id 29 — 2026-07-28 | id 30 — 2026-08-24 | Difference |
|---|---:|---:|---:|
| Status | success | success | — |
| Duration | 7,054,378 ms | 5,056,833 ms | −1,997,545 ms |
| Total contacts | 8,785 | 8,794 | +9 |
| Synced contacts | 8,785 | 8,794 | +9 |
| Failed contacts | 0 | 0 | 0 |
| Excluded contacts | 1,432 | 1,432 | 0 |
| Invoice upserts | 27,643 | 27,777 | +134 |
| Invoice failures | 0 | 0 | 0 |

## 2. Quota, retry, and rate-limit evidence

The pre-run probe of the actual database-token client path had shown a 11,000-request limit and 10,982 remaining. During id 30, the observer collected these sanitized financial-sync events:

> `[Zoho] 429 on invoices for [redacted-id] page 1, retry 1/3 after 1000ms`  
> `[Zoho] 429 on invoices for [redacted-id] page 1, retry 2/3 after 2000ms`  
> `[Zoho] 429 on invoices for [redacted-id] page 1, retry 3/3 after 4000ms`  
> `[Zoho Financial Sync] Rate limit hit after 27777 invoices. Stopping cleanly — next run will resume from the beginning (upsert is idempotent).`

The final aggregate was **three invoice 429 retry lines** and **one terminal rate-limit-stop line**. The procedure reports the run as successful and persisted `invoiceFailedCount=0`, because the scheduler treats the stop as clean. This is an important operational distinction: success confirms the sync completed under the application’s current contract, not that Zoho quota was unused or that a full financial pass is independently proven.

## 3. Scheduler state and observation quality

| Field | Terminal value |
|---|---|
| PM2 process | online; one historical restart; no unstable restarts |
| `enabled` | 1 |
| Stored `scheduleTime` | 09:00 |
| `lastRunAt` | 2026-08-24T09:00:00Z |
| `lastStatus` | success |
| Persisted `nextRunAt` | 2026-08-25T00:00:00Z |

The staged observer captured the pre-run baseline and new id-30 row. Its final automated MAF step used an obsolete `contactSyncFailures.customerId` column name and therefore wrote `monitor_error` after completion. The final MAF calculation below was rerun read-only using the actual `contactSyncFailures.contactId = customers.zohoContactId` relation. The observer defect affects only the auxiliary evidence collector; it did not affect the scheduler or the sync.

## 4. Post-run MAF comparison

| Measure | Frozen baseline | Terminal id-30 check | Movement |
|---|---:|---:|---:|
| Both `maf` and `buildingId` null | 1,004 | 1,013 | +9 |
| Both-null created after 2026-07-20 | 1 | 10 | +9 |
| Both-null associated with run-16 failures | 1,003 | 1,003 | 0 |

The total-contact increase (+9) exactly matches the both-null and post-20-July increases (+9), while the run-16-associated population is unchanged. This is **consistent with nine newly introduced post-20-July contacts lacking both fields**. It is not an individual-record attribution; no customer content or identifiers were retained. The Gate D remediation-equivalent queue remains 1,003 run-16-associated customers.

## 5. Owner-approved no-PIN containment

The one-transaction containment targeted workers `9683, 9722, 14999, 15000, 15001, 15002, 15003, 15004`. Each row was locked, verified `active` with no PIN, and then changed only to `inactive`.

| Evidence | Result |
|---|---|
| Expected affected rows | 8 |
| Actual affected rows | 8 |
| Precondition failures | 0 |
| Rows deleted | 0 |
| Status before | active |
| Status after | inactive |
| Shared update timestamp | 2026-08-24T08:12:23Z |

The synthetic test-supervisor shadow worker 15007 remained separately inactive. No listed worker was deleted, no PIN value was read or written, and no other worker row changed.

## 6. Rotation scope and worker-identity findings

### Staff rotation

The owner-confirmed rotation scope is limited to **Halleluyah (7), Bukola (8), and Juwon (9)**. All three records are active field managers with bcrypt-hashed worker PINs. The rows have operational references: field-manager customer assignments for Halleluyah and Juwon, field-manager tags for all three, route references for Bukola and Juwon, and a small number of activity/notification references. These are reasons to rotate rather than inactivate.

No replacement PIN has yet been generated or persisted. The approved delivery plan requires encrypted one-time delivery to Adey and destruction after acknowledgment; an approved encryption/delivery route must be supplied before credentials are generated.

### Adey, Wale, and Alaba worker PINs

The current `adminAuth.login` implementation checks `USERS_TABLE_EMAILS` first. Adey, Wale, and Alaba are all in that set and authenticate against **`users.pin`**, not `workers.pin`. Read-only production checks found active users-table credentials for all three; their current users-table roles are superadmin (Adey) and admin (Wale and Alaba). Therefore, their **worker-row PINs are not their current intended admin-login credentials**, and no worker-PIN rotation is required for them in this staff rotation.

### ADMIN (2)

Worker ID 2 is active, has a bcrypt worker PIN, has no Survey linkage, and had no foreign-key worker references in the dependency check. The real `info@mottainai.africa` superadmin session is a separate users-table identity with a current users-table PIN and a recorded sign-in at `2026-08-24T10:27:23Z`; that login does not traverse worker ID 2. **Proposal:** inactivate worker ID 2 in a future scoped cleanup, preserving its row. No such write has been made.

### Aishat (15005)

| Finding | Evidence |
|---|---|
| Created | 2026-08-18T13:06:31Z |
| Role / status | active field manager |
| Survey linkage | absent |
| Worker PIN | bcrypt-hashed |
| Creation path | Not proven from available retained logs. She is not a Survey shadow worker; no explicit retained Zoho or admin-create log binds the creation event to one route. |
| Current Field Scheduler dependency | active `users` record with `fieldManagerId=15005`; last sign-in 2026-08-21T14:50:07Z; retained logs show worker login and scoped customer access. |

Because Aishat has a current Field Scheduler identity and recent authenticated use, the condition “if nothing depends on the row” is **not met**. Do not inactivate her under the current evidence. Her Zoho/onboarding completeness should be resolved in a separate explicit onboarding review.

## 7. Remaining approval gates

1. Supply the approved encrypted one-time delivery route for the three staff PINs; only then generate, bcrypt-store, and deliver them.
2. Approve or decline the scoped `ADMIN` (2) inactivation proposal.
3. Gate a separate Aishat onboarding/Zoho-review decision; current evidence does not support a temporary inactivation.
4. Authorize the scheduled resilience/default-deny tranche, including the hard-coded `00:00` reschedule correction, boot-time database retry/dead-man monitoring, and the server-side pre-login worker verification redesign.

## Evidence sources

1. Production `zohoSyncHistory` and `zohoSyncJobs` read-only terminal snapshot, 2026-08-24.
2. Read-only observer artifacts under production `evidence/r010/` and sanitized Zoho retry event lines.
3. Read-only customer aggregate query for the three Gate D / MAF measures.
4. Scoped no-PIN worker containment transaction output, 2026-08-24T08:12:23Z.
5. Read-only `workers`, `users`, foreign-key dependency, and retained authentication-log checks.
