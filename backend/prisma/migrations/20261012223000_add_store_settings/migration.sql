CREATE TABLE `StoreSettings` (
    `id` VARCHAR(24) NOT NULL DEFAULT 'store',
    `storeName` VARCHAR(160) NOT NULL,
    `contactEmail` VARCHAR(254) NOT NULL,
    `phone` VARCHAR(32) NOT NULL,
    `location` VARCHAR(160) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `StoreSettings` (`id`, `storeName`, `contactEmail`, `phone`, `location`, `updatedAt`)
VALUES ('store', 'Xenmesh Fashion House', 'xen@gmail.com', '01912444216', 'Dhaka, Bangladesh', CURRENT_TIMESTAMP(3));
