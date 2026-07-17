CREATE TABLE IF NOT EXISTS `dalan_circle_pinned_item` (
  `id` varchar(64) NOT NULL,
  `circle_id` varchar(64) NOT NULL,
  `kind` varchar(20) NOT NULL DEFAULT 'announcement' COMMENT 'rules/announcement/activity',
  `title` varchar(120) NOT NULL,
  `content` text NOT NULL,
  `images` json NOT NULL COMMENT 'OSS ID 数组',
  `publisher_id` bigint NOT NULL,
  `view_count` bigint NOT NULL DEFAULT 0,
  `activity_status` varchar(20) DEFAULT NULL COMMENT 'active/ended',
  `sort_order` int NOT NULL DEFAULT 0,
  `status` varchar(20) NOT NULL DEFAULT 'published' COMMENT 'published/hidden/deleted',
  `published_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_circle_pinned_display` (`circle_id`,`status`,`sort_order`,`published_at`),
  KEY `idx_circle_pinned_publisher` (`publisher_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='圈子置顶消息';
