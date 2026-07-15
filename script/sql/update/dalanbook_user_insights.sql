-- 网页第一版用户基础画像与设备数据。

ALTER TABLE `dalan_user_profile`
  ADD COLUMN `age_range` varchar(20) NOT NULL DEFAULT 'unknown' AFTER `location`,
  ADD COLUMN `province_code` varchar(20) NOT NULL DEFAULT '' AFTER `age_range`,
  ADD COLUMN `province_name` varchar(40) NOT NULL DEFAULT '' AFTER `province_code`,
  ADD COLUMN `city_code` varchar(20) NOT NULL DEFAULT '' AFTER `province_name`,
  ADD COLUMN `city_name` varchar(40) NOT NULL DEFAULT '' AFTER `city_code`;

CREATE TABLE IF NOT EXISTS `dalan_user_device` (
  `id` varchar(64) NOT NULL,
  `user_id` bigint NOT NULL,
  `device_id_hash` char(64) NOT NULL,
  `source` varchar(20) NOT NULL DEFAULT 'web',
  `device_type` varchar(20) NOT NULL DEFAULT 'unknown',
  `brand` varchar(60) NOT NULL DEFAULT '',
  `model` varchar(120) NOT NULL DEFAULT '',
  `os` varchar(40) NOT NULL DEFAULT '',
  `os_version` varchar(40) NOT NULL DEFAULT '',
  `browser` varchar(40) NOT NULL DEFAULT '',
  `browser_version` varchar(40) NOT NULL DEFAULT '',
  `screen_width` int DEFAULT NULL,
  `screen_height` int DEFAULT NULL,
  `pixel_ratio` decimal(6,2) DEFAULT NULL,
  `language` varchar(30) NOT NULL DEFAULT '',
  `timezone` varchar(80) NOT NULL DEFAULT '',
  `first_seen_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `last_seen_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dalan_user_device_identity` (`user_id`,`device_id_hash`),
  KEY `idx_dalan_user_device_last_seen` (`user_id`,`last_seen_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='大蓝书用户网页与客户端设备';
