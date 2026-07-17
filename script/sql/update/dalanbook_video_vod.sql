-- Dalanbook VOD short-video assets (MySQL 8.0+).
-- Safe to rerun: the table uses IF NOT EXISTS; post schema changes are guarded by metadata checks.

CREATE TABLE IF NOT EXISTS `dalan_video_asset` (
  `id` varchar(64) NOT NULL,
  `author_id` bigint NOT NULL,
  `vod_vid` varchar(128) DEFAULT NULL,
  `file_name` varchar(255) NOT NULL,
  `content_type` varchar(100) NOT NULL,
  `file_size` bigint NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'uploading',
  `poster_url` varchar(1000) NOT NULL DEFAULT '',
  `duration_ms` bigint DEFAULT NULL,
  `width` int DEFAULT NULL,
  `height` int DEFAULT NULL,
  `failure_reason` varchar(1000) NOT NULL DEFAULT '',
  `callback_event_id` varchar(128) DEFAULT NULL,
  `upload_expires_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dalan_video_asset_vid` (`vod_vid`),
  KEY `idx_dalan_video_asset_author_status` (`author_id`, `status`, `created_at`),
  KEY `idx_dalan_video_asset_expiry` (`status`, `upload_expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='大蓝书火山 VOD 视频资产';

SET @schema_name = DATABASE();

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'dalan_post_v1' AND column_name = 'video_asset_id'),
  'SELECT 1',
  'ALTER TABLE dalan_post_v1 ADD COLUMN video_asset_id varchar(64) DEFAULT NULL COMMENT ''关联的视频资产'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema = @schema_name AND table_name = 'dalan_post_v1' AND index_name = 'idx_dalan_post_video_asset'),
  'SELECT 1',
  'ALTER TABLE dalan_post_v1 ADD INDEX idx_dalan_post_video_asset (video_asset_id)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
