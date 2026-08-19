ALTER TABLE `institutesettings`
  ADD COLUMN `classTypeOptions` JSON NULL;

ALTER TABLE `classgroup`
  MODIFY `classType` VARCHAR(191) NOT NULL DEFAULT 'Individual';

UPDATE `classgroup`
SET `classType` = CASE `classType`
  WHEN 'INHOUSE' THEN 'Individual'
  WHEN 'ONLINE' THEN 'Spoken'
  WHEN 'HYBRID' THEN 'Group'
  ELSE `classType`
END;

UPDATE `institutesettings`
SET `classTypeOptions` = JSON_ARRAY('Individual', 'Group', 'Spoken')
WHERE `classTypeOptions` IS NULL;
