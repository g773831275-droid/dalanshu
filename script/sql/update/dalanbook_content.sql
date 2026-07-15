CREATE TABLE IF NOT EXISTS `dalan_circle` (
  `id` varchar(64) NOT NULL,
  `name` varchar(80) NOT NULL,
  `cover_key` varchar(80) NOT NULL,
  `description` varchar(300) NOT NULL DEFAULT '',
  `member_count` bigint NOT NULL DEFAULT 0,
  `post_count` bigint NOT NULL DEFAULT 0,
  `category` varchar(40) NOT NULL,
  `tags` varchar(255) NOT NULL DEFAULT '',
  `sort_order` int NOT NULL DEFAULT 0,
  `status` varchar(20) NOT NULL DEFAULT 'published',
  PRIMARY KEY (`id`), KEY `idx_circle_category` (`category`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='大蓝书圈子';

CREATE TABLE IF NOT EXISTS `dalan_post` (
  `id` varchar(64) NOT NULL,
  `circle_id` varchar(64) NOT NULL,
  `title` varchar(120) NOT NULL,
  `content` text NOT NULL,
  `cover_key` varchar(80) NOT NULL,
  `image_ratio` varchar(10) NOT NULL DEFAULT '4/5',
  `post_tag` varchar(30) NOT NULL DEFAULT '经验',
  `topics` varchar(500) NOT NULL DEFAULT '',
  `author_id` varchar(64) NOT NULL,
  `author_name` varchar(80) NOT NULL,
  `avatar_color` varchar(20) NOT NULL DEFAULT '#245BDB',
  `useful_count` bigint NOT NULL DEFAULT 0,
  `location` varchar(100) DEFAULT NULL,
  `visibility` varchar(20) NOT NULL DEFAULT 'public',
  `status` varchar(20) NOT NULL DEFAULT 'published',
  `create_time` datetime NOT NULL,
  `update_time` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_post_feed` (`status`, `useful_count`, `create_time`),
  KEY `idx_post_circle` (`circle_id`, `status`, `create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='大蓝书帖子';

INSERT IGNORE INTO `dalan_circle`
(`id`,`name`,`cover_key`,`description`,`member_count`,`post_count`,`category`,`tags`,`sort_order`,`status`) VALUES
('ai-tools','AI 工具圈','cover-ai-desk','分享 AI 工具、自动化流程、Prompt 与真实的效率经验。',128000,3240,'AI 工具','AI,效率,自动化',10,'published'),
('career-growth','职场成长圈','cover-portrait-pm','从入职到晋升，聊聊真实的选择、复盘与反常识经验。',86000,5102,'职场成长','职场,晋升,复盘',20,'published'),
('fitness-cut','健身减脂圈','cover-gym','训练计划、饮食安排与身材数据，只讲能被复现的方法。',62000,2880,'健身运动','减脂,训练,饮食',30,'published'),
('desk-setup','数码装备圈','cover-desk-setup','键鼠、显示器、耳机、桌搭。真实使用一年后再评价。',94000,4650,'数码装备','桌搭,外设,评测',40,'published'),
('gentlemen-life','男士生活圈','cover-edc','穿搭、护理、EDC 与生活方式。克制、耐用、不猎奇。',41000,1920,'男士生活','穿搭,EDC,护理',50,'published'),
('outdoor','户外兴趣圈','cover-outdoor','徒步、露营、骑行的路线笔记与装备清单。',37000,1410,'户外兴趣','徒步,露营,装备',60,'published');

INSERT IGNORE INTO `dalan_post`
(`id`,`circle_id`,`title`,`content`,`cover_key`,`image_ratio`,`post_tag`,`topics`,`author_id`,`author_name`,`avatar_color`,`useful_count`,`location`,`visibility`,`status`,`create_time`,`update_time`) VALUES
('p1','ai-tools','我用了 30 天 AI Agent，真正有用的是这 4 个场景','这是一份来自真实工作流的 30 天复盘。','cover-ai-desk','4/5','经验','AI,效率','lin-shen','林深','#245BDB',328,'北京 · 海淀','public','published',NOW(),NOW()),
('p2','fitness-cut','从 92kg 到 78kg，上班族减脂真实复盘','记录饮食、训练与平台期的真实数据。','cover-gym','3/4','复盘','减脂,复盘','chris','Chris','#1F9D6A',486,'上海','public','published',NOW(),NOW()),
('p3','desk-setup','3000 元预算做一套安静高效的桌搭，我踩过的坑','预算有限时，先解决每天都会感受到的问题。','cover-desk-setup','1/1','测评','桌搭,评测','desk-zhou','老周的桌面','#0D1B33',188,NULL,'public','published',NOW(),NOW()),
('p4','career-growth','前大厂产品总监：普通人如何判断行业机会？','判断机会不是追热点，而是看问题是否持续存在。','cover-portrait-pm','4/5','大神分享','职场,选择','zhou-hang','周航','#245BDB',612,'杭州 · 西湖','public','published',NOW(),NOW()),
('p6','outdoor','第一次徒步 30km，我准备了这些装备','第一次长距离徒步的装备取舍清单。','cover-outdoor','3/4','经验','徒步,装备','shanye','山野川','#1F9D6A',92,NULL,'public','published',NOW(),NOW()),
('p7','gentlemen-life','工作五年，我留下的日常随身物 8 件','不求多，只留下真正每天使用的物品。','cover-edc','4/5','清单','EDC,生活','jianzi','简子','#D88B16',156,NULL,'public','published',NOW(),NOW());
