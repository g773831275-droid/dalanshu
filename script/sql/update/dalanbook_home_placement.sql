-- 首页广告弹窗与置顶公告（MySQL 8.0+，可重复执行）
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `dalan_home_placement` (
  `id` varchar(64) NOT NULL,
  `placement_type` varchar(20) NOT NULL COMMENT 'popup_ad/pinned_notice',
  `title` varchar(120) NOT NULL,
  `summary` varchar(500) DEFAULT NULL,
  `content` text DEFAULT NULL,
  `image_oss_id` bigint DEFAULT NULL,
  `cta_text` varchar(40) DEFAULT NULL,
  `target_url` varchar(500) DEFAULT NULL,
  `priority` int NOT NULL DEFAULT 0,
  `status` varchar(20) NOT NULL DEFAULT 'hidden' COMMENT 'published/hidden/deleted',
  `starts_at` datetime(3) DEFAULT NULL,
  `ends_at` datetime(3) DEFAULT NULL,
  `display_version` int NOT NULL DEFAULT 1,
  `operator_id` bigint DEFAULT NULL,
  `published_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_home_placement_type` CHECK (`placement_type` IN ('popup_ad', 'pinned_notice')),
  CONSTRAINT `chk_home_placement_status` CHECK (`status` IN ('published', 'hidden', 'deleted')),
  KEY `idx_home_placement_active` (`placement_type`,`status`,`starts_at`,`ends_at`,`priority`,`published_at`),
  KEY `idx_home_placement_updated` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='大蓝书首页运营位';

INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query_param,
  is_frame, is_cache, menu_type, visible, status, perms, icon, create_dept, create_by, create_time, remark)
SELECT 19004, '首页运营', 19000, 4, 'home-placement', 'dalanbook/home-placement/index', '', 1, 0, 'C', '0', '0', 'dalanbook:home-placement:list', 'message', 103, 1, NOW(), '首页广告与公告管理'
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 19004);

INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query_param,
  is_frame, is_cache, menu_type, visible, status, perms, icon, create_dept, create_by, create_time, remark)
SELECT 19016, '首页运营编辑', 19004, 1, '#', '', '', 1, 0, 'F', '0', '0', 'dalanbook:home-placement:edit', '#', 103, 1, NOW(), ''
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 19016);
INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query_param,
  is_frame, is_cache, menu_type, visible, status, perms, icon, create_dept, create_by, create_time, remark)
SELECT 19017, '首页运营新增', 19004, 2, '#', '', '', 1, 0, 'F', '0', '0', 'dalanbook:home-placement:add', '#', 103, 1, NOW(), ''
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 19017);
INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query_param,
  is_frame, is_cache, menu_type, visible, status, perms, icon, create_dept, create_by, create_time, remark)
SELECT 19018, '首页运营删除', 19004, 3, '#', '', '', 1, 0, 'F', '0', '0', 'dalanbook:home-placement:remove', '#', 103, 1, NOW(), ''
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 19018);

UPDATE sys_menu SET menu_name = '首页运营', remark = '首页广告与公告管理' WHERE menu_id = 19004;

INSERT INTO sys_role_menu (role_id, menu_id)
SELECT role.role_id, menu.menu_id
FROM sys_role role
JOIN sys_menu menu ON menu.menu_id IN (19004, 19016, 19017, 19018)
WHERE role.role_key = 'content_operator'
  AND NOT EXISTS (SELECT 1 FROM sys_role_menu rm WHERE rm.role_id = role.role_id AND rm.menu_id = menu.menu_id);
