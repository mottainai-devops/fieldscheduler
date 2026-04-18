-- Create financial tables for Zoho Books integration
-- Safe to run - only creates new tables, doesn't modify existing data

-- Invoices table
CREATE TABLE IF NOT EXISTS `invoices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `zohoInvoiceId` VARCHAR(255) NOT NULL UNIQUE,
  `customerId` INT,
  `fieldManagerId` VARCHAR(255),
  `maf` VARCHAR(255),
  `invoiceNumber` VARCHAR(255) NOT NULL,
  `invoiceDate` DATE NOT NULL,
  `dueDate` DATE,
  `customerName` VARCHAR(255),
  `total` DECIMAL(10, 2) NOT NULL,
  `balance` DECIMAL(10, 2) NOT NULL,
  `status` VARCHAR(50) NOT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
  INDEX `idx_fieldManagerId` (`fieldManagerId`),
  INDEX `idx_maf` (`maf`),
  INDEX `idx_invoiceDate` (`invoiceDate`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payments table
CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `zohoPaymentId` VARCHAR(255) NOT NULL UNIQUE,
  `invoiceId` INT,
  `customerId` INT,
  `fieldManagerId` VARCHAR(255),
  `maf` VARCHAR(255),
  `paymentNumber` VARCHAR(255) NOT NULL,
  `paymentDate` DATE NOT NULL,
  `customerName` VARCHAR(255),
  `invoiceNumber` VARCHAR(255),
  `amount` DECIMAL(10, 2) NOT NULL,
  `paymentMode` VARCHAR(100),
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
  INDEX `idx_fieldManagerId` (`fieldManagerId`),
  INDEX `idx_maf` (`maf`),
  INDEX `idx_paymentDate` (`paymentDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invoice items table
CREATE TABLE IF NOT EXISTS `invoiceItems` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoiceId` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `quantity` DECIMAL(10, 2) NOT NULL,
  `rate` DECIMAL(10, 2) NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE CASCADE,
  INDEX `idx_invoiceId` (`invoiceId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify tables were created
SELECT 'Tables created successfully!' AS status;
SHOW TABLES LIKE '%invoice%';
SHOW TABLES LIKE '%payment%';
