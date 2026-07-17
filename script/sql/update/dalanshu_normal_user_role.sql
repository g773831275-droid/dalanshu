-- 邮箱注册用户默认角色。
-- 角色不授予管理端菜单权限，仅用于标识普通前台用户；脚本可重复执行。

UPDATE sys_role
SET role_name = '普通用户',
    role_sort = 20,
    data_scope = '5',
    menu_check_strictly = 1,
    dept_check_strictly = 1,
    status = '0',
    del_flag = '0',
    remark = '大蓝树前端邮箱注册用户默认角色'
WHERE tenant_id = '000000'
  AND role_key = 'normal_user';

INSERT INTO sys_role (role_id, tenant_id, role_name, role_key, role_sort, data_scope,
  menu_check_strictly, dept_check_strictly, status, del_flag, create_dept, create_by, create_time, remark)
SELECT 20000, '000000', '普通用户', 'normal_user', 20, '5',
       1, 1, '0', '0', 103, 1, NOW(), '大蓝树前端邮箱注册用户默认角色'
WHERE NOT EXISTS (
    SELECT 1 FROM sys_role WHERE tenant_id = '000000' AND role_key = 'normal_user'
);

-- 为本功能上线前已经通过邮箱注册的有效前台账号补齐角色。
INSERT INTO sys_user_role (user_id, role_id)
SELECT u.user_id, r.role_id
FROM sys_user u
JOIN sys_role r
  ON r.tenant_id = u.tenant_id
 AND r.role_key = 'normal_user'
 AND r.status = '0'
 AND r.del_flag = '0'
WHERE u.tenant_id = '000000'
  AND u.del_flag = '0'
  AND u.user_type = 'sys_user'
  AND u.email <> ''
  AND LEFT(u.user_name, 2) = 'u_'
  AND NOT EXISTS (
      SELECT 1
      FROM sys_user_role ur
      WHERE ur.user_id = u.user_id
        AND ur.role_id = r.role_id
  );
