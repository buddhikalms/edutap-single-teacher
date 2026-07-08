-- High-traffic NFC/QR attendance hardening.

ALTER TABLE `InstituteSettings`
  ADD COLUMN `attendanceReaderValidationEnabled` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `AttendanceRecord`
  ADD INDEX `AttendanceRecord_sessionId_idx`(`sessionId`);

ALTER TABLE `Enrollment`
  ADD INDEX `Enrollment_studentId_idx`(`studentId`);

ALTER TABLE `StudentCard`
  ADD INDEX `StudentCard_nfcUid_idx`(`nfcUid`),
  ADD INDEX `StudentCard_qrToken_idx`(`qrToken`),
  ADD INDEX `StudentCard_status_idx`(`status`);

CREATE TABLE `ReaderDevice` (
  `id` VARCHAR(191) NOT NULL,
  `instituteId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `deviceCode` VARCHAR(191) NOT NULL,
  `type` ENUM('NFC', 'QR', 'BOTH') NOT NULL DEFAULT 'BOTH',
  `location` VARCHAR(191) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `lastSeenAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `ReaderDevice_deviceCode_key`(`deviceCode`),
  INDEX `ReaderDevice_instituteId_isActive_idx`(`instituteId`, `isActive`),
  INDEX `ReaderDevice_deviceCode_isActive_idx`(`deviceCode`, `isActive`),
  CONSTRAINT `ReaderDevice_instituteId_fkey` FOREIGN KEY (`instituteId`) REFERENCES `Institute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ScanRequestLog` (
  `id` VARCHAR(191) NOT NULL,
  `instituteId` VARCHAR(191) NULL,
  `scanId` VARCHAR(191) NOT NULL,
  `deviceId` VARCHAR(191) NOT NULL,
  `scanType` ENUM('NFC', 'QR') NOT NULL,
  `scannedValue` VARCHAR(191) NOT NULL,
  `result` VARCHAR(191) NOT NULL,
  `responseJson` JSON NULL,
  `statusCode` INTEGER NOT NULL DEFAULT 200,
  `attendanceSessionId` VARCHAR(191) NULL,
  `attendanceRecordId` VARCHAR(191) NULL,
  `studentId` VARCHAR(191) NULL,
  `ipAddress` VARCHAR(191) NULL,
  `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `processedAt` DATETIME(3) NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `ScanRequestLog_scanId_key`(`scanId`),
  INDEX `ScanRequestLog_scanId_idx`(`scanId`),
  INDEX `ScanRequestLog_deviceId_receivedAt_idx`(`deviceId`, `receivedAt`),
  INDEX `ScanRequestLog_scannedValue_receivedAt_idx`(`scannedValue`, `receivedAt`),
  INDEX `ScanRequestLog_result_receivedAt_idx`(`result`, `receivedAt`),
  INDEX `ScanRequestLog_attendanceSessionId_idx`(`attendanceSessionId`),
  CONSTRAINT `ScanRequestLog_instituteId_fkey` FOREIGN KEY (`instituteId`) REFERENCES `Institute`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `NotificationQueue` (
  `id` VARCHAR(191) NOT NULL,
  `instituteId` VARCHAR(191) NOT NULL,
  `attendanceRecordId` VARCHAR(191) NULL,
  `attendanceSessionId` VARCHAR(191) NULL,
  `studentId` VARCHAR(191) NULL,
  `jobType` VARCHAR(191) NOT NULL,
  `channel` VARCHAR(191) NOT NULL,
  `payloadJson` JSON NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `maxAttempts` INTEGER NOT NULL DEFAULT 5,
  `availableAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `processedAt` DATETIME(3) NULL,
  `lastError` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  INDEX `NotificationQueue_status_availableAt_idx`(`status`, `availableAt`),
  INDEX `NotificationQueue_instituteId_createdAt_idx`(`instituteId`, `createdAt`),
  INDEX `NotificationQueue_attendanceRecordId_idx`(`attendanceRecordId`),
  INDEX `NotificationQueue_attendanceSessionId_idx`(`attendanceSessionId`),
  CONSTRAINT `NotificationQueue_instituteId_fkey` FOREIGN KEY (`instituteId`) REFERENCES `Institute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SecurityAuditLog` (
  `id` VARCHAR(191) NOT NULL,
  `instituteId` VARCHAR(191) NULL,
  `actorUserId` VARCHAR(191) NULL,
  `actorRole` VARCHAR(191) NULL,
  `action` VARCHAR(191) NOT NULL,
  `resourceType` VARCHAR(191) NOT NULL,
  `resourceId` VARCHAR(191) NULL,
  `success` BOOLEAN NOT NULL,
  `message` VARCHAR(191) NOT NULL,
  `ipAddress` VARCHAR(191) NULL,
  `userAgent` TEXT NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `SecurityAuditLog_instituteId_createdAt_idx`(`instituteId`, `createdAt`),
  INDEX `SecurityAuditLog_actorUserId_createdAt_idx`(`actorUserId`, `createdAt`),
  INDEX `SecurityAuditLog_action_createdAt_idx`(`action`, `createdAt`),
  INDEX `SecurityAuditLog_resourceType_resourceId_idx`(`resourceType`, `resourceId`),
  INDEX `SecurityAuditLog_success_createdAt_idx`(`success`, `createdAt`),
  CONSTRAINT `SecurityAuditLog_instituteId_fkey` FOREIGN KEY (`instituteId`) REFERENCES `Institute`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
