-- AlterTable
ALTER TABLE `WebPushSubscription` ADD COLUMN `studentId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `WebPushSubscription_studentId_idx` ON `WebPushSubscription`(`studentId`);

-- AddForeignKey
ALTER TABLE `WebPushSubscription` ADD CONSTRAINT `WebPushSubscription_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
