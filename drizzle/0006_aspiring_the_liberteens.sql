CREATE TABLE `buildingIdLinkageRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mainCustomerId` int NOT NULL,
	`annexCustomerId` int NOT NULL,
	`requestedBy` int NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`notes` text,
	`rejectionReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `buildingIdLinkageRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customerBuildingIdRelations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mainCustomerId` int NOT NULL,
	`annexCustomerId` int NOT NULL,
	`linkedBy` int NOT NULL,
	`approvedBy` int NOT NULL,
	`approvedAt` timestamp NOT NULL DEFAULT (now()),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customerBuildingIdRelations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `customerBuildingIds`;--> statement-breakpoint
ALTER TABLE `buildingIdLinkageRequests` ADD CONSTRAINT `buildingIdLinkageRequests_mainCustomerId_customers_id_fk` FOREIGN KEY (`mainCustomerId`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `buildingIdLinkageRequests` ADD CONSTRAINT `buildingIdLinkageRequests_annexCustomerId_customers_id_fk` FOREIGN KEY (`annexCustomerId`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `buildingIdLinkageRequests` ADD CONSTRAINT `buildingIdLinkageRequests_requestedBy_workers_id_fk` FOREIGN KEY (`requestedBy`) REFERENCES `workers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `buildingIdLinkageRequests` ADD CONSTRAINT `buildingIdLinkageRequests_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customerBuildingIdRelations` ADD CONSTRAINT `customerBuildingIdRelations_mainCustomerId_customers_id_fk` FOREIGN KEY (`mainCustomerId`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customerBuildingIdRelations` ADD CONSTRAINT `customerBuildingIdRelations_annexCustomerId_customers_id_fk` FOREIGN KEY (`annexCustomerId`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customerBuildingIdRelations` ADD CONSTRAINT `customerBuildingIdRelations_linkedBy_workers_id_fk` FOREIGN KEY (`linkedBy`) REFERENCES `workers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customerBuildingIdRelations` ADD CONSTRAINT `customerBuildingIdRelations_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;