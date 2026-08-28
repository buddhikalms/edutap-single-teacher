-- Add fingerprint attendance as an additive source. Fingerprint templates stay
-- on the machine; the LMS stores only machine/user mappings and scan events.
ALTER TABLE `AttendanceRecord`
  MODIFY `source` ENUM('MANUAL', 'QR', 'NFC', 'FACE', 'FINGERPRINT', 'BULK') NOT NULL DEFAULT 'MANUAL',
  MODIFY `searchMethod` ENUM('NFC', 'QR', 'FACE', 'FINGERPRINT', 'MANUAL_ID', 'MANUAL_SEARCH') NULL;

ALTER TABLE `AttendanceAuditLog`
  MODIFY `source` ENUM('MANUAL', 'QR', 'NFC', 'FACE', 'FINGERPRINT', 'BULK') NOT NULL;

ALTER TABLE `ReaderDevice`
  MODIFY `type` ENUM('NFC', 'QR', 'FINGERPRINT', 'BOTH') NOT NULL;

CREATE TABLE `StudentFingerprintCredential` (
  `id` VARCHAR(191) NOT NULL,
  `instituteId` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `externalFingerprintId` VARCHAR(191) NOT NULL,
  `deviceUserId` VARCHAR(191) NULL,
  `status` ENUM('ACTIVE', 'SUSPENDED', 'DELETED') NOT NULL DEFAULT 'ACTIVE',
  `enrolledAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `enrolledById` VARCHAR(191) NULL,
  `lastVerifiedAt` DATETIME(3) NULL,
  `deletedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `SFC_institute_externalFingerprint_key` (`instituteId`, `externalFingerprintId`),
  INDEX `StudentFingerprintCredential_studentId_status_idx` (`studentId`, `status`),
  INDEX `StudentFingerprintCredential_instituteId_status_idx` (`instituteId`, `status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FingerprintAttendanceEvent` (
  `id` VARCHAR(191) NOT NULL,
  `eventId` VARCHAR(191) NOT NULL,
  `instituteId` VARCHAR(191) NOT NULL,
  `classGroupId` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NULL,
  `externalFingerprintId` VARCHAR(191) NULL,
  `deviceId` VARCHAR(191) NOT NULL,
  `statusCode` INTEGER NOT NULL,
  `result` VARCHAR(191) NOT NULL,
  `responseJson` JSON NULL,
  `ipAddress` VARCHAR(191) NULL,
  `occurredAt` DATETIME(3) NULL,
  `processedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `FingerprintAttendanceEvent_eventId_key` (`eventId`),
  INDEX `FingerprintAttendanceEvent_instituteId_processedAt_idx` (`instituteId`, `processedAt`),
  INDEX `FingerprintAttendanceEvent_classGroupId_processedAt_idx` (`classGroupId`, `processedAt`),
  INDEX `FingerprintAttendanceEvent_studentId_processedAt_idx` (`studentId`, `processedAt`),
  INDEX `FingerprintAttendanceEvent_deviceId_processedAt_idx` (`deviceId`, `processedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `StudentFingerprintCredential`
  ADD CONSTRAINT `StudentFingerprintCredential_instituteId_fkey`
  FOREIGN KEY (`instituteId`) REFERENCES `Institute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `StudentFingerprintCredential_studentId_fkey`
  FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `FingerprintAttendanceEvent`
  ADD CONSTRAINT `FingerprintAttendanceEvent_instituteId_fkey`
  FOREIGN KEY (`instituteId`) REFERENCES `Institute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `FingerprintAttendanceEvent_classGroupId_fkey`
  FOREIGN KEY (`classGroupId`) REFERENCES `ClassGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `FingerprintAttendanceEvent_studentId_fkey`
  FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
