# R-011 — Credential Controls, id-31 Financial Observation, and Gated Next Tranche

**Reporting date:** 2026-08-25 UTC  
**Scope:** Owner-approved Aishat record correction, legacy ADMIN cleanup, three-worker PIN rotation and encrypted delivery, id-31 observation, and the next-tranche proposal.  
**No application deployment occurred.**

## Executive record

The approved worker-control actions were completed. Aishat (worker 15005) is recorded as a legitimate, owner-authorized active worker and was left untouched. Legacy worker `ADMIN` (2) was inactivated in a scoped preserved-row transaction. Halleluyah (7), Bukola (8), and Juwon (9) received new cryptographically generated four-digit PINs, stored as bcrypt hashes; one AES-256-GCM encrypted delivery file was sent to Adey’s Gmail account. No PIN or passphrase is recorded here or in the email. The encrypted file must remain only until Adey confirms private distribution to all three workers, after which the local and production encrypted copies will be destroyed.

The id-31 scheduled run completed its contact stage successfully but **again stopped the invoice phase at the Zoho rate limit**. Its history row persists `success` and zero invoice failures, but the financial log explicitly reports an incomplete rate-limited stop at 27,801 upserts. Wale/Alaba testing remains held until a complete financial pass is evidenced.

## 1. Aishat correction

| Item | Record |
|---|---|
| Worker | 15,005 — Aishat |
| Owner correction | Legitimate, owner-authorized onboarding around 2026-08-18 |
| Current action | None; row remains active and untouched |
| Survey linkage | Not applicable to the correction; no Survey shadow linkage was found |
| Zoho completeness | Deferred to her separate onboarding review |
| Provenance question | Closed by owner direction |

## 2. Legacy ADMIN cleanup

| Field | Before | After |
|---|---|---|
| Worker ID | 2 | 2 |
| Name / role | ADMIN / field_manager | ADMIN / field_manager |
| Status | active | inactive |
| Survey linkage | none | none |
| Stored credential state | bcrypt hash | bcrypt hash preserved |
| Row deletion | none | none |

The transaction affected exactly **one** row. The preserved row’s `updatedAt` is `2026-08-24T11:29:26Z`. The real `info@mottainai.africa` superadmin identity remains separate in the `users` table and was not modified.

## 3. Staff PIN rotation and delivery control

| Worker | ID | Rotation result | Database verification |
|---|---:|---|---|
| Halleluyah | 7 | replacement PIN generated | active, bcrypt hash stored |
| Bukola | 8 | replacement PIN generated | active, bcrypt hash stored |
| Juwon | 9 | replacement PIN generated | active, bcrypt hash stored |

The transaction completed at `2026-08-25T10:52:45.282Z` and affected exactly three rows. The three stored hashes were verified against the generated PINs before the transaction finished. The only delivery artifact is a 600-permission AES-256-GCM encrypted file. It was sent to `adeyadewuyi@gmail.com` through the connected Gmail account in a message containing neither PINs nor passphrase.

**Pending control:** Adey must confirm that all three named workers received their credentials privately. On that acknowledgment, the encrypted artifact will be removed from both the production temporary path and local secure workspace; the report will retain only the destruction timestamp.

## 4. id-31 terminal observation

```json
{
  "id": 31,
  "syncType": "scheduled",
  "status": "success",
  "startedAt": "2026-08-25T00:00:00.000Z",
  "completedAt": "2026-08-25T01:19:59.000Z",
  "totalContacts": 8794,
  "syncedContacts": 8794,
  "failedContacts": 0,
  "excludedContacts": 1432,
  "invoiceSyncedCount": 27801,
  "invoiceFailedCount": 0,
  "durationMs": 4798723,
  "errorMessage": null
}
```

The terminal financial log states:

> `Invoice sync stopped (rate limited): 27801 upserted, 0 failed, 8794 customers total`

| Comparison | id 30 | id 31 | Change |
|---|---:|---:|---:|
| Contact count | 8,794 | 8,794 | 0 |
| Contact failures | 0 | 0 | 0 |
| Invoice upserts before stop | 27,777 | 27,801 | +24 |
| Invoice failures | 0 | 0 | 0 |
| Duration | 5,056,833 ms | 4,798,723 ms | −258,110 ms |

The row’s `success` status currently means the scheduler handled the rate-limit stop without an exception. It does **not** evidence a complete financial pass. This ambiguity is explicitly addressed by the proposed T59 and scheduler-resilience work.

## 5. Next decision gates

1. **Credential delivery acknowledgment:** confirm that all three staff recipients have received their new PINs, authorizing encrypted-artifact destruction.
2. **Scheduler resilience:** approve the stored-schedule-time fix, startup database retry/readiness, and dead-man alert recipient/window.
3. **T59 incremental invoices:** approve durable checkpoint fields, overlap policy, and controlled full-versus-incremental validation.
4. **Pre-login redesign:** approve server-side bcrypt verification, limited worker session, and serializer-level PIN stripping.
5. **Gate A/B and coordinated APK:** approve the controlled write/cleanup envelope, API contract repairs, release version, and field acceptance recipients.

The detailed scope, order, tests, and estimated effort for gates 2–5 are in [R-011-tranche-proposal.md](R-011-tranche-proposal.md).

## Evidence sources

1. Owner-approved preserved-row transaction output for worker 2.
2. Owner-approved three-worker rotation transaction output and Gmail delivery confirmation.
3. Read-only production `zohoSyncHistory`/`zohoSyncJobs` snapshot and sanitized financial-sync terminal log for id 31.
4. `R-011-tranche-proposal.md` code-path and operational evidence.
