-- Add account activation state for teacher-created students.
ALTER TABLE `User`
  ADD COLUMN `passwordStatus` ENUM('NOT_SETUP', 'ACTIVE', 'RESET_REQUIRED', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN `lastLoginAt` DATETIME(3) NULL,
  ADD COLUMN `lastLoginDevice` TEXT NULL;

ALTER TABLE `Student`
  ADD COLUMN `firstLoginCompleted` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `firstLoginAt` DATETIME(3) NULL,
  ADD COLUMN `activeDeviceInfo` TEXT NULL;

CREATE TABLE `StudentActivationToken` (
  `id` VARCHAR(191) NOT NULL,
  `tokenHash` VARCHAR(191) NOT NULL,
  `instituteId` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `cardId` VARCHAR(191) NOT NULL,
  `method` ENUM('NFC', 'QR') NOT NULL,
  `deviceInfo` TEXT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `usedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `StudentActivationToken_tokenHash_key`(`tokenHash`),
  INDEX `StudentActivationToken_studentId_createdAt_idx`(`studentId`, `createdAt`),
  INDEX `StudentActivationToken_userId_idx`(`userId`),
  INDEX `StudentActivationToken_cardId_idx`(`cardId`),
  INDEX `StudentActivationToken_expiresAt_idx`(`expiresAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `User_passwordStatus_idx` ON `User`(`passwordStatus`);

ALTER TABLE `StudentActivationToken`
  ADD CONSTRAINT `StudentActivationToken_instituteId_fkey` FOREIGN KEY (`instituteId`) REFERENCES `Institute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `StudentActivationToken_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `StudentActivationToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `StudentActivationToken_cardId_fkey` FOREIGN KEY (`cardId`) REFERENCES `StudentCard`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
