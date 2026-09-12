SELECT
  DATABASE() AS current_database,
  @@hostname AS host,
  @@lower_case_table_names AS lower_case_table_names;

SHOW TABLES LIKE 'Student';
SHOW TABLES LIKE 'student';
SHOW TABLES LIKE 'Parent';
SHOW TABLES LIKE 'parent';
SHOW TABLES LIKE 'Enrollment';
SHOW TABLES LIKE 'enrollment';
SHOW TABLES LIKE '_ParentToStudent';
SHOW TABLES LIKE '_parenttostudent';

SELECT id, name, slug, email, active
FROM `Institute`
ORDER BY createdAt DESC;

SELECT id, name, code, instituteId, isActive
FROM `Branch`
ORDER BY createdAt DESC;

SELECT id, name, code, instituteId, branchId, status
FROM `ClassGroup`
ORDER BY name;
