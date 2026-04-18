CREATE TABLE `zohoSyncHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`syncType` varchar(50) NOT NULL,
	`status` enum('pending','in_progress','success','failed') NOT NULL DEFAULT 'pending',
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`totalContacts` int DEFAULT 0,
	`syncedContacts` int DEFAULT 0,
	`failedContacts` int DEFAULT 0,
	`fieldManagerCount` int DEFAULT 0,
	`customermafCount` int DEFAULT 0,
	`errorMessage` text,
	`errorStack` text,
	`durationMs` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `zohoSyncHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `zohoSyncJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobName` varchar(255) NOT NULL,
	`enabled` tinyint unsigned NOT NULL DEFAULT 1,
	`scheduleType` enum('hourly','daily','weekly','monthly') NOT NULL DEFAULT 'daily',
	`scheduleTime` varchar(50),
	`scheduleDay` varchar(20),
	`lastRunAt` timestamp,
	`nextRunAt` timestamp,
	`lastStatus` enum('pending','success','failed') DEFAULT 'pending',
	`lastErrorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `zohoSyncJobs_id` PRIMARY KEY(`id`)
);
