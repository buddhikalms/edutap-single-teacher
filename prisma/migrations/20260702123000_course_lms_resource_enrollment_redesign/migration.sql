-- AlterEnum
ALTER TABLE `CourseResource` MODIFY `resourceType` ENUM('VIDEO', 'RECORDING', 'PDF', 'TUTE', 'PAST_PAPER', 'MODEL_PAPER', 'WORD', 'EXCEL', 'ZIP', 'EXTERNAL_LINK', 'YOUTUBE', 'SECURE_VIDEO', 'DOCUMENT', 'SPREADSHEET', 'IMAGE', 'PAPER', 'LINK', 'OTHER') NOT NULL;

-- AlterTable
ALTER TABLE `CourseResource`
  ADD COLUMN `visibility` ENUM('FREE_PREVIEW', 'ENROLLED', 'DRAFT', 'SCHEDULED') NOT NULL DEFAULT 'ENROLLED',
  ADD COLUMN `publishAt` DATETIME(3) NULL;

-- Backfill visibility from previous access type.
UPDATE `CourseResource` SET `visibility` = 'FREE_PREVIEW' WHERE `accessType` = 'FREE';
UPDATE `CourseResource` SET `visibility` = 'ENROLLED' WHERE `accessType` <> 'FREE';

-- AlterTable
ALTER TABLE `CourseEnrollment`
  ADD COLUMN `lockedAt` DATETIME(3) NULL,
  ADD COLUMN `lastActivityAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `CourseResource_visibility_publishAt_idx` ON `CourseResource`(`visibility`, `publishAt`);
