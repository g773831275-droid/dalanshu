-- Dalanbook API v1 business schema (MySQL 8.0+)
-- Authentication identities and global roles reuse sys_user / sys_user_role.

CREATE TABLE IF NOT EXISTS `dalan_user_profile` (
  `user_id` bigint NOT NULL,
  `bio` varchar(300) NOT NULL DEFAULT '',
  `gender` varchar(20) NOT NULL DEFAULT 'unknown',
  `location` varchar(100) NOT NULL DEFAULT '',
  `age_range` varchar(20) NOT NULL DEFAULT 'unknown',
  `province_code` varchar(20) NOT NULL DEFAULT '',
  `province_name` varchar(40) NOT NULL DEFAULT '',
  `city_code` varchar(20) NOT NULL DEFAULT '',
  `city_name` varchar(40) NOT NULL DEFAULT '',
  `follower_count` bigint NOT NULL DEFAULT 0,
  `following_count` bigint NOT NULL DEFAULT 0,
  `post_count` bigint NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='大蓝书用户业务资料';

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

CREATE TABLE IF NOT EXISTS `dalan_follow` (
  `follower_id` bigint NOT NULL,
  `followee_id` bigint NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`follower_id`,`followee_id`),
  KEY `idx_follow_followee` (`followee_id`,`created_at`),
  CONSTRAINT `chk_dalan_follow_self` CHECK (`follower_id` <> `followee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='大蓝书用户关注';

CREATE TABLE IF NOT EXISTS `dalan_circle_v1` (
  `id` varchar(64) NOT NULL,
  `owner_id` bigint NOT NULL,
  `name` varchar(80) NOT NULL,
  `cover` varchar(500) NOT NULL DEFAULT '',
  `description` varchar(300) NOT NULL DEFAULT '',
  `category` varchar(40) NOT NULL,
  `tags` json NOT NULL,
  `member_count` bigint NOT NULL DEFAULT 0,
  `post_count` bigint NOT NULL DEFAULT 0,
  `recommend_weight` int NOT NULL DEFAULT 0 COMMENT '运营推荐权重',
  `home_visible` tinyint(1) NOT NULL DEFAULT 0 COMMENT '首页展示',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '圈子排序',
  `status` varchar(20) NOT NULL DEFAULT 'published',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dalan_circle_name` (`name`),
  KEY `idx_dalan_circle_category` (`category`,`status`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='大蓝书圈子 v1';

CREATE TABLE IF NOT EXISTS `dalan_circle_member` (
  `circle_id` varchar(64) NOT NULL,
  `user_id` bigint NOT NULL,
  `role` varchar(20) NOT NULL DEFAULT 'member',
  `joined_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`circle_id`,`user_id`),
  KEY `idx_circle_member_user` (`user_id`,`joined_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='大蓝书圈子成员';

CREATE TABLE IF NOT EXISTS `dalan_post_v1` (
  `id` varchar(64) NOT NULL,
  `author_id` bigint NOT NULL,
  `circle_id` varchar(64) NOT NULL,
  `title` varchar(120) NOT NULL,
  `content` text NOT NULL,
  `images` json NOT NULL,
  `video_asset_id` varchar(64) DEFAULT NULL COMMENT '关联的视频资产',
  `cover` varchar(500) NOT NULL DEFAULT '',
  `ratio` varchar(10) NOT NULL DEFAULT '4/5',
  `tag` varchar(20) DEFAULT NULL,
  `visibility` varchar(20) NOT NULL DEFAULT 'public',
  `status` varchar(20) NOT NULL DEFAULT 'published',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_dalan_post_feed` (`status`,`created_at`,`id`),
  KEY `idx_dalan_post_circle` (`circle_id`,`status`,`created_at`,`id`),
  KEY `idx_dalan_post_author` (`author_id`,`status`,`created_at`,`id`),
  KEY `idx_dalan_post_video_asset` (`video_asset_id`),
  FULLTEXT KEY `ft_dalan_post_search` (`title`,`content`) WITH PARSER ngram
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='大蓝书帖子 v1';

CREATE TABLE IF NOT EXISTS `dalan_topic` (
  `id` varchar(64) NOT NULL,
  `slug` varchar(80) NOT NULL,
  `name` varchar(40) NOT NULL,
  `description` varchar(300) NOT NULL DEFAULT '',
  `post_count` bigint NOT NULL DEFAULT 0,
  `status` varchar(20) NOT NULL DEFAULT 'published',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dalan_topic_slug` (`slug`),
  UNIQUE KEY `uk_dalan_topic_name` (`name`),
  KEY `idx_dalan_topic_hot` (`status`,`post_count`,`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='大蓝书话题';

CREATE TABLE IF NOT EXISTS `dalan_post_topic` (
  `post_id` varchar(64) NOT NULL,
  `topic_id` varchar(64) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`post_id`,`topic_id`),
  KEY `idx_dalan_post_topic_topic` (`topic_id`,`created_at`,`post_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='大蓝书帖子话题关系';

CREATE TABLE IF NOT EXISTS `dalan_post_stats` (
  `post_id` varchar(64) NOT NULL,
  `useful_count` bigint NOT NULL DEFAULT 0,
  `like_count` bigint NOT NULL DEFAULT 0,
  `comment_count` bigint NOT NULL DEFAULT 0,
  `favorite_count` bigint NOT NULL DEFAULT 0,
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`post_id`),
  KEY `idx_post_stats_useful` (`useful_count`,`post_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='大蓝书帖子统计';

CREATE TABLE IF NOT EXISTS `dalan_post_reaction` (
  `post_id` varchar(64) NOT NULL,
  `user_id` bigint NOT NULL,
  `type` varchar(20) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`post_id`,`user_id`,`type`),
  KEY `idx_post_reaction_user` (`user_id`,`type`,`created_at`),
  CONSTRAINT `chk_dalan_reaction_type` CHECK (`type` IN ('useful','like','favorite'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='大蓝书帖子互动';

CREATE TABLE IF NOT EXISTS `dalan_comment` (
  `id` varchar(64) NOT NULL,
  `post_id` varchar(64) NOT NULL,
  `parent_id` varchar(64) DEFAULT NULL,
  `author_id` bigint NOT NULL,
  `content` varchar(1000) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'published',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_dalan_comment_post` (`post_id`,`status`,`created_at`,`id`),
  KEY `idx_dalan_comment_parent` (`parent_id`,`status`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='大蓝书评论';

CREATE TABLE IF NOT EXISTS `dalan_notification` (
  `id` varchar(64) NOT NULL,
  `user_id` bigint NOT NULL,
  `type` varchar(40) NOT NULL,
  `payload` json NOT NULL,
  `read_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_notification_user_unread` (`user_id`,`read_at`,`created_at`,`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='大蓝书通知';

CREATE TABLE IF NOT EXISTS `dalan_sms_code` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `phone` varchar(32) NOT NULL,
  `code_hash` varchar(100) NOT NULL,
  `scene` varchar(30) NOT NULL,
  `expires_at` datetime(3) NOT NULL,
  `used_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_sms_phone_scene` (`phone`,`scene`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='大蓝书短信验证码';

CREATE TABLE IF NOT EXISTS `dalan_event_impression` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `anonymous_id` varchar(64) DEFAULT NULL,
  `post_id` varchar(64) NOT NULL,
  `category_id` varchar(40) DEFAULT NULL,
  `occurred_at` datetime(3) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_impression_post_time` (`post_id`,`occurred_at`),
  KEY `idx_impression_user_time` (`user_id`,`occurred_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='大蓝书曝光事件';
