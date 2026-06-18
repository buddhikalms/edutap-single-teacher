-- AlterTable
ALTER TABLE `institutesettings` ADD COLUMN `notificationCustomTemplates` JSON NULL,
    ADD COLUMN `notificationInAppEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `notificationIncludeDueDates` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `notificationMobilePushEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `notificationWebPushEnabled` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `notice` MODIFY `type` ENUM('NOTICE', 'PAYMENT_DUE', 'PAYMENT_OVERDUE', 'ABSENT_ALERT', 'CLASS_NOTICE', 'RECEIPT', 'ATTENDANCE_ARRIVAL', 'CLASS_STARTED', 'STUDENT_ARRIVED', 'CLASS_ENDED', 'PAYMENT_REMINDER', 'HOMEWORK_ASSIGNED', 'HOMEWORK_REVIEWED', 'QUIZ_ASSIGNED', 'LIVE_CLASS_REMINDER', 'COURSE_RESOURCE_UPLOADED') NOT NULL DEFAULT 'NOTICE';

-- AlterTable
ALTER TABLE `notification` MODIFY `type` ENUM('NOTICE', 'PAYMENT_DUE', 'PAYMENT_OVERDUE', 'ABSENT_ALERT', 'CLASS_NOTICE', 'RECEIPT', 'ATTENDANCE_ARRIVAL', 'CLASS_STARTED', 'STUDENT_ARRIVED', 'CLASS_ENDED', 'PAYMENT_REMINDER', 'HOMEWORK_ASSIGNED', 'HOMEWORK_REVIEWED', 'QUIZ_ASSIGNED', 'LIVE_CLASS_REMINDER', 'COURSE_RESOURCE_UPLOADED') NOT NULL DEFAULT 'NOTICE';

-- AlterTable
ALTER TABLE `notificationlog` MODIFY `type` ENUM('NOTICE', 'PAYMENT_DUE', 'PAYMENT_OVERDUE', 'ABSENT_ALERT', 'CLASS_NOTICE', 'RECEIPT', 'ATTENDANCE_ARRIVAL', 'CLASS_STARTED', 'STUDENT_ARRIVED', 'CLASS_ENDED', 'PAYMENT_REMINDER', 'HOMEWORK_ASSIGNED', 'HOMEWORK_REVIEWED', 'QUIZ_ASSIGNED', 'LIVE_CLASS_REMINDER', 'COURSE_RESOURCE_UPLOADED') NOT NULL,
    MODIFY `channel` ENUM('IN_APP', 'PUSH', 'MOBILE_PUSH', 'WEB_PUSH', 'SMS', 'WHATSAPP', 'EMAIL') NOT NULL DEFAULT 'IN_APP';

-- AlterTable
ALTER TABLE `parent` ADD COLUMN `address` TEXT NULL,
    ADD COLUMN `appLoginIdentifier` VARCHAR(191) NULL,
    ADD COLUMN `emergencyContactNumber` VARCHAR(191) NULL,
    ADD COLUMN `nic` VARCHAR(191) NULL,
    ADD COLUMN `relationship` VARCHAR(191) NULL DEFAULT 'Guardian';

-- CreateTable
CREATE TABLE `WebPushSubscription` (
    `id` VARCHAR(191) NOT NULL,
    `instituteId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `endpoint` TEXT NOT NULL,
    `endpointHash` VARCHAR(191) NOT NULL,
    `p256dh` TEXT NOT NULL,
    `auth` TEXT NOT NULL,
    `userAgent` TEXT NULL,
    `platform` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WebPushSubscription_endpointHash_key`(`endpointHash`),
    INDEX `WebPushSubscription_instituteId_idx`(`instituteId`),
    INDEX `WebPushSubscription_userId_idx`(`userId`),
    INDEX `WebPushSubscription_parentId_idx`(`parentId`),
    INDEX `WebPushSubscription_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `WebPushSubscription` ADD CONSTRAINT `WebPushSubscription_instituteId_fkey` FOREIGN KEY (`instituteId`) REFERENCES `Institute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WebPushSubscription` ADD CONSTRAINT `WebPushSubscription_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WebPushSubscription` ADD CONSTRAINT `WebPushSubscription_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Parent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
