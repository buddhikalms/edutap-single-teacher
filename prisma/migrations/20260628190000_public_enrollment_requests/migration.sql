ALTER TABLE `Notification`
  MODIFY `type` ENUM(
    'NOTICE','PAYMENT_DUE','PAYMENT_OVERDUE','ABSENT_ALERT','CLASS_NOTICE','RECEIPT',
    'ATTENDANCE_ARRIVAL','CLASS_STARTED','STUDENT_ARRIVED','CLASS_ENDED',
    'PAYMENT_REMINDER','HOMEWORK_ASSIGNED','HOMEWORK_REVIEWED','QUIZ_ASSIGNED',
    'LIVE_CLASS_REMINDER','COURSE_RESOURCE_UPLOADED','ENROLLMENT_REQUEST',
    'ENROLLMENT_APPROVED','ENROLLMENT_REJECTED'
  ) NOT NULL DEFAULT 'NOTICE';

ALTER TABLE `NotificationLog`
  MODIFY `type` ENUM(
    'NOTICE','PAYMENT_DUE','PAYMENT_OVERDUE','ABSENT_ALERT','CLASS_NOTICE','RECEIPT',
    'ATTENDANCE_ARRIVAL','CLASS_STARTED','STUDENT_ARRIVED','CLASS_ENDED',
    'PAYMENT_REMINDER','HOMEWORK_ASSIGNED','HOMEWORK_REVIEWED','QUIZ_ASSIGNED',
    'LIVE_CLASS_REMINDER','COURSE_RESOURCE_UPLOADED','ENROLLMENT_REQUEST',
    'ENROLLMENT_APPROVED','ENROLLMENT_REJECTED'
  ) NOT NULL;

CREATE TABLE `EnrollmentRequest` (
  `id` VARCHAR(191) NOT NULL,
  `instituteId` VARCHAR(191) NOT NULL,
  `studentName` VARCHAR(191) NOT NULL,
  `studentMobile` VARCHAR(191) NOT NULL,
  `studentEmail` VARCHAR(191) NULL,
  `parentName` VARCHAR(191) NOT NULL,
  `parentMobile` VARCHAR(191) NOT NULL,
  `parentEmail` VARCHAR(191) NULL,
  `gradeId` VARCHAR(191) NOT NULL,
  `subjectId` VARCHAR(191) NOT NULL,
  `classGroupId` VARCHAR(191) NOT NULL,
  `message` TEXT NULL,
  `status` ENUM('PENDING','APPROVED','REJECTED','CONVERTED') NOT NULL DEFAULT 'PENDING',
  `teacherNote` TEXT NULL,
  `approvedAt` DATETIME(3) NULL,
  `rejectedAt` DATETIME(3) NULL,
  `convertedStudentId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `EnrollmentRequest_instituteId_status_createdAt_idx` (`instituteId`, `status`, `createdAt`),
  INDEX `EnrollmentRequest_classGroupId_idx` (`classGroupId`),
  INDEX `EnrollmentRequest_studentMobile_idx` (`studentMobile`),
  INDEX `EnrollmentRequest_parentMobile_idx` (`parentMobile`),
  INDEX `EnrollmentRequest_convertedStudentId_idx` (`convertedStudentId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `EnrollmentRequest`
  ADD CONSTRAINT `EnrollmentRequest_instituteId_fkey` FOREIGN KEY (`instituteId`) REFERENCES `Institute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `EnrollmentRequest_gradeId_fkey` FOREIGN KEY (`gradeId`) REFERENCES `Grade`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `EnrollmentRequest_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `EnrollmentRequest_classGroupId_fkey` FOREIGN KEY (`classGroupId`) REFERENCES `ClassGroup`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `EnrollmentRequest_convertedStudentId_fkey` FOREIGN KEY (`convertedStudentId`) REFERENCES `Student`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
