CREATE TABLE `calendarAuditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` enum('schedule','instance','schedule_customer','instance_override') NOT NULL,
	`entityId` int NOT NULL,
	`action` enum('created','updated','cancelled','rescheduled','customer_skipped','customer_removed','customer_added','handoff_requested','handoff_accepted','auto_paused') NOT NULL,
	`previousState` text,
	`newState` text,
	`actorType` enum('worker','admin','system') NOT NULL,
	`actorId` int,
	`actorName` varchar(255),
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `calendarAuditLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customerVisitNotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`routeId` int,
	`workerId` int,
	`authorType` enum('worker','admin') NOT NULL DEFAULT 'worker',
	`authorName` varchar(255),
	`noteText` text,
	`photoUrl` varchar(1024),
	`visitDate` varchar(50),
	`parentNoteId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customerVisitNotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `handoffRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int,
	`instanceId` int,
	`supervisorId` int NOT NULL,
	`reason` text NOT NULL,
	`status` enum('pending','accepted','declined') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `handoffRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoiceItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`quantity` decimal(10,2) NOT NULL,
	`rate` decimal(10,2) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	CONSTRAINT `invoiceItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`zohoInvoiceId` varchar(255) NOT NULL,
	`customerId` int,
	`fieldManagerId` varchar(255),
	`maf` varchar(255),
	`invoiceNumber` varchar(255) NOT NULL,
	`invoiceDate` date NOT NULL,
	`dueDate` date,
	`customerName` varchar(255),
	`total` decimal(10,2) NOT NULL,
	`balance` decimal(10,2) NOT NULL,
	`status` varchar(50) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_zohoInvoiceId_unique` UNIQUE(`zohoInvoiceId`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`zohoPaymentId` varchar(255) NOT NULL,
	`invoiceId` int,
	`customerId` int,
	`fieldManagerId` varchar(255),
	`maf` varchar(255),
	`paymentNumber` varchar(255) NOT NULL,
	`paymentDate` date NOT NULL,
	`customerName` varchar(255),
	`invoiceNumber` varchar(255),
	`amount` decimal(10,2) NOT NULL,
	`paymentMode` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_zohoPaymentId_unique` UNIQUE(`zohoPaymentId`)
);
--> statement-breakpoint
CREATE TABLE `routeInstanceCustomerOverrides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`instanceId` int NOT NULL,
	`customerId` int NOT NULL,
	`overrideType` enum('excluded','added','reordered') NOT NULL,
	`newDate` varchar(20),
	`handoffWorkerId` int,
	`skipReason` enum('no_access','customer_request','customer_not_present','safety_concern','bin_not_out','permanent_moved','permanent_closed','other'),
	`note` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `routeInstanceCustomerOverrides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `routeInstances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int NOT NULL,
	`originalDate` varchar(20) NOT NULL,
	`newDate` varchar(20),
	`instanceType` enum('cancelled','rescheduled','override') NOT NULL,
	`routeId` int,
	`notes` text,
	`startTimeOverride` varchar(10),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `routeInstances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `routeScheduleCustomers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int NOT NULL,
	`customerId` int NOT NULL,
	`status` enum('active','skipped','paused','removed') NOT NULL DEFAULT 'active',
	`skipReason` enum('no_access','customer_request','customer_not_present','safety_concern','bin_not_out','permanent_moved','permanent_closed','other'),
	`skipNote` text,
	`consecutiveSkips` int NOT NULL DEFAULT 0,
	`autoPausedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `routeScheduleCustomers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `routeSchedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workerId` int NOT NULL,
	`supervisorId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`rrule` varchar(500) NOT NULL,
	`dtstart` varchar(20) NOT NULL,
	`dtend` varchar(20),
	`exdates` text DEFAULT '[]',
	`rdates` text DEFAULT '[]',
	`lotCodes` text DEFAULT '[]',
	`status` enum('active','paused','ended','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `routeSchedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `zohoInvoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` varchar(255) NOT NULL,
	`invoiceNumber` varchar(255) NOT NULL,
	`customerId` varchar(255) NOT NULL,
	`customerName` varchar(255),
	`status` varchar(50),
	`invoiceDate` date,
	`dueDate` date,
	`total` decimal(10,2) NOT NULL,
	`balance` decimal(10,2) NOT NULL,
	`currencyCode` varchar(10) DEFAULT 'USD',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `zohoInvoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `zohoInvoices_invoiceId_unique` UNIQUE(`invoiceId`)
);
--> statement-breakpoint
CREATE TABLE `zohoPayments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`paymentId` varchar(255) NOT NULL,
	`paymentNumber` varchar(255),
	`customerId` varchar(255) NOT NULL,
	`customerName` varchar(255),
	`paymentMode` varchar(100),
	`paymentDate` date,
	`amount` decimal(10,2) NOT NULL,
	`currencyCode` varchar(10) DEFAULT 'USD',
	`description` text,
	`referenceNumber` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `zohoPayments_id` PRIMARY KEY(`id`),
	CONSTRAINT `zohoPayments_paymentId_unique` UNIQUE(`paymentId`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','field_manager','system_admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `customers` ADD `routeAssignmentStatus` enum('assigned','unassigned','untreated') DEFAULT 'unassigned';--> statement-breakpoint
ALTER TABLE `customers` ADD `arcgisBuildingId` varchar(100);--> statement-breakpoint
ALTER TABLE `customers` ADD `unitCode` varchar(20);--> statement-breakpoint
ALTER TABLE `customers` ADD `customerType` enum('residential','business') DEFAULT 'residential';--> statement-breakpoint
ALTER TABLE `customers` ADD `pickupFrequency` text DEFAULT (null);--> statement-breakpoint
ALTER TABLE `routeCustomers` ADD `pickedAt` timestamp;--> statement-breakpoint
ALTER TABLE `routeCustomers` ADD `completion_type` enum('picked','skipped','not_attempted') DEFAULT 'not_attempted' NOT NULL;--> statement-breakpoint
ALTER TABLE `routes` ADD `supervisorId` int;--> statement-breakpoint
ALTER TABLE `routes` ADD `isRecurring` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `routes` ADD `cadence` enum('daily','weekly','fortnightly','monthly');--> statement-breakpoint
ALTER TABLE `routes` ADD `recurrenceStartDate` varchar(50);--> statement-breakpoint
ALTER TABLE `routes` ADD `recurrenceEndDate` varchar(50);--> statement-breakpoint
ALTER TABLE `users` ADD `fieldManagerId` int;--> statement-breakpoint
ALTER TABLE `workers` ADD `role` enum('field_manager','supervisor') DEFAULT 'field_manager' NOT NULL;--> statement-breakpoint
ALTER TABLE `workers` ADD `preferredWebhookType` enum('payt','monthly');--> statement-breakpoint
ALTER TABLE `workers` ADD `surveyAppUserId` varchar(100);--> statement-breakpoint
ALTER TABLE `workers` ADD CONSTRAINT `workers_surveyAppUserId_unique` UNIQUE(`surveyAppUserId`);--> statement-breakpoint
ALTER TABLE `customerVisitNotes` ADD CONSTRAINT `customerVisitNotes_customerId_customers_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customerVisitNotes` ADD CONSTRAINT `customerVisitNotes_routeId_routes_id_fk` FOREIGN KEY (`routeId`) REFERENCES `routes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customerVisitNotes` ADD CONSTRAINT `customerVisitNotes_workerId_workers_id_fk` FOREIGN KEY (`workerId`) REFERENCES `workers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `handoffRequests` ADD CONSTRAINT `handoffRequests_scheduleId_routeSchedules_id_fk` FOREIGN KEY (`scheduleId`) REFERENCES `routeSchedules`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `handoffRequests` ADD CONSTRAINT `handoffRequests_instanceId_routeInstances_id_fk` FOREIGN KEY (`instanceId`) REFERENCES `routeInstances`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `handoffRequests` ADD CONSTRAINT `handoffRequests_supervisorId_workers_id_fk` FOREIGN KEY (`supervisorId`) REFERENCES `workers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoiceItems` ADD CONSTRAINT `invoiceItems_invoiceId_invoices_id_fk` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_customerId_customers_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_invoiceId_invoices_id_fk` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_customerId_customers_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `routeInstanceCustomerOverrides` ADD CONSTRAINT `routeInstanceCustomerOverrides_instanceId_routeInstances_id_fk` FOREIGN KEY (`instanceId`) REFERENCES `routeInstances`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `routeInstanceCustomerOverrides` ADD CONSTRAINT `routeInstanceCustomerOverrides_customerId_customers_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `routeInstanceCustomerOverrides` ADD CONSTRAINT `routeInstanceCustomerOverrides_handoffWorkerId_workers_id_fk` FOREIGN KEY (`handoffWorkerId`) REFERENCES `workers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `routeInstanceCustomerOverrides` ADD CONSTRAINT `routeInstanceCustomerOverrides_createdBy_workers_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `workers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `routeInstances` ADD CONSTRAINT `routeInstances_scheduleId_routeSchedules_id_fk` FOREIGN KEY (`scheduleId`) REFERENCES `routeSchedules`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `routeInstances` ADD CONSTRAINT `routeInstances_routeId_routes_id_fk` FOREIGN KEY (`routeId`) REFERENCES `routes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `routeScheduleCustomers` ADD CONSTRAINT `routeScheduleCustomers_scheduleId_routeSchedules_id_fk` FOREIGN KEY (`scheduleId`) REFERENCES `routeSchedules`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `routeScheduleCustomers` ADD CONSTRAINT `routeScheduleCustomers_customerId_customers_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `routeSchedules` ADD CONSTRAINT `routeSchedules_workerId_workers_id_fk` FOREIGN KEY (`workerId`) REFERENCES `workers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `routeSchedules` ADD CONSTRAINT `routeSchedules_supervisorId_workers_id_fk` FOREIGN KEY (`supervisorId`) REFERENCES `workers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `routes` ADD CONSTRAINT `routes_supervisorId_workers_id_fk` FOREIGN KEY (`supervisorId`) REFERENCES `workers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customers` DROP COLUMN `assignmentStatus`;