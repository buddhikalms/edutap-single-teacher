-- Create subjects and preserve subject labels previously stored on courses.
CREATE TABLE `Subject` (
  `id` VARCHAR(191) NOT NULL,
  `instituteId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `color` VARCHAR(191) NOT NULL DEFAULT '#0f766e',
  `icon` VARCHAR(191) NOT NULL DEFAULT 'BookOpen',
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Subject_instituteId_name_key` (`instituteId`, `name`),
  INDEX `Subject_instituteId_isActive_idx` (`instituteId`, `isActive`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Subject`
  ADD CONSTRAINT `Subject_instituteId_fkey` FOREIGN KEY (`instituteId`) REFERENCES `Institute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO `Subject` (`id`, `instituteId`, `name`, `description`, `color`, `icon`, `isActive`, `createdAt`, `updatedAt`)
SELECT DISTINCT CONCAT('sub_', LEFT(MD5(CONCAT(`instituteId`, ':', COALESCE(NULLIF(`subject`, ''), `name`))), 20)),
       `instituteId`, COALESCE(NULLIF(`subject`, ''), `name`), NULL, '#0f766e', 'BookOpen', true, NOW(3), NOW(3)
FROM `Course`;

ALTER TABLE `Course`
  ADD COLUMN `subjectId` VARCHAR(191) NULL;

UPDATE `Course` c
JOIN `Subject` s ON s.`instituteId` = c.`instituteId`
 AND s.`name` = COALESCE(NULLIF(c.`subject`, ''), c.`name`)
SET c.`subjectId` = s.`id`;

CREATE INDEX `Course_subjectId_idx` ON `Course`(`subjectId`);
ALTER TABLE `Course`
  ADD CONSTRAINT `Course_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `ClassGroup`
  ADD COLUMN `subjectId` VARCHAR(191) NULL,
  ADD COLUMN `admissionFee` DECIMAL(10,2) NULL,
  ADD COLUMN `paymentStartDate` DATETIME(3) NULL,
  ADD COLUMN `status` ENUM('ACTIVE','DISABLED','ARCHIVED') NOT NULL DEFAULT 'ACTIVE';

UPDATE `ClassGroup` cg
JOIN `Course` c ON c.`id` = cg.`courseId`
SET cg.`subjectId` = c.`subjectId`,
    cg.`monthlyFee` = COALESCE(cg.`monthlyFee`, c.`fee`);

ALTER TABLE `ClassGroup`
  MODIFY `subjectId` VARCHAR(191) NOT NULL;

ALTER TABLE `ClassGroup` DROP FOREIGN KEY `ClassGroup_courseId_fkey`;
DROP INDEX `ClassGroup_courseId_idx` ON `ClassGroup`;
ALTER TABLE `ClassGroup` DROP COLUMN `courseId`;
CREATE INDEX `ClassGroup_subjectId_idx` ON `ClassGroup`(`subjectId`);
ALTER TABLE `ClassGroup`
  ADD CONSTRAINT `ClassGroup_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Course`
  MODIFY `accessType` ENUM('FULL_COURSE','MODULE_ACCESS','RECORDING_LIBRARY','FREE','PAID','MANUAL_UNLOCK') NOT NULL DEFAULT 'PAID';
UPDATE `Course` SET `accessType` = IF(`isFree`, 'FREE', 'PAID');
ALTER TABLE `Course`
  MODIFY `accessType` ENUM('FREE','PAID','MANUAL_UNLOCK') NOT NULL DEFAULT 'PAID';

ALTER TABLE `CourseModule`
  ADD COLUMN `isFreePreview` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `isLocked` BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE `CourseResource` (
  `id` VARCHAR(191) NOT NULL,
  `instituteId` VARCHAR(191) NOT NULL,
  `courseId` VARCHAR(191) NOT NULL,
  `moduleId` VARCHAR(191) NULL,
  `resourceType` ENUM('RECORDING','TUTE','PDF','DOCUMENT','SPREADSHEET','IMAGE','VIDEO','PAPER','MODEL_PAPER','PAST_PAPER','LINK','OTHER') NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `fileUrl` VARCHAR(191) NULL,
  `externalUrl` VARCHAR(191) NULL,
  `accessType` ENUM('FREE','PAID','MANUAL_UNLOCK') NOT NULL DEFAULT 'PAID',
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `CourseResource_courseId_sortOrder_idx` (`courseId`, `sortOrder`),
  INDEX `CourseResource_moduleId_idx` (`moduleId`),
  INDEX `CourseResource_instituteId_idx` (`instituteId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CourseResource`
  ADD CONSTRAINT `CourseResource_instituteId_fkey` FOREIGN KEY (`instituteId`) REFERENCES `Institute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `CourseResource_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `CourseResource_moduleId_fkey` FOREIGN KEY (`moduleId`) REFERENCES `CourseModule`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `CourseEnrollment` (
  `id` VARCHAR(191) NOT NULL,
  `instituteId` VARCHAR(191) NOT NULL,
  `courseId` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `status` ENUM('PENDING','ACTIVE','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `unlockedAt` DATETIME(3) NULL,
  `paidAmount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `progress` DECIMAL(5,2) NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `CourseEnrollment_courseId_studentId_key` (`courseId`, `studentId`),
  INDEX `CourseEnrollment_instituteId_status_idx` (`instituteId`, `status`),
  INDEX `CourseEnrollment_studentId_idx` (`studentId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CourseEnrollment`
  ADD CONSTRAINT `CourseEnrollment_instituteId_fkey` FOREIGN KEY (`instituteId`) REFERENCES `Institute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `CourseEnrollment_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `CourseEnrollment_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Homework` ADD COLUMN `subjectId` VARCHAR(191) NULL;
UPDATE `Homework` h JOIN `ClassGroup` cg ON cg.`id` = h.`classGroupId` SET h.`subjectId` = cg.`subjectId`;
CREATE INDEX `Homework_subjectId_idx` ON `Homework`(`subjectId`);
ALTER TABLE `Homework`
  ADD CONSTRAINT `Homework_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Quiz`
  ADD COLUMN `subjectId` VARCHAR(191) NULL,
  ADD COLUMN `courseModuleId` VARCHAR(191) NULL;
UPDATE `Quiz` q JOIN `ClassGroup` cg ON cg.`id` = q.`classGroupId` SET q.`subjectId` = cg.`subjectId`;
CREATE INDEX `Quiz_subjectId_idx` ON `Quiz`(`subjectId`);
CREATE INDEX `Quiz_courseModuleId_idx` ON `Quiz`(`courseModuleId`);
ALTER TABLE `Quiz`
  ADD CONSTRAINT `Quiz_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Quiz_courseModuleId_fkey` FOREIGN KEY (`courseModuleId`) REFERENCES `CourseModule`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Payment`
  MODIFY `type` ENUM('MONTHLY_FEE','COURSE_PAYMENT','ADMISSION_FEE','EXAM_FEE','OTHER') NOT NULL DEFAULT 'MONTHLY_FEE',
  ADD COLUMN `courseId` VARCHAR(191) NULL;
CREATE INDEX `Payment_courseId_idx` ON `Payment`(`courseId`);
ALTER TABLE `Payment`
  ADD CONSTRAINT `Payment_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
