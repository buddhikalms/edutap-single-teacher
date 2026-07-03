ALTER TABLE `Payment`
  MODIFY `method` ENUM('CASH','CARD','BANK_TRANSFER','ONLINE','OTHER') NULL,
  ADD COLUMN `enrollmentRequestId` VARCHAR(191) NULL,
  ADD UNIQUE INDEX `Payment_enrollmentRequestId_key` (`enrollmentRequestId`);

CREATE TABLE `EnrollmentPaymentSlip` (
  `id` VARCHAR(191) NOT NULL,
  `enrollmentRequestId` VARCHAR(191) NOT NULL,
  `familyUserId` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NULL,
  `paymentId` VARCHAR(191) NULL,
  `fileUrl` VARCHAR(191) NOT NULL,
  `storageKey` VARCHAR(191) NOT NULL,
  `fileName` VARCHAR(191) NOT NULL,
  `fileType` VARCHAR(191) NOT NULL,
  `fileSize` INTEGER NOT NULL,
  `paidAmount` DECIMAL(10, 2) NOT NULL,
  `paymentMethod` ENUM('BANK_TRANSFER','CASH_DEPOSIT','ONLINE_TRANSFER','OTHER') NOT NULL,
  `paymentDate` DATETIME(3) NOT NULL,
  `referenceNumber` VARCHAR(191) NULL,
  `status` ENUM('PENDING_REVIEW','VERIFIED','REJECTED') NOT NULL DEFAULT 'PENDING_REVIEW',
  `teacherNote` TEXT NULL,
  `reviewedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `EnrollmentPaymentSlip_enrollmentRequestId_key` (`enrollmentRequestId`),
  UNIQUE INDEX `EnrollmentPaymentSlip_paymentId_key` (`paymentId`),
  UNIQUE INDEX `EnrollmentPaymentSlip_storageKey_key` (`storageKey`),
  INDEX `EnrollmentPaymentSlip_familyUserId_status_idx` (`familyUserId`, `status`),
  INDEX `EnrollmentPaymentSlip_studentId_idx` (`studentId`),
  INDEX `EnrollmentPaymentSlip_status_createdAt_idx` (`status`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Payment`
  ADD CONSTRAINT `Payment_enrollmentRequestId_fkey`
  FOREIGN KEY (`enrollmentRequestId`) REFERENCES `EnrollmentRequest`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `EnrollmentPaymentSlip`
  ADD CONSTRAINT `EnrollmentPaymentSlip_enrollmentRequestId_fkey`
  FOREIGN KEY (`enrollmentRequestId`) REFERENCES `EnrollmentRequest`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `EnrollmentPaymentSlip_familyUserId_fkey`
  FOREIGN KEY (`familyUserId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `EnrollmentPaymentSlip_studentId_fkey`
  FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `EnrollmentPaymentSlip_paymentId_fkey`
  FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
