# R-009A — Worker Containment Decision Roster

**Purpose:** Read-only roster for Adey’s marked-list decision before any no-PIN containment write. No worker has been changed for this roster. The approved synthetic test-supervisor deactivation predates this snapshot.

**Snapshot time:** 2026-08-23. **Last activity proxy:** the latest of three inexpensive operational timestamps when present: worker-location update, assigned-route update, or completed route stop. A null value means none of these three proxies was found; it does not prove that the person has never used another application surface.

## Currently active workers — 16 rows

| Worker ID | Name | Role | PIN state | Last activity proxy | Decision flag |
|---:|---|---|---|---|---|
| 1 | adey adewuyi | field manager | hashed | None found | — |
| 2 | ADMIN | field manager | hashed | None found | — |
| 7 | Halleluyah | field manager | hashed | None found | **Halleluyah (7)** |
| 8 | Bukola | field manager | hashed | Route update: 2026-08-19T15:55:51Z | **Bukola (8)** |
| 9 | Juwon | field manager | hashed | Route update: 2026-08-22T14:27:01Z | **Juwon (9)** |
| 10 | Wale Onibudo | field manager | hashed | None found | — |
| 27 | Alaba | field manager | hashed | Route update: 2026-08-18T15:46:04Z | — |
| 9,683 | Low.low income | field manager | none | None found | Candidate: no PIN |
| 9,722 | Low.Low income. | field manager | none | None found | Candidate: no PIN |
| 14,999 | Kunle Akande | supervisor | none | None found | Candidate: no PIN |
| 15,000 | Oluwajuwonlo | supervisor | none | None found | Candidate: no PIN |
| 15,001 | Outside IBsw now Ido LGA | field manager | none | None found | Candidate: no PIN |
| 15,002 | Outside IbSW | field manager | none | None found | Candidate: no PIN |
| 15,003 | Outside IBSW now Oluyole LGA. | field manager | none | None found | Candidate: no PIN |
| 15,004 | Bukola | supervisor | none | Route update: 2026-07-25T09:34:34Z | Candidate: no PIN; distinct from Bukola (8) |
| 15,005 | Aishat | field manager | hashed | None found | — |

## Reconciliation — all 17 worker rows

| Population | Hashed PIN | No PIN | Other / plaintext | Total |
|---|---:|---:|---:|---:|
| Active | 8 | 8 | 0 | 16 |
| Inactive | 0 | 1 | 0 | 1 |
| **All workers** | **8** | **9** | **0** | **17** |

The apparent count gap is resolved by the **17th row**: worker ID **15,007**, the synthetic `test-supervisor-t60` shadow worker, is now **inactive** with no PIN. It was the owner-approved cleanup record and is not an active no-PIN containment candidate.

The eight active no-PIN workers are the only candidates for Adey’s marked list. The no-PIN condition is an active browser-authentication bypass in the current pre-login web flow; however, this roster does **not** authorize any broader change. On receipt of Adey’s marked list, the containment transaction will update only those IDs from `active` to `inactive`, preserve each row, and report before/after timestamps and affected-row count.

## Sources

1. Read-only production `workers` aggregate and roster query, 2026-08-23; no PIN values were retrieved or retained.
2. Read-only `workerLocations`, `routes`, and `routeCustomers` aggregate proxies, 2026-08-23.
3. Owner-approved cleanup transaction for worker ID 15,007, recorded in `docs/R-009-routing-addendum.md`.
