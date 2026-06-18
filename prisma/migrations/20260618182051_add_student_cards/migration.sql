-- AlterTable
ALTER TABLE `institutesettings` ADD COLUMN `cardAllowNfcOnly` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `cardAllowQrOnly` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `cardAutoGenerateQrToken` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `cardNotifyAdminOnLostOrStolenScan` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `cardNotifyParentOnReplacement` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `cardReplacementFee` DECIMAL(10, 2) NULL,
    ADD COLUMN `cardRequireBothNfcAndQr` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `cardRequireDuringRegistration` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `StudentCard` (
    `id` VARCHAR(191) NOT NULL,
    `instituteId` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `cardNumber` VARCHAR(191) NULL,
    `nfcUid` VARCHAR(191) NULL,
    `qrCode` VARCHAR(191) NULL,
    `qrToken` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'LOST', 'MISSING', 'STOLEN', 'DAMAGED', 'REPLACED', 'BLOCKED') NOT NULL DEFAULT 'ACTIVE',
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `activatedAt` DATETIME(3) NULL,
    `deactivatedAt` DATETIME(3) NULL,
    `replacedAt` DATETIME(3) NULL,
    `lostReportedAt` DATETIME(3) NULL,
    `stolenReportedAt` DATETIME(3) NULL,
    `missingReportedAt` DATETIME(3) NULL,
    `damagedReportedAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `issuedById` VARCHAR(191) NULL,
    `replacedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StudentCard_instituteId_status_idx`(`instituteId`, `status`),
    INDEX `StudentCard_studentId_status_idx`(`studentId`, `status`),
    INDEX `StudentCard_issuedById_idx`(`issuedById`),
    INDEX `StudentCard_replacedById_idx`(`replacedById`),
    UNIQUE INDEX `StudentCard_instituteId_cardNumber_key`(`instituteId`, `cardNumber`),
    UNIQUE INDEX `StudentCard_instituteId_nfcUid_key`(`instituteId`, `nfcUid`),
    UNIQUE INDEX `StudentCard_instituteId_qrCode_key`(`instituteId`, `qrCode`),
    UNIQUE INDEX `StudentCard_instituteId_qrToken_key`(`instituteId`, `qrToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudentCardHistory` (
    `id` VARCHAR(191) NOT NULL,
    `instituteId` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `cardId` VARCHAR(191) NOT NULL,
    `action` ENUM('ISSUED', 'ASSIGNED', 'ACTIVATED', 'DEACTIVATED', 'MARKED_LOST', 'MARKED_MISSING', 'MARKED_STOLEN', 'MARKED_DAMAGED', 'REPLACED', 'BLOCKED', 'UNBLOCKED') NOT NULL,
    `previousStatus` ENUM('ACTIVE', 'INACTIVE', 'LOST', 'MISSING', 'STOLEN', 'DAMAGED', 'REPLACED', 'BLOCKED') NULL,
    `newStatus` ENUM('ACTIVE', 'INACTIVE', 'LOST', 'MISSING', 'STOLEN', 'DAMAGED', 'REPLACED', 'BLOCKED') NULL,
    `previousNfcUid` VARCHAR(191) NULL,
    `newNfcUid` VARCHAR(191) NULL,
    `previousQrCode` VARCHAR(191) NULL,
    `newQrCode` VARCHAR(191) NULL,
    `reason` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `performedById` VARCHAR(191) NULL,
    `performedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StudentCardHistory_instituteId_performedAt_idx`(`instituteId`, `performedAt`),
    INDEX `StudentCardHistory_studentId_performedAt_idx`(`studentId`, `performedAt`),
    INDEX `StudentCardHistory_cardId_performedAt_idx`(`cardId`, `performedAt`),
    INDEX `StudentCardHistory_performedById_idx`(`performedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CardScanLog` (
    `id` VARCHAR(191) NOT NULL,
    `instituteId` VARCHAR(191) NOT NULL,
    `cardId` VARCHAR(191) NULL,
    `studentId` VARCHAR(191) NULL,
    `scanType` ENUM('NFC', 'QR') NOT NULL,
    `scannedValue` VARCHAR(191) NOT NULL,
    `result` ENUM('SUCCESS', 'CARD_NOT_FOUND', 'CARD_INACTIVE', 'CARD_LOST', 'CARD_STOLEN', 'CARD_MISSING', 'DUPLICATE_ATTENDANCE') NOT NULL,
    `classGroupId` VARCHAR(191) NULL,
    `attendanceSessionId` VARCHAR(191) NULL,
    `scannedById` VARCHAR(191) NULL,
    `scannedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deviceInfo` TEXT NULL,
    `notes` TEXT NULL,

    INDEX `CardScanLog_instituteId_scannedAt_idx`(`instituteId`, `scannedAt`),
    INDEX `CardScanLog_cardId_scannedAt_idx`(`cardId`, `scannedAt`),
    INDEX `CardScanLog_studentId_scannedAt_idx`(`studentId`, `scannedAt`),
    INDEX `CardScanLog_classGroupId_idx`(`classGroupId`),
    INDEX `CardScanLog_attendanceSessionId_idx`(`attendanceSessionId`),
    INDEX `CardScanLog_scannedById_idx`(`scannedById`),
    INDEX `CardScanLog_scanType_result_idx`(`scanType`, `result`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `StudentCard` ADD CONSTRAINT `StudentCard_instituteId_fkey` FOREIGN KEY (`instituteId`) REFERENCES `Institute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentCard` ADD CONSTRAINT `StudentCard_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentCard` ADD CONSTRAINT `StudentCard_issuedById_fkey` FOREIGN KEY (`issuedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentCard` ADD CONSTRAINT `StudentCard_replacedById_fkey` FOREIGN KEY (`replacedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentCardHistory` ADD CONSTRAINT `StudentCardHistory_instituteId_fkey` FOREIGN KEY (`instituteId`) REFERENCES `Institute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentCardHistory` ADD CONSTRAINT `StudentCardHistory_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentCardHistory` ADD CONSTRAINT `StudentCardHistory_cardId_fkey` FOREIGN KEY (`cardId`) REFERENCES `StudentCard`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentCardHistory` ADD CONSTRAINT `StudentCardHistory_performedById_fkey` FOREIGN KEY (`performedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CardScanLog` ADD CONSTRAINT `CardScanLog_instituteId_fkey` FOREIGN KEY (`instituteId`) REFERENCES `Institute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CardScanLog` ADD CONSTRAINT `CardScanLog_cardId_fkey` FOREIGN KEY (`cardId`) REFERENCES `StudentCard`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CardScanLog` ADD CONSTRAINT `CardScanLog_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CardScanLog` ADD CONSTRAINT `CardScanLog_classGroupId_fkey` FOREIGN KEY (`classGroupId`) REFERENCES `ClassGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CardScanLog` ADD CONSTRAINT `CardScanLog_attendanceSessionId_fkey` FOREIGN KEY (`attendanceSessionId`) REFERENCES `AttendanceSession`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CardScanLog` ADD CONSTRAINT `CardScanLog_scannedById_fkey` FOREIGN KEY (`scannedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
