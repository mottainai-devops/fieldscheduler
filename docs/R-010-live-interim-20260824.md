# R-010 — Live Interim: Scheduled Zoho Sync and No-PIN Containment

**Snapshot:** 2026-08-24T09:11:52Z. The scheduled sync is still running. This is deliberately a partial report; final counters, duration, and terminal quota evidence will be appended only after the history row completes.

## 1. Scheduled run status

**Yes — a new row appeared after id 29.** The owner-approved scheduled run started at exactly `2026-08-24T09:00:00.000Z`.

```json
{
  "id": 30,
  "syncType": "scheduled",
  "status": "in_progress",
  "startedAt": "2026-08-24T09:00:00.000Z",
  "completedAt": null,
  "totalContacts": 0,
  "syncedContacts": 0,
  "failedContacts": 0,
  "excludedContacts": 0,
  "invoiceSyncedCount": null,
  "invoiceFailedCount": null,
  "durationMs": null,
  "errorMessage": null
}
```

At the snapshot, the scheduler job row was enabled, had `lastRunAt=2026-08-24T09:00:00Z`, `lastStatus=pending`, and still showed `nextRunAt=2026-08-24T09:00:00Z`. That is normal while the execution is in progress; the next time is written at terminal handling. PM2 remained online. No manual run, restart, scheduler mutation, or credential update occurred.

## 2. Zoho events during the live interval

The observer began at `08:55:02Z`. It recorded the new id-30 row after the trigger. By the 09:11:52Z snapshot, the observer’s log stream contained **7 lines matching HTTP 429** and **0 lines matching the terminal phrase “rate limit.”** The final event interpretation is pending completion: a retrying 429 is not yet evidence of a failed run, and no quota remainder is inferred from it.

## 3. In-progress MAF comparison

| Measure | Frozen baseline | 09:11:52Z live snapshot | Movement |
|---|---:|---:|---:|
| Both `maf` and `buildingId` null | 1,004 | 1,013 | +9 |
| Both-null created after 2026-07-20 | 1 | 10 | +9 |
| Both-null associated with run-16 failures | 1,003 | 1,003 | 0 |

This is not a terminal MAF result. The current +9 appears entirely in the post-20-July component while id 30 is in progress; it must be rechecked only after id 30 reaches a terminal state before any causal conclusion is made.

## 4. Approved no-PIN containment

The owner-designated workers `9683, 9722, 14999, 15000, 15001, 15002, 15003, 15004` were processed in one transaction. Preconditions required each selected row to be active and to have no PIN. All eight passed. The update changed only `status` from `active` to `inactive`; rows and all other recorded fields were preserved.

| Evidence | Result |
|---|---|
| Expected affected rows | 8 |
| Actual affected rows | 8 |
| Transaction time | 2026-08-24T08:12:23Z |
| Precondition failures | 0 |
| Rows deleted | 0 |
| Follow-up scheduler change | None |

## 5. Pending worker follow-up

No PIN rotation has occurred. The owner-confirmed rotation scope remains Halleluyah (7), Bukola (8), and Juwon (9). The current review of whether worker-row PINs for Adey (1), Wale (10), and Alaba (27) participate in a live login path, plus the dependency/provenance checks for ADMIN (2) and Aishat (15,005), remains in progress and is not used to justify a write in this interim report.

## 6. Next evidence required for final R-010

The final report will include id 30’s terminal raw row, duration, final contact and invoice counts, 429/retry/rate-limit evidence, persisted next-run time, terminal MAF comparison, and the completed ADMIN/Aishat/rotation-readiness findings.
