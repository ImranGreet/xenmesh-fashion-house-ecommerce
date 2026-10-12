CREATE TABLE `Category` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(80) NOT NULL,
    `slug` VARCHAR(96) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Category_name_key`(`name`),
    UNIQUE INDEX `Category_slug_key`(`slug`),
    INDEX `Category_active_name_idx`(`active`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `Category` (`name`, `slug`, `updatedAt`) VALUES
    ('T-shirts', 't-shirts', CURRENT_TIMESTAMP(3)),
    ('Panjabi', 'panjabi', CURRENT_TIMESTAMP(3)),
    ('Shirts', 'shirts', CURRENT_TIMESTAMP(3)),
    ('Trousers', 'trousers', CURRENT_TIMESTAMP(3)),
    ('Jeans', 'jeans', CURRENT_TIMESTAMP(3)),
    ('Dresses', 'dresses', CURRENT_TIMESTAMP(3)),
    ('Accessories', 'accessories', CURRENT_TIMESTAMP(3)),
    ('Wallets', 'wallets', CURRENT_TIMESTAMP(3)),
    ('Belts', 'belts', CURRENT_TIMESTAMP(3)),
    ('Bags', 'bags', CURRENT_TIMESTAMP(3));

INSERT INTO `Category` (`name`, `slug`, `updatedAt`)
SELECT grouped.`name`, CONCAT('legacy-', MD5(LOWER(grouped.`name`))), CURRENT_TIMESTAMP(3)
FROM (
    SELECT DISTINCT TRIM(`category`) AS `name`
    FROM `Product`
) AS grouped
LEFT JOIN `Category` AS existing ON existing.`name` = grouped.`name`
WHERE existing.`id` IS NULL;

ALTER TABLE `Product` ADD COLUMN `categoryId` INTEGER NULL;

UPDATE `Product` AS product
JOIN `Category` AS category ON category.`name` = TRIM(product.`category`)
SET product.`categoryId` = category.`id`;

ALTER TABLE `Product` MODIFY `categoryId` INTEGER NOT NULL;
CREATE INDEX `Product_categoryId_idx` ON `Product`(`categoryId`);
ALTER TABLE `Product`
    ADD CONSTRAINT `Product_categoryId_fkey`
    FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Product` DROP COLUMN `category`;
