-- AlterEnum
ALTER TABLE `StudentCard` MODIFY `status` ENUM('PRINT_PENDING', 'PRINTED', 'ACTIVE', 'INACTIVE', 'LOST', 'MISSING', 'STOLEN', 'DAMAGED', 'REPLACED', 'BLOCKED') NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE `CardPrintBatch` (
  `id` VARCHAR(191) NOT NULL,
  `instituteId` VARCHAR(191) NOT NULL,
  `batchNumber` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `status` ENUM('DRAFT', 'EXPORTED', 'SENT_TO_PRINT', 'PRINTED', 'RECEIVED', 'ASSIGNED') NOT NULL DEFAULT 'DRAFT',
  `studentCount` INTEGER NOT NULL DEFAULT 0,
  `exportedById` VARCHAR(191) NULL,
  `exportedAt` DATETIME(3) NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `CardPrintBatch_instituteId_batchNumber_key`(`instituteId`, `batchNumber`),
  INDEX `CardPrintBatch_instituteId_status_createdAt_idx`(`instituteId`, `status`, `createdAt`),
  INDEX `CardPrintBatch_exportedById_idx`(`exportedById`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CardPrintBatchItem` (
  `id` VARCHAR(191) NOT NULL,
  `instituteId` VARCHAR(191) NOT NULL,
  `batchId` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `studentCardId` VARCHAR(191) NOT NULL,
  `studentName` VARCHAR(191) NOT NULL,
  `studentIdNumber` VARCHAR(191) NOT NULL,
  `cardNumber` VARCHAR(191) NULL,
  `qrToken` VARCHAR(191) NOT NULL,
  `qrImageUrl` TEXT NULL,
  `status` ENUM('PRINT_PENDING', 'PRINTED', 'ACTIVE', 'LOST', 'MISSING', 'STOLEN', 'DAMAGED', 'REPLACED') NOT NULL DEFAULT 'PRINT_PENDING',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `CardPrintBatchItem_batchId_studentId_key`(`batchId`, `studentId`),
  INDEX `CardPrintBatchItem_instituteId_status_idx`(`instituteId`, `status`),
  INDEX `CardPrintBatchItem_studentId_idx`(`studentId`),
  INDEX `CardPrintBatchItem_studentCardId_idx`(`studentCardId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CardPrintBatch` ADD CONSTRAINT `CardPrintBatch_instituteId_fkey` FOREIGN KEY (`instituteId`) REFERENCES `Institute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CardPrintBatch` ADD CONSTRAINT `CardPrintBatch_exportedById_fkey` FOREIGN KEY (`exportedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CardPrintBatchItem` ADD CONSTRAINT `CardPrintBatchItem_instituteId_fkey` FOREIGN KEY (`instituteId`) REFERENCES `Institute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CardPrintBatchItem` ADD CONSTRAINT `CardPrintBatchItem_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `CardPrintBatch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CardPrintBatchItem` ADD CONSTRAINT `CardPrintBatchItem_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CardPrintBatchItem` ADD CONSTRAINT `CardPrintBatchItem_studentCardId_fkey` FOREIGN KEY (`studentCardId`) REFERENCES `StudentCard`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
