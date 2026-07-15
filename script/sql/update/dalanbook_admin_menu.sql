-- 大蓝书内容运营后台菜单（MySQL 8.0+，可重复执行）
SET NAMES utf8mb4;

INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query_param,
  is_frame, is_cache, menu_type, visible, status, perms, icon, create_dept, create_by, create_time, remark)
SELECT 19000, '大蓝书运营', 0, 4, 'dalanbook', NULL, '', 1, 0, 'M', '0', '0', '', 'documentation', 103, 1, NOW(), '大蓝书内容运营目录'
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 19000);

INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query_param,
  is_frame, is_cache, menu_type, visible, status, perms, icon, create_dept, create_by, create_time, remark)
SELECT 19001, '帖子管理', 19000, 1, 'posts', 'dalanbook/manage/index', '', 1, 0, 'C', '0', '0', 'dalanbook:post:list', 'form', 103, 1, NOW(), '帖子审核与上下架'
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 19001);

INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query_param,
  is_frame, is_cache, menu_type, visible, status, perms, icon, create_dept, create_by, create_time, remark)
SELECT 19002, '圈子管理', 19000, 2, 'circles', 'dalanbook/manage/index', '', 1, 0, 'C', '0', '0', 'dalanbook:circle:list', 'peoples', 103, 1, NOW(), '圈子审核与上下架'
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 19002);

INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query_param,
  is_frame, is_cache, menu_type, visible, status, perms, icon, create_dept, create_by, create_time, remark)
SELECT 19003, '话题管理', 19000, 3, 'topics', 'dalanbook/manage/index', '', 1, 0, 'C', '0', '0', 'dalanbook:topic:list', 'dict', 103, 1, NOW(), '话题编辑与上下架'
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 19003);

INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query_param,
  is_frame, is_cache, menu_type, visible, status, perms, icon, create_dept, create_by, create_time, remark)
SELECT 19011, '帖子审核', 19001, 1, '#', '', '', 1, 0, 'F', '0', '0', 'dalanbook:post:edit', '#', 103, 1, NOW(), ''
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 19011);
INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query_param,
  is_frame, is_cache, menu_type, visible, status, perms, icon, create_dept, create_by, create_time, remark)
SELECT 19012, '圈子审核', 19002, 1, '#', '', '', 1, 0, 'F', '0', '0', 'dalanbook:circle:edit', '#', 103, 1, NOW(), ''
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 19012);
INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query_param,
  is_frame, is_cache, menu_type, visible, status, perms, icon, create_dept, create_by, create_time, remark)
SELECT 19013, '话题编辑', 19003, 1, '#', '', '', 1, 0, 'F', '0', '0', 'dalanbook:topic:edit', '#', 103, 1, NOW(), ''
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 19013);

INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query_param,
  is_frame, is_cache, menu_type, visible, status, perms, icon, create_dept, create_by, create_time, remark)
SELECT 19014, '圈子新增', 19002, 2, '#', '', '', 1, 0, 'F', '0', '0', 'dalanbook:circle:add', '#', 103, 1, NOW(), ''
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 19014);
INSERT INTO sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query_param,
  is_frame, is_cache, menu_type, visible, status, perms, icon, create_dept, create_by, create_time, remark)
SELECT 19015, '圈子删除', 19002, 3, '#', '', '', 1, 0, 'F', '0', '0', 'dalanbook:circle:remove', '#', 103, 1, NOW(), ''
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE menu_id = 19015);

-- 修复曾通过非 UTF-8 连接导入的菜单文字，同时保证重复执行可同步菜单定义。
UPDATE sys_menu SET menu_name = '大蓝书运营', remark = '大蓝书内容运营目录' WHERE menu_id = 19000;
UPDATE sys_menu SET menu_name = '帖子管理', remark = '帖子审核与上下架' WHERE menu_id = 19001;
UPDATE sys_menu SET menu_name = '圈子管理', remark = '圈子审核与上下架' WHERE menu_id = 19002;
UPDATE sys_menu SET menu_name = '话题管理', remark = '话题编辑与上下架' WHERE menu_id = 19003;
UPDATE sys_menu SET menu_name = '帖子审核' WHERE menu_id = 19011;
UPDATE sys_menu SET menu_name = '圈子审核' WHERE menu_id = 19012;
UPDATE sys_menu SET menu_name = '话题编辑' WHERE menu_id = 19013;
UPDATE sys_menu SET menu_name = '圈子新增' WHERE menu_id = 19014;
UPDATE sys_menu SET menu_name = '圈子删除' WHERE menu_id = 19015;

-- 内容运营角色：平台管理员拥有全部权限；普通运营账号可由管理员分配此角色。
INSERT INTO sys_role (role_id, tenant_id, role_name, role_key, role_sort, data_scope,
  menu_check_strictly, dept_check_strictly, status, del_flag, create_dept, create_by, create_time, remark)
SELECT 19000, '000000', '内容运营', 'content_operator', 10, '1', 1, 1, '0', '0', 103, 1, NOW(), '大蓝书内容与圈子运营'
WHERE NOT EXISTS (SELECT 1 FROM sys_role WHERE role_id = 19000 OR role_key = 'content_operator');

INSERT INTO sys_role_menu (role_id, menu_id)
SELECT role.role_id, menu.menu_id
FROM sys_role role
JOIN sys_menu menu ON menu.menu_id IN (19000, 19001, 19002, 19003, 19011, 19012, 19013, 19014, 19015)
WHERE role.role_key = 'content_operator'
  AND NOT EXISTS (SELECT 1 FROM sys_role_menu rm WHERE rm.role_id = role.role_id AND rm.menu_id = menu.menu_id);
