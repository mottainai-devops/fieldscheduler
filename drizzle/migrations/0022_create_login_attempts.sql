-- T42: DB-backed rate limiter (Rule #70 closure)
-- Replaces the in-memory Map in adminAuth.ts.
-- Each failed login attempt inserts a row. Rows older than 15 minutes
-- are excluded from the count and cleaned up on next write.
-- Lockout is determined by COUNT(*) WHERE attemptedAt > DATE_SUB(NOW(), INTERVAL 15 MINUTE).

CREATE TABLE IF NOT EXISTS `loginAttempts` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `email`       VARCHAR(320) NOT NULL,
  `attemptedAt` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_login_attempts_email_time` (`email`, `attemptedAt`)
);
