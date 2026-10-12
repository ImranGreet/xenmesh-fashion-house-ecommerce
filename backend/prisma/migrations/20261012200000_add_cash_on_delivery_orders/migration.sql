CREATE TABLE `Order` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `number` VARCHAR(40) NOT NULL,
    `customerName` VARCHAR(160) NOT NULL,
    `phone` VARCHAR(32) NOT NULL,
    `email` VARCHAR(254) NULL,
    `address` VARCHAR(500) NOT NULL,
    `city` VARCHAR(100) NULL,
    `notes` VARCHAR(1000) NULL,
    `paymentMethod` ENUM('CASH_ON_DELIVERY') NOT NULL DEFAULT 'CASH_ON_DELIVERY',
    `status` ENUM('NEW', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'NEW',
    `subtotal` DECIMAL(10, 2) NOT NULL,
    `total` DECIMAL(10, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Order_number_key`(`number`),
    INDEX `Order_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `Order_phone_idx`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `OrderItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `sku` VARCHAR(64) NOT NULL,
    `unitPrice` DECIMAL(10, 2) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `lineTotal` DECIMAL(10, 2) NOT NULL,

    INDEX `OrderItem_productId_idx`(`productId`),
    INDEX `OrderItem_orderId_idx`(`orderId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `OrderItem_orderId_fkey`
        FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
