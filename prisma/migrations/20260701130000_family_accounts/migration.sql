ALTER TABLE `User`
  MODIFY `role` ENUM('SUPER_ADMIN','INSTITUTE_ADMIN','BRANCH_ADMIN','TEACHER','STAFF','STUDENT','PARENT','FAMILY') NOT NULL DEFAULT 'STAFF',
  MODIFY `email` VARCHAR(191) NULL,
  MODIFY `passwordHash` VARCHAR(191) NULL,
  ADD COLUMN `mobile` VARCHAR(191) NULL,
  ADD COLUMN `googleId` VARCHAR(191) NULL,
  ADD COLUMN `authProvider` ENUM('PASSWORD','GOOGLE','BOTH') NOT NULL DEFAULT 'PASSWORD',
  ADD UNIQUE INDEX `User_mobile_key` (`mobile`),
  ADD UNIQUE INDEX `User_googleId_key` (`googleId`);

ALTER TABLE `Student`
  MODIFY `status` ENUM('PENDING_APPROVAL','ACTIVE','REJECTED','PAUSED','GRADUATED','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN `familyUserId` VARCHAR(191) NULL,
  ADD INDEX `Student_familyUserId_idx` (`familyUserId`);

ALTER TABLE `Parent`
  ADD COLUMN `status` ENUM('PENDING_APPROVAL','ACTIVE','REJECTED') NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE `EnrollmentRequest`
  MODIFY `studentMobile` VARCHAR(191) NULL,
  ADD COLUMN `familyUserId` VARCHAR(191) NULL,
  ADD INDEX `EnrollmentRequest_familyUserId_idx` (`familyUserId`);

UPDATE `EnrollmentRequest`
SET `familyUserId` = `parentUserId`
WHERE `familyUserId` IS NULL AND `parentUserId` IS NOT NULL;

UPDATE `User`
SET `role` = 'FAMILY'
WHERE `id` IN (SELECT `familyUserId` FROM `EnrollmentRequest` WHERE `familyUserId` IS NOT NULL);

UPDATE `Student` s
JOIN `EnrollmentRequest` er ON er.`requestedStudentId` = s.`id`
SET s.`familyUserId` = er.`familyUserId`
WHERE er.`familyUserId` IS NOT NULL;

ALTER TABLE `Student`
  ADD CONSTRAINT `Student_familyUserId_fkey` FOREIGN KEY (`familyUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `EnrollmentRequest`
  ADD CONSTRAINT `EnrollmentRequest_familyUserId_fkey` FOREIGN KEY (`familyUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
