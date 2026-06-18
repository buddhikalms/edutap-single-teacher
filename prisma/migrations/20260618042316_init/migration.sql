/*
  Warnings:

  - A unique constraint covering the columns `[instituteId,slug]` on the table `Course` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `course` ADD COLUMN `accessType` ENUM('FULL_COURSE', 'MODULE_ACCESS', 'RECORDING_LIBRARY') NOT NULL DEFAULT 'FULL_COURSE',
    ADD COLUMN `category` VARCHAR(191) NULL,
    ADD COLUMN `durationType` ENUM('DAYS', 'WEEKS', 'MONTHS', 'LIFETIME') NOT NULL DEFAULT 'MONTHS',
    ADD COLUMN `durationValue` INTEGER NULL,
    ADD COLUMN `endDate` DATETIME(3) NULL,
    ADD COLUMN `isFree` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `slug` VARCHAR(191) NULL,
    ADD COLUMN `startDate` DATETIME(3) NULL,
    ADD COLUMN `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'PUBLISHED',
    ADD COLUMN `teacherId` VARCHAR(191) NULL,
    ADD COLUMN `thumbnailUrl` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `institutesubscription` ADD COLUMN `classLimit` INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN `courseLimit` INTEGER NOT NULL DEFAULT 20,
    ADD COLUMN `customBrandingAccess` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `liveClassAccess` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `parentNotificationAccess` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `planId` VARCHAR(191) NULL,
    ADD COLUMN `storageLimitMb` INTEGER NOT NULL DEFAULT 1024,
    ADD COLUMN `yearlyPrice` DECIMAL(10, 2) NULL,
    MODIFY `plan` ENUM('SINGLE_TEACHER', 'INSTITUTE_STARTER', 'INSTITUTE_PRO', 'ENTERPRISE', 'TEACHER', 'SMALL_INSTITUTE', 'PREMIUM_INSTITUTE') NOT NULL DEFAULT 'INSTITUTE_STARTER';

-- AlterTable
ALTER TABLE `teacher` ADD COLUMN `bio` TEXT NULL,
    ADD COLUMN `experience` VARCHAR(191) NULL,
    ADD COLUMN `gradesTaught` JSON NULL,
    ADD COLUMN `photoUrl` VARCHAR(191) NULL,
    ADD COLUMN `qualifications` TEXT NULL,
    ADD COLUMN `subjects` JSON NULL,
    ADD COLUMN `teachingMode` ENUM('ONLINE', 'PHYSICAL', 'BOTH') NOT NULL DEFAULT 'BOTH';

-- CreateTable
CREATE TABLE `SubscriptionPlan` (
    `id` VARCHAR(191) NOT NULL,
    `code` ENUM('SINGLE_TEACHER', 'INSTITUTE_STARTER', 'INSTITUTE_PRO', 'ENTERPRISE', 'TEACHER', 'SMALL_INSTITUTE', 'PREMIUM_INSTITUTE') NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `monthlyPrice` DECIMAL(10, 2) NULL,
    `yearlyPrice` DECIMAL(10, 2) NULL,
    `recommended` BOOLEAN NOT NULL DEFAULT false,
    `maxTeachers` INTEGER NULL,
    `maxStudents` INTEGER NULL,
    `maxBranches` INTEGER NULL,
    `maxClasses` INTEGER NULL,
    `maxCourses` INTEGER NULL,
    `storageLimitMb` INTEGER NULL,
    `liveClassAccess` BOOLEAN NOT NULL DEFAULT false,
    `parentNotificationAccess` BOOLEAN NOT NULL DEFAULT false,
    `customBrandingAccess` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SubscriptionPlan_code_key`(`code`),
    UNIQUE INDEX `SubscriptionPlan_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UsageLimit` (
    `id` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `limit` INTEGER NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `UsageLimit_key_idx`(`key`),
    UNIQUE INDEX `UsageLimit_planId_key_key`(`planId`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PackageFeature` (
    `id` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `included` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PackageFeature_planId_sortOrder_idx`(`planId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CourseModule` (
    `id` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CourseModule_courseId_sortOrder_idx`(`courseId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TeacherRegistrationRequest` (
    `id` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `profilePhotoUrl` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NOT NULL,
    `gradesTaught` JSON NOT NULL,
    `teachingMode` ENUM('ONLINE', 'PHYSICAL', 'BOTH') NOT NULL,
    `experience` VARCHAR(191) NOT NULL,
    `qualifications` TEXT NOT NULL,
    `bio` TEXT NOT NULL,
    `preferredPackage` ENUM('SINGLE_TEACHER', 'INSTITUTE_STARTER', 'INSTITUTE_PRO', 'ENTERPRISE', 'TEACHER', 'SMALL_INSTITUTE', 'PREMIUM_INSTITUTE') NOT NULL,
    `status` ENUM('PENDING_APPROVAL', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING_APPROVAL',
    `instituteId` VARCHAR(191) NULL,
    `adminNotifiedAt` DATETIME(3) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TeacherRegistrationRequest_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `TeacherRegistrationRequest_instituteId_idx`(`instituteId`),
    UNIQUE INDEX `TeacherRegistrationRequest_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Course_teacherId_idx` ON `Course`(`teacherId`);

-- CreateIndex
CREATE UNIQUE INDEX `Course_instituteId_slug_key` ON `Course`(`instituteId`, `slug`);

-- CreateIndex
CREATE INDEX `InstituteSubscription_planId_idx` ON `InstituteSubscription`(`planId`);

-- AddForeignKey
ALTER TABLE `InstituteSubscription` ADD CONSTRAINT `InstituteSubscription_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `SubscriptionPlan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UsageLimit` ADD CONSTRAINT `UsageLimit_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `SubscriptionPlan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PackageFeature` ADD CONSTRAINT `PackageFeature_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `SubscriptionPlan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Course` ADD CONSTRAINT `Course_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `Teacher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CourseModule` ADD CONSTRAINT `CourseModule_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeacherRegistrationRequest` ADD CONSTRAINT `TeacherRegistrationRequest_instituteId_fkey` FOREIGN KEY (`instituteId`) REFERENCES `Institute`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
