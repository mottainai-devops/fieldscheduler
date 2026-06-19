-- Tranche 0 migration snapshot (applied out-of-band 2025-06-19)
-- These statements reproduce the two DDL changes made during Tranche 0.
-- Run this on a fresh DB after the base schema to reach production state.

-- Item 1: UNIQUE constraint on workers.surveyAppUserId
-- (The constraint already existed in production; this is the equivalent DDL)
ALTER TABLE workers
  ADD UNIQUE INDEX idx_workers_survey_app_user_id (surveyAppUserId);

-- Item 3: completion_type enum column on routeCustomers
ALTER TABLE routeCustomers
  ADD COLUMN completion_type
    ENUM('picked', 'skipped', 'not_attempted')
    NOT NULL DEFAULT 'not_attempted';

-- Backfill: mark rows with a completedAt timestamp as 'picked'
UPDATE routeCustomers
  SET completion_type = 'picked'
  WHERE completedAt IS NOT NULL;
