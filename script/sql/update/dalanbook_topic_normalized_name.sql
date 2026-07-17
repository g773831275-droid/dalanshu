-- 大蓝书话题标准化唯一键
-- 可重复执行；发布对应后端版本前先执行本脚本。

SET @add_normalized_name = IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'dalan_topic'
      AND COLUMN_NAME = 'normalized_name'
  ),
  'SELECT 1',
  'ALTER TABLE `dalan_topic` ADD COLUMN `normalized_name` varchar(80) DEFAULT NULL AFTER `name`'
);
PREPARE stmt FROM @add_normalized_name;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 历史话题名称已经有 name 唯一键；此处为已存在数据补齐标准化值。
UPDATE `dalan_topic`
SET `normalized_name` = LOWER(REPLACE(REPLACE(TRIM(`name`), ' ', ''), '　', ''))
WHERE `normalized_name` IS NULL OR `normalized_name` = '';

SET @add_normalized_index = IF(
  EXISTS(
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'dalan_topic'
      AND INDEX_NAME = 'uk_dalan_topic_normalized_name'
  ),
  'SELECT 1',
  'ALTER TABLE `dalan_topic` ADD UNIQUE KEY `uk_dalan_topic_normalized_name` (`normalized_name`)'
);
PREPARE stmt FROM @add_normalized_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
