ALTER TABLE `Teacher`
  ADD COLUMN `classTypeOptions` JSON NULL;

UPDATE `Teacher` t
JOIN `InstituteSettings` s ON s.`instituteId` = t.`instituteId`
SET t.`classTypeOptions` = s.`classTypeOptions`
WHERE t.`classTypeOptions` IS NULL
  AND s.`classTypeOptions` IS NOT NULL;
