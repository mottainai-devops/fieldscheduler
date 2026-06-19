# Tranche 0 — DB Verification & Migration Snapshot

This file records the out-of-band DDL applied to the production `fieldworker_db`
during Tranche 0, along with captured `SHOW INDEX` / `SHOW COLUMNS` output
confirming the DB matches `drizzle/schema.ts`.

---

## Item 1 — UNIQUE constraint on `workers.surveyAppUserId`

The constraint already existed in production before Tranche 0 (created in an
earlier remediation pass). `drizzle/schema.ts:60` was updated to add `.unique()`
to reflect the existing DB state.

### SQL equivalent (idempotent form)

```sql
-- The index was created as:
-- ALTER TABLE workers ADD UNIQUE INDEX idx_workers_survey_app_user_id (surveyAppUserId);
-- No new migration needed; constraint pre-existed.
```

### Production DB capture (2025-06-19)

```
Table    Non_unique  Key_name                        Seq_in_index  Column_name      Collation  Cardinality  ...  Index_type
workers  0           idx_workers_survey_app_user_id  1             surveyAppUserId  A          1            ...  BTREE
```

`Non_unique=0` confirms the UNIQUE constraint is in place.

---

## Item 3 — `completion_type` enum column on `routeCustomers`

Applied via out-of-band `ALTER TABLE` on 2025-06-19.

### SQL applied to production

```sql
ALTER TABLE routeCustomers
  ADD COLUMN completion_type
    ENUM('picked', 'skipped', 'not_attempted')
    NOT NULL DEFAULT 'not_attempted';

-- Backfill: existing rows with completedAt IS NOT NULL → 'picked'
-- (128 rows at migration time; all had completedAt IS NULL, so no rows updated)
UPDATE routeCustomers
  SET completion_type = 'picked'
  WHERE completedAt IS NOT NULL;
```

### Production DB capture (2025-06-19)

```
Field            Type                                   Null  Key  Default        Extra
completion_type  enum('picked','skipped','not_attempted')  NO        not_attempted
```

Shape matches `drizzle/schema.ts:171`:
```ts
completionType: mysqlEnum("completion_type", ["picked", "skipped", "not_attempted"])
  .notNull()
  .default("not_attempted"),
```

---

## Notes

- Neither change was run through `drizzle-kit generate/migrate` because both were
  applied out-of-band before the migration tooling was in place for this project.
- This file serves as the authoritative record of what DDL would need to run on a
  fresh DB to reproduce production state for these two columns/constraints.
- All subsequent schema changes should go through `pnpm db:push` (drizzle-kit).
