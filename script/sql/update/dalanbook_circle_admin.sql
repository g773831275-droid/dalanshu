-- 大蓝书圈子运营配置扩展（MySQL 8.0+，可重复执行）
SET NAMES utf8mb4;

SET @schema_name = DATABASE();

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'dalan_circle_v1' AND column_name = 'recommend_weight'),
  'SELECT 1',
  'ALTER TABLE dalan_circle_v1 ADD COLUMN recommend_weight int NOT NULL DEFAULT 0 COMMENT ''运营推荐权重'' AFTER post_count'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'dalan_circle_v1' AND column_name = 'home_visible'),
  'SELECT 1',
  'ALTER TABLE dalan_circle_v1 ADD COLUMN home_visible tinyint(1) NOT NULL DEFAULT 0 COMMENT ''首页展示'' AFTER recommend_weight'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'dalan_circle_v1' AND column_name = 'sort_order'),
  'SELECT 1',
  'ALTER TABLE dalan_circle_v1 ADD COLUMN sort_order int NOT NULL DEFAULT 0 COMMENT ''圈子排序'' AFTER home_visible'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
