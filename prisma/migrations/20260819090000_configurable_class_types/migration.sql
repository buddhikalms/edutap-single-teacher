ALTER TABLE `InstituteSettings`
  ADD COLUMN `classTypeOptions` JSON NULL;

ALTER TABLE `ClassGroup`
  MODIFY `classType` VARCHAR(191) NOT NULL DEFAULT 'Individual';

UPDATE `ClassGroup`
SET `classType` = CASE `classType`
  WHEN 'INHOUSE' THEN 'Individual'
  WHEN 'ONLINE' THEN 'Spoken'
  WHEN 'HYBRID' THEN 'Group'
  ELSE `classType`
END;

UPDATE `InstituteSettings`
SET `classTypeOptions` = JSON_ARRAY('Individual', 'Group', 'Spoken')
WHERE `classTypeOptions` IS NULL;
