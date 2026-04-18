CREATE TABLE `fieldManagerTags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fieldManagerId` int NOT NULL,
	`customermaf` varchar(100) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fieldManagerTags_id` PRIMARY KEY(`id`),
	CONSTRAINT `fieldManagerTags_fieldManagerId_customermaf_unique` UNIQUE(`fieldManagerId`,`customermaf`)
);
--> statement-breakpoint
CREATE TABLE `tagBasedRoutes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`routeName` varchar(255) NOT NULL,
	`fieldManagerId` int NOT NULL,
	`customermafTags` text,
	`scheduledDate` timestamp,
	`status` enum('pending','in_progress','completed','cancelled') DEFAULT 'pending',
	`totalCustomers` int DEFAULT 0,
	`optimizationScore` varchar(10),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tagBasedRoutes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `fieldManagerTags` ADD CONSTRAINT `fieldManagerTags_fieldManagerId_workers_id_fk` FOREIGN KEY (`fieldManagerId`) REFERENCES `workers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tagBasedRoutes` ADD CONSTRAINT `tagBasedRoutes_fieldManagerId_workers_id_fk` FOREIGN KEY (`fieldManagerId`) REFERENCES `workers`(`id`) ON DELETE no action ON UPDATE no action;