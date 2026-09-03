ALTER TABLE `complianceViolations` ADD COLUMN `evidenceKeys` text;
ALTER TABLE `paymentEvidence` ADD COLUMN `fileKey` varchar(1024);
ALTER TABLE `customerVisitNotes` ADD COLUMN `photoStorageKey` varchar(1024);
