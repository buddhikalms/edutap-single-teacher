-- Multi-teacher institute support with wildcard teacher subdomains.

ALTER TABLE `Teacher`
  ADD COLUMN `displayName` VARCHAR(191) NULL,
  ADD COLUMN `mobile` VARCHAR(191) NULL,
  ADD COLUMN `slug` VARCHAR(191) NULL,
  ADD COLUMN `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN `profileImage` VARCHAR(191) NULL,
  ADD COLUMN `logoUrl` VARCHAR(191) NULL,
  ADD COLUMN `accentColor` VARCHAR(191) NOT NULL DEFAULT '#0f766e',
  ADD COLUMN `heroImage` VARCHAR(191) NULL,
  ADD COLUMN `socialLinks` JSON NULL,
  ADD COLUMN `contactDetails` JSON NULL,
  ADD COLUMN `branding` JSON NULL,
  ADD COLUMN `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

UPDATE `Teacher`
SET
  `displayName` = COALESCE(`displayName`, `name`),
  `mobile` = COALESCE(`mobile`, `phone`),
  `profileImage` = COALESCE(`profileImage`, `photoUrl`),
  `slug` = COALESCE(
    `slug`,
    CONCAT(
      LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(REGEXP_REPLACE(`name`, '[^A-Za-z0-9]+', '-'), '-+', '-'))),
      '-',
      LEFT(`id`, 6)
    )
  );

UPDATE `Teacher`
SET `slug` = `id`
WHERE `slug` IS NULL OR `slug` = '';

ALTER TABLE `Teacher`
  MODIFY `slug` VARCHAR(191) NOT NULL,
  MODIFY `branchId` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `Teacher_slug_key` ON `Teacher`(`slug`);
CREATE INDEX `Teacher_instituteId_status_idx` ON `Teacher`(`instituteId`, `status`);
CREATE INDEX `Teacher_slug_idx` ON `Teacher`(`slug`);

CREATE TABLE `TeacherPermission` (
  `id` VARCHAR(191) NOT NULL,
  `teacherId` VARCHAR(191) NOT NULL,
  `canCreateStudents` BOOLEAN NOT NULL DEFAULT true,
  `canEditStudents` BOOLEAN NOT NULL DEFAULT true,
  `canDeleteStudents` BOOLEAN NOT NULL DEFAULT false,
  `canCreateClasses` BOOLEAN NOT NULL DEFAULT true,
  `canEditClasses` BOOLEAN NOT NULL DEFAULT true,
  `canManageAttendance` BOOLEAN NOT NULL DEFAULT true,
  `canManagePayments` BOOLEAN NOT NULL DEFAULT false,
  `canVerifyPayments` BOOLEAN NOT NULL DEFAULT false,
  `canCreateCourses` BOOLEAN NOT NULL DEFAULT true,
  `canUploadResources` BOOLEAN NOT NULL DEFAULT true,
  `canManageHomework` BOOLEAN NOT NULL DEFAULT true,
  `canManageQuizzes` BOOLEAN NOT NULL DEFAULT true,
  `canSendNotifications` BOOLEAN NOT NULL DEFAULT true,
  `canSendSms` BOOLEAN NOT NULL DEFAULT false,
  `canExportStudentData` BOOLEAN NOT NULL DEFAULT false,
  `canManageStudentCards` BOOLEAN NOT NULL DEFAULT true,
  `canViewFinancialReports` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `TeacherPermission_teacherId_key` ON `TeacherPermission`(`teacherId`);

INSERT INTO `TeacherPermission` (`id`, `teacherId`, `updatedAt`)
SELECT CONCAT('tp_', `id`), `id`, CURRENT_TIMESTAMP(3)
FROM `Teacher`
WHERE `id` NOT IN (SELECT `teacherId` FROM `TeacherPermission`);

ALTER TABLE `TeacherPermission`
  ADD CONSTRAINT `TeacherPermission_teacherId_fkey`
  FOREIGN KEY (`teacherId`) REFERENCES `Teacher`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Teacher`
  DROP FOREIGN KEY `Teacher_branchId_fkey`;

ALTER TABLE `Teacher`
  ADD CONSTRAINT `Teacher_branchId_fkey`
  FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `EnrollmentRequest`
  ADD COLUMN `teacherId` VARCHAR(191) NULL;

UPDATE `EnrollmentRequest` er
JOIN `ClassGroup` cg ON cg.`id` = er.`classGroupId`
SET er.`teacherId` = cg.`teacherId`
WHERE er.`teacherId` IS NULL;

CREATE INDEX `EnrollmentRequest_teacherId_status_createdAt_idx` ON `EnrollmentRequest`(`teacherId`, `status`, `createdAt`);

ALTER TABLE `EnrollmentRequest`
  ADD CONSTRAINT `EnrollmentRequest_teacherId_fkey`
  FOREIGN KEY (`teacherId`) REFERENCES `Teacher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX `ClassGroup_teacherId_idx` ON `ClassGroup`(`teacherId`);
