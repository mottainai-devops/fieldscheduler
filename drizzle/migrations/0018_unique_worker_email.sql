-- Migration 0018: Add UNIQUE constraint on workers.email
-- Applied after full duplicate worker cleanup (Tranche 11)
-- Pre-flight: SELECT email, COUNT(*) FROM workers GROUP BY email HAVING COUNT(*) > 1
-- must return 0 rows before running this migration.

ALTER TABLE `workers` ADD CONSTRAINT `workers_email_unique` UNIQUE (`email`);
