CREATE TABLE `RecognitionDevice` (
  `id` VARCHAR(191) NOT NULL,
  `instituteId` VARCHAR(191) NOT NULL,
  `deviceId` VARCHAR(191) NOT NULL,
  `label` VARCHAR(191) NULL,
  `location` VARCHAR(191) NULL,
  `trusted` BOOLEAN NOT NULL DEFAULT false,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `lastSeenAt` DATETIME(3) NULL,
  `lastUserAgent` TEXT NULL,
  `createdById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `RecognitionDevice_instituteId_deviceId_key`(`instituteId`, `deviceId`),
  INDEX `RecognitionDevice_instituteId_isActive_idx`(`instituteId`, `isActive`),
  INDEX `RecognitionDevice_deviceId_idx`(`deviceId`),
  CONSTRAINT `RecognitionDevice_instituteId_fkey` FOREIGN KEY (`instituteId`) REFERENCES `Institute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
