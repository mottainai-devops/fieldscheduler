CREATE TABLE `workerNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workerId` int NOT NULL,
	`type` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`relatedId` int,
	`isRead` tinyint unsigned NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workerNotifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `workerNotifications` ADD CONSTRAINT `workerNotifications_workerId_workers_id_fk` FOREIGN KEY (`workerId`) REFERENCES `workers`(`id`) ON DELETE no action ON UPDATE no action;