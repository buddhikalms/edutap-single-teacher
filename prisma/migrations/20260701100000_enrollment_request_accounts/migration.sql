ALTER TABLE `User`
  ADD COLUMN `accountStatus` ENUM('PENDING_APPROVAL', 'ACTIVE', 'REJECTED') NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE `EnrollmentRequest`
  ADD COLUMN `requestedStudentId` VARCHAR(191) NULL,
  ADD COLUMN `requestedParentId` VARCHAR(191) NULL,
  ADD COLUMN `studentUserId` VARCHAR(191) NULL,
  ADD COLUMN `parentUserId` VARCHAR(191) NULL,
  ADD UNIQUE INDEX `EnrollmentRequest_requestedStudentId_key` (`requestedStudentId`),
  ADD UNIQUE INDEX `EnrollmentRequest_requestedParentId_key` (`requestedParentId`),
  ADD UNIQUE INDEX `EnrollmentRequest_studentUserId_key` (`studentUserId`),
  ADD UNIQUE INDEX `EnrollmentRequest_parentUserId_key` (`parentUserId`);

ALTER TABLE `EnrollmentRequest`
  ADD CONSTRAINT `EnrollmentRequest_requestedStudentId_fkey` FOREIGN KEY (`requestedStudentId`) REFERENCES `Student`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `EnrollmentRequest_requestedParentId_fkey` FOREIGN KEY (`requestedParentId`) REFERENCES `Parent`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `EnrollmentRequest_studentUserId_fkey` FOREIGN KEY (`studentUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `EnrollmentRequest_parentUserId_fkey` FOREIGN KEY (`parentUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
