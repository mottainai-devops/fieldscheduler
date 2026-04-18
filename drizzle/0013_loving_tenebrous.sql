CREATE TABLE `filterPresets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workerId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`buildingId` varchar(50),
	`fieldManager` varchar(255),
	`searchCustomer` varchar(255),
	`assignmentStatus` varchar(50),
	`clusterMode` varchar(50),
	`clusterDistance` int,
	`customersPerCluster` int,
	`minClusterSize` int,
	`maxClusterRadius` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `filterPresets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `filterPresets` ADD CONSTRAINT `filterPresets_workerId_workers_id_fk` FOREIGN KEY (`workerId`) REFERENCES `workers`(`id`) ON DELETE no action ON UPDATE no action;