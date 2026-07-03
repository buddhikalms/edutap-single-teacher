-- CreateTable
CREATE TABLE `ZoomConnection` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `zoomAccountId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NULL,
    `accessToken` TEXT NOT NULL,
    `refreshToken` TEXT NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `connectedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSyncAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ZoomConnection_userId_key`(`userId`),
    INDEX `ZoomConnection_zoomAccountId_idx`(`zoomAccountId`),
    INDEX `ZoomConnection_email_idx`(`email`),
    INDEX `ZoomConnection_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ZoomMeetingSettings` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `defaultDurationMinutes` INTEGER NOT NULL DEFAULT 60,
    `defaultWaitingRoom` BOOLEAN NOT NULL DEFAULT true,
    `defaultRecording` VARCHAR(191) NOT NULL DEFAULT 'none',
    `defaultJoinBeforeHost` BOOLEAN NOT NULL DEFAULT false,
    `defaultMuteParticipants` BOOLEAN NOT NULL DEFAULT true,
    `defaultPasscodeGeneration` BOOLEAN NOT NULL DEFAULT true,
    `defaultHostVideo` BOOLEAN NOT NULL DEFAULT true,
    `defaultParticipantVideo` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ZoomMeetingSettings_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ZoomMeeting` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `classGroupId` VARCHAR(191) NOT NULL,
    `liveClassId` VARCHAR(191) NOT NULL,
    `zoomConnectionId` VARCHAR(191) NULL,
    `zoomMeetingId` VARCHAR(191) NOT NULL,
    `topic` VARCHAR(191) NOT NULL,
    `joinUrl` TEXT NOT NULL,
    `startUrl` TEXT NULL,
    `password` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'scheduled',
    `scheduledTime` DATETIME(3) NULL,
    `durationMinutes` INTEGER NULL,
    `recordingImported` BOOLEAN NOT NULL DEFAULT false,
    `recordingUrl` TEXT NULL,
    `recordingMetadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ZoomMeeting_liveClassId_key`(`liveClassId`),
    INDEX `ZoomMeeting_userId_idx`(`userId`),
    INDEX `ZoomMeeting_classGroupId_idx`(`classGroupId`),
    INDEX `ZoomMeeting_zoomMeetingId_idx`(`zoomMeetingId`),
    INDEX `ZoomMeeting_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ZoomConnection` ADD CONSTRAINT `ZoomConnection_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ZoomMeetingSettings` ADD CONSTRAINT `ZoomMeetingSettings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ZoomMeeting` ADD CONSTRAINT `ZoomMeeting_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ZoomMeeting` ADD CONSTRAINT `ZoomMeeting_classGroupId_fkey` FOREIGN KEY (`classGroupId`) REFERENCES `ClassGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ZoomMeeting` ADD CONSTRAINT `ZoomMeeting_liveClassId_fkey` FOREIGN KEY (`liveClassId`) REFERENCES `LiveClass`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ZoomMeeting` ADD CONSTRAINT `ZoomMeeting_zoomConnectionId_fkey` FOREIGN KEY (`zoomConnectionId`) REFERENCES `ZoomConnection`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
