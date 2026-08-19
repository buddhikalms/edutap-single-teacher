-- Add face attendance as an additive attendance method. Existing QR, NFC,
-- manual, and bulk records remain valid.
ALTER TABLE `AttendanceRecord`
  MODIFY `status` ENUM('PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'PENDING_REVIEW') NOT NULL DEFAULT 'PRESENT',
  MODIFY `source` ENUM('MANUAL', 'QR', 'NFC', 'FACE', 'BULK') NOT NULL DEFAULT 'MANUAL',
  MODIFY `searchMethod` ENUM('NFC', 'QR', 'FACE', 'MANUAL_ID', 'MANUAL_SEARCH') NULL,
  ADD COLUMN `faceAttemptId` VARCHAR(191) NULL,
  ADD COLUMN `confidenceScore` DOUBLE NULL,
  ADD COLUMN `deviceId` VARCHAR(191) NULL;

ALTER TABLE `AttendanceAuditLog`
  MODIFY `source` ENUM('MANUAL', 'QR', 'NFC', 'FACE', 'BULK') NOT NULL,
  MODIFY `status` ENUM('PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'PENDING_REVIEW') NULL;

ALTER TABLE `AttendanceSession`
  MODIFY `status` ENUM('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'CLOSED', 'CANCELLED', 'ENDED') NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE `InstituteSettings`
  ADD COLUMN `faceAttendanceEnabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `faceAllowStudentSelfEnrollment` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `faceRequireParentConsent` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `faceConsentAge` INTEGER NOT NULL DEFAULT 16,
  ADD COLUMN `faceMatchThreshold` DOUBLE NOT NULL DEFAULT 0.82,
  ADD COLUMN `faceManualReviewThreshold` DOUBLE NOT NULL DEFAULT 0.72,
  ADD COLUMN `faceLivenessThreshold` DOUBLE NOT NULL DEFAULT 0.85,
  ADD COLUMN `faceMaximumAttempts` INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN `faceAttemptCooldownSeconds` INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN `faceVerificationTokenTtlSeconds` INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN `faceRequireClassroomQrChallenge` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `faceRequireRegisteredDevice` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `faceRequireLocation` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `faceLocationRadiusMeters` INTEGER NOT NULL DEFAULT 150,
  ADD COLUMN `faceTemporaryImageRetentionSeconds` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `faceRecognitionModel` VARCHAR(191) NOT NULL DEFAULT 'insightface',
  ADD COLUMN `faceRecognitionModelVersion` VARCHAR(191) NOT NULL DEFAULT 'configured-version',
  ADD COLUMN `faceTemplateRefreshDays` INTEGER NOT NULL DEFAULT 365,
  ADD COLUMN `faceDuplicateReviewEnabled` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `faceFallbackMethods` JSON NULL;

CREATE TABLE `StudentFaceProfile` (
  `id` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `status` ENUM('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'DELETED') NOT NULL DEFAULT 'PENDING',
  `encryptedEmbedding` LONGBLOB NULL,
  `embeddingIv` LONGBLOB NULL,
  `embeddingAuthTag` LONGBLOB NULL,
  `encryptionKeyVersion` VARCHAR(191) NOT NULL,
  `recognitionModel` VARCHAR(191) NOT NULL,
  `modelVersion` VARCHAR(191) NOT NULL,
  `sampleCount` INTEGER NOT NULL,
  `qualityScore` DOUBLE NULL,
  `enrolledAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `enrolledById` VARCHAR(191) NULL,
  `lastVerifiedAt` DATETIME(3) NULL,
  `revokedAt` DATETIME(3) NULL,
  `deletedAt` DATETIME(3) NULL,
  `deletionRequestedAt` DATETIME(3) NULL,
  `deletionRequestedById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `StudentFaceProfile_studentId_key` (`studentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BiometricConsent` (
  `id` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `consentType` VARCHAR(191) NOT NULL,
  `consented` BOOLEAN NOT NULL,
  `consentedById` VARCHAR(191) NOT NULL,
  `policyVersion` VARCHAR(191) NOT NULL,
  `consentedAt` DATETIME(3) NULL,
  `revokedAt` DATETIME(3) NULL,
  `ipHash` VARCHAR(191) NULL,
  `userAgent` TEXT NULL,
  `deviceInfo` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `BiometricConsent_studentId_idx` (`studentId`),
  INDEX `BiometricConsent_consentType_consented_idx` (`consentType`, `consented`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FaceVerificationAttempt` (
  `id` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `attendanceSessionId` VARCHAR(191) NULL,
  `deviceId` VARCHAR(191) NULL,
  `result` ENUM('VERIFIED', 'UNCERTAIN', 'REJECTED', 'LIVENESS_FAILED', 'QUALITY_FAILED', 'RATE_LIMITED', 'ERROR') NOT NULL,
  `faceSimilarity` DOUBLE NULL,
  `livenessScore` DOUBLE NULL,
  `qualityScore` DOUBLE NULL,
  `recognitionModel` VARCHAR(191) NULL,
  `modelVersion` VARCHAR(191) NULL,
  `thresholdUsed` DOUBLE NULL,
  `failureCode` VARCHAR(191) NULL,
  `failureMessage` TEXT NULL,
  `ipHash` VARCHAR(191) NULL,
  `userAgent` TEXT NULL,
  `locationValidation` VARCHAR(191) NULL,
  `verificationNonce` VARCHAR(191) NULL,
  `tokenConsumedAt` DATETIME(3) NULL,
  `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `completedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `FaceVerificationAttempt_verificationNonce_key` (`verificationNonce`),
  INDEX `FaceVerificationAttempt_studentId_createdAt_idx` (`studentId`, `createdAt`),
  INDEX `FaceVerificationAttempt_attendanceSessionId_idx` (`attendanceSessionId`),
  INDEX `FaceVerificationAttempt_result_idx` (`result`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FaceVerificationToken` (
  `id` VARCHAR(191) NOT NULL,
  `tokenHash` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `attendanceSessionId` VARCHAR(191) NOT NULL,
  `attemptId` VARCHAR(191) NOT NULL,
  `deviceId` VARCHAR(191) NULL,
  `nonce` VARCHAR(191) NOT NULL,
  `result` ENUM('VERIFIED', 'UNCERTAIN', 'REJECTED', 'LIVENESS_FAILED', 'QUALITY_FAILED', 'RATE_LIMITED', 'ERROR') NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `consumedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `FaceVerificationToken_tokenHash_key` (`tokenHash`),
  UNIQUE INDEX `FaceVerificationToken_attemptId_key` (`attemptId`),
  UNIQUE INDEX `FaceVerificationToken_nonce_key` (`nonce`),
  INDEX `FaceVerificationToken_studentId_createdAt_idx` (`studentId`, `createdAt`),
  INDEX `FaceVerificationToken_attendanceSessionId_idx` (`attendanceSessionId`),
  INDEX `FaceVerificationToken_expiresAt_idx` (`expiresAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `AttendanceRecord_faceAttemptId_idx` ON `AttendanceRecord` (`faceAttemptId`);

ALTER TABLE `StudentFaceProfile`
  ADD CONSTRAINT `StudentFaceProfile_studentId_fkey`
  FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `BiometricConsent`
  ADD CONSTRAINT `BiometricConsent_studentId_fkey`
  FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `FaceVerificationAttempt`
  ADD CONSTRAINT `FaceVerificationAttempt_studentId_fkey`
  FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `FaceVerificationAttempt_attendanceSessionId_fkey`
  FOREIGN KEY (`attendanceSessionId`) REFERENCES `AttendanceSession`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `FaceVerificationToken`
  ADD CONSTRAINT `FaceVerificationToken_studentId_fkey`
  FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `FaceVerificationToken_attendanceSessionId_fkey`
  FOREIGN KEY (`attendanceSessionId`) REFERENCES `AttendanceSession`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `FaceVerificationToken_attemptId_fkey`
  FOREIGN KEY (`attemptId`) REFERENCES `FaceVerificationAttempt`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AttendanceRecord`
  ADD CONSTRAINT `AttendanceRecord_faceAttemptId_fkey`
  FOREIGN KEY (`faceAttemptId`) REFERENCES `FaceVerificationAttempt`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
