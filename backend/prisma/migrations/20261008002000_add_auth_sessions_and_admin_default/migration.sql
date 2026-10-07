ALTER TABLE `User` ALTER `role` SET DEFAULT 'ADMIN';

CREATE TABLE `AuthSession` (
    `id` CHAR(64) NOT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `lastActiveAt` DATETIME(3) NOT NULL,
    `mfa` VARCHAR(16) NULL,
    `metadata` JSON NULL,

    INDEX `AuthSession_userId_idx`(`userId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `AuthSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
