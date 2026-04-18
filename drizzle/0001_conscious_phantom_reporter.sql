CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` text,
	`latitude` varchar(50),
	`longitude` varchar(50),
	`serviceType` varchar(100) DEFAULT 'maintenance',
	`priority` enum('high','medium','low') DEFAULT 'medium',
	`buildingId` varchar(100),
	`zohoContactId` varchar(100),
	`coordinateSource` varchar(50) DEFAULT 'manual',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `routeCustomers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`routeId` int,
	`customerId` int,
	`sequenceNumber` int NOT NULL,
	`estimatedServiceTime` int DEFAULT 30,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `routeCustomers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `routes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workerId` int,
	`vehicleId` int,
	`totalDistance` varchar(50),
	`estimatedDuration` varchar(50),
	`efficiencyScore` int,
	`status` enum('pending','optimized','assigned','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
	`scheduledDate` varchar(50),
	`dispatchedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `routes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`plateNumber` varchar(50),
	`capacity` int DEFAULT 10,
	`status` enum('available','in_use','maintenance') NOT NULL DEFAULT 'available',
	`startLatitude` varchar(50) DEFAULT '6.5244',
	`startLongitude` varchar(50) DEFAULT '3.3792',
	`maxDistance` int DEFAULT 200,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workerLocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workerId` int,
	`latitude` varchar(50),
	`longitude` varchar(50),
	`batteryLevel` int,
	`signalStrength` varchar(20),
	`status` varchar(50) DEFAULT 'active',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workerLocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(50),
	`skills` text,
	`status` enum('active','inactive','on_leave') NOT NULL DEFAULT 'active',
	`shiftStart` varchar(10) DEFAULT '08:00',
	`shiftEnd` varchar(10) DEFAULT '17:00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `routeCustomers` ADD CONSTRAINT `routeCustomers_routeId_routes_id_fk` FOREIGN KEY (`routeId`) REFERENCES `routes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `routeCustomers` ADD CONSTRAINT `routeCustomers_customerId_customers_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `routes` ADD CONSTRAINT `routes_workerId_workers_id_fk` FOREIGN KEY (`workerId`) REFERENCES `workers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `routes` ADD CONSTRAINT `routes_vehicleId_vehicles_id_fk` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workerLocations` ADD CONSTRAINT `workerLocations_workerId_workers_id_fk` FOREIGN KEY (`workerId`) REFERENCES `workers`(`id`) ON DELETE no action ON UPDATE no action;