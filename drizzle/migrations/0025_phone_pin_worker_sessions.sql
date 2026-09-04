-- Revocable short-lived sessions for verified phone/PIN field workers.
-- Raw session credentials are never stored in this table.
CREATE TABLE IF NOT EXISTS `workerPhonePinSessions` (
  `id` varchar(64) NOT NULL PRIMARY KEY,
  `workerId` int NOT NULL,
  `tokenHash` varchar(64) NOT NULL,
  `issuedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expiresAt` timestamp NOT NULL,
  `revokedAt` timestamp NULL,
  `lastUsedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `workerPhonePinSessions_workerId_idx` (`workerId`),
  KEY `workerPhonePinSessions_expiresAt_idx` (`expiresAt`)
);
