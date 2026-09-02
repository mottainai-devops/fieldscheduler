-- Component C / T59: durable incremental-invoice checkpoint and terminal classification.
-- The deployed migration runner performs equivalent idempotent guards before this
-- DDL. This source file is the migration record for code review and recovery.
CREATE TABLE IF NOT EXISTS zohoInvoiceSyncState (
  stateKey varchar(64) NOT NULL PRIMARY KEY,
  lastSuccessfulModifiedAt timestamp NULL,
  lastAttemptAt timestamp NULL,
  lastStatus varchar(32) NOT NULL DEFAULT 'not_initialized',
  lastError text NULL,
  updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

ALTER TABLE zohoSyncHistory ADD COLUMN invoiceStatus varchar(32) NULL;
