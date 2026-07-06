-- T39: Add pin column to users table for superadmin identity migration
-- Superadmin identities (adeyadewuyi@gmail.com, info@mottainai.africa) will
-- authenticate via users.pin instead of workers.pin, aligning with T14 canonical
-- architecture (Rule #69 closure).
--
-- Column type matches workers.pin: VARCHAR(255) to hold bcrypt hashes (60 chars)
-- with headroom for future algorithm changes.
--
-- Applied directly via SQL per Rule #81 (column renames/additions on production
-- must not go through pnpm db:push to avoid migration journal conflicts).

ALTER TABLE users ADD COLUMN pin VARCHAR(255) NULL;
