CREATE TABLE `abatementNotices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int,
	`violationId` int,
	`noticeNumber` varchar(100),
	`status` enum('issued','acknowledged','complied','escalated') DEFAULT 'issued',
	`issuedDate` timestamp NOT NULL DEFAULT (now()),
	`dueDate` timestamp,
	`complianceDate` timestamp,
	`documentUrl` varchar(500),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `abatementNotices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `complianceViolations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int,
	`violationTypeId` int,
	`reportedBy` int,
	`status` enum('reported','under_review','resolved','dismissed') DEFAULT 'reported',
	`notes` text,
	`evidenceUrls` text,
	`reportedAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `complianceViolations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customerPaymentStatus` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`status` enum('paid','pending','overdue','partial') DEFAULT 'pending',
	`lastPaymentDate` timestamp,
	`outstandingBalance` varchar(50),
	`zohoInvoiceId` varchar(100),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customerPaymentStatus_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paymentEvidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int,
	`paymentDate` timestamp,
	`amount` varchar(50),
	`paymentMethod` varchar(100),
	`evidenceType` enum('receipt','bank_statement','invoice','other') DEFAULT 'receipt',
	`fileUrl` varchar(500),
	`fileName` varchar(255),
	`uploadedBy` int,
	`verificationStatus` enum('pending','verified','rejected') DEFAULT 'pending',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `paymentEvidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `violationTypes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`severity` enum('low','medium','high','critical') DEFAULT 'medium',
	`isCustom` int DEFAULT 0,
	`isActive` int DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `violationTypes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `abatementNotices` ADD CONSTRAINT `abatementNotices_customerId_customers_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `abatementNotices` ADD CONSTRAINT `abatementNotices_violationId_complianceViolations_id_fk` FOREIGN KEY (`violationId`) REFERENCES `complianceViolations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `complianceViolations` ADD CONSTRAINT `complianceViolations_customerId_customers_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `complianceViolations` ADD CONSTRAINT `complianceViolations_violationTypeId_violationTypes_id_fk` FOREIGN KEY (`violationTypeId`) REFERENCES `violationTypes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `complianceViolations` ADD CONSTRAINT `complianceViolations_reportedBy_workers_id_fk` FOREIGN KEY (`reportedBy`) REFERENCES `workers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customerPaymentStatus` ADD CONSTRAINT `customerPaymentStatus_customerId_customers_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `paymentEvidence` ADD CONSTRAINT `paymentEvidence_customerId_customers_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `paymentEvidence` ADD CONSTRAINT `paymentEvidence_uploadedBy_workers_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `workers`(`id`) ON DELETE no action ON UPDATE no action;