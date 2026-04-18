CREATE TABLE `customerBuildingIds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`buildingId` varchar(100) NOT NULL,
	`buildingType` enum('main','annex') NOT NULL DEFAULT 'annex',
	`polygonReference` varchar(255),
	`notes` text,
	`lastServicedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customerBuildingIds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `customerBuildingIds` ADD CONSTRAINT `customerBuildingIds_customerId_customers_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;