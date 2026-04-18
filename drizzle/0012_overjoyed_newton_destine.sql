ALTER TABLE `customers` ADD `email` varchar(320);--> statement-breakpoint
ALTER TABLE `customers` ADD `phone` varchar(50);--> statement-breakpoint
ALTER TABLE `customers` ADD `customermaf` varchar(100);--> statement-breakpoint
ALTER TABLE `customers` ADD `fieldManager` int;--> statement-breakpoint
ALTER TABLE `customers` ADD `assignmentStatus` enum('assigned','unassigned') DEFAULT 'unassigned';--> statement-breakpoint
ALTER TABLE `customers` ADD CONSTRAINT `customers_fieldManager_workers_id_fk` FOREIGN KEY (`fieldManager`) REFERENCES `workers`(`id`) ON DELETE no action ON UPDATE no action;