-- 大蓝书组织结构初始化。
-- 公司员工部门与社区用户归属分开管理；社区身份权限仍应由角色控制。

START TRANSACTION;

UPDATE sys_dept
SET dept_name = '大蓝书',
    parent_id = 0,
    ancestors = '0',
    order_num = 0,
    update_time = NOW()
WHERE tenant_id = '000000' AND dept_id = 100;

UPDATE sys_dept
SET dept_name = '平台公司',
    parent_id = 100,
    ancestors = '0,100',
    order_num = 1,
    update_time = NOW()
WHERE tenant_id = '000000' AND dept_id = 101;

UPDATE sys_dept
SET dept_name = '社区用户中心',
    parent_id = 100,
    ancestors = '0,100',
    order_num = 2,
    update_time = NOW()
WHERE tenant_id = '000000' AND dept_id = 102;

UPDATE sys_dept
SET dept_name = '研发部门', parent_id = 101, ancestors = '0,100,101', order_num = 1, update_time = NOW()
WHERE tenant_id = '000000' AND dept_id = 103;

UPDATE sys_dept
SET dept_name = '运营部门', parent_id = 101, ancestors = '0,100,101', order_num = 2, update_time = NOW()
WHERE tenant_id = '000000' AND dept_id = 105;

UPDATE sys_dept
SET dept_name = '运维部门', parent_id = 101, ancestors = '0,100,101', order_num = 3, update_time = NOW()
WHERE tenant_id = '000000' AND dept_id = 107;

UPDATE sys_dept
SET dept_name = '营销部门', parent_id = 101, ancestors = '0,100,101', order_num = 4, update_time = NOW()
WHERE tenant_id = '000000' AND dept_id = 104;

UPDATE sys_dept
SET dept_name = '财务部门', parent_id = 101, ancestors = '0,100,101', order_num = 5, update_time = NOW()
WHERE tenant_id = '000000' AND dept_id = 106;

UPDATE sys_dept
SET dept_name = '普通用户', parent_id = 102, ancestors = '0,100,102', order_num = 1, update_time = NOW()
WHERE tenant_id = '000000' AND dept_id = 108;

UPDATE sys_dept
SET dept_name = '达人 / 大V', parent_id = 102, ancestors = '0,100,102', order_num = 2, update_time = NOW()
WHERE tenant_id = '000000' AND dept_id = 109;

-- 已注册的社区账号统一归入普通用户；后续认证后可迁入达人 / 大V。
UPDATE sys_user
SET dept_id = 108,
    update_time = NOW()
WHERE tenant_id = '000000'
  AND del_flag = '0'
  AND user_name LIKE 'u\_%';

-- 保留的后台演示账号归入公司部门，避免混入真实社区用户统计。
UPDATE sys_user
SET dept_id = 105, update_time = NOW()
WHERE tenant_id = '000000' AND user_name = 'test' AND del_flag = '0';

UPDATE sys_user
SET dept_id = 104, update_time = NOW()
WHERE tenant_id = '000000' AND user_name = 'test1' AND del_flag = '0';

UPDATE sys_user
SET nick_name = '平台管理员', update_time = NOW()
WHERE tenant_id = '000000' AND user_name = 'admin' AND del_flag = '0';

COMMIT;
