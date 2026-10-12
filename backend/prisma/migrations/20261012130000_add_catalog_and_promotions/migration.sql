CREATE TABLE `Product` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(160) NOT NULL,
    `category` VARCHAR(80) NOT NULL,
    `sku` VARCHAR(64) NOT NULL,
    `description` TEXT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Product_sku_key`(`sku`),
    INDEX `Product_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Promotion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(160) NOT NULL,
    `campaignType` ENUM('SELECTED_PRODUCTS', 'CATEGORY', 'MONTHLY', 'EVENT') NOT NULL,
    `targetType` ENUM('PRODUCTS', 'CATEGORY', 'STOREWIDE') NOT NULL,
    `targetValue` VARCHAR(160) NULL,
    `discountPercent` INTEGER NOT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Promotion_active_startsAt_endsAt_idx`(`active`, `startsAt`, `endsAt`),
    INDEX `Promotion_targetType_targetValue_idx`(`targetType`, `targetValue`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ProductPromotion` (
    `productId` INTEGER NOT NULL,
    `promotionId` INTEGER NOT NULL,

    INDEX `ProductPromotion_promotionId_idx`(`promotionId`),
    PRIMARY KEY (`productId`, `promotionId`),
    CONSTRAINT `ProductPromotion_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `ProductPromotion_promotionId_fkey` FOREIGN KEY (`promotionId`) REFERENCES `Promotion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
