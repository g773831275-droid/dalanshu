-- 大蓝书 Web 客户端访问令牌固定有效期与活跃有效期统一为 3 天。
-- 可重复执行；刷新令牌的轮换有效期不受此脚本影响。

UPDATE sys_client
SET active_timeout = 259200,
    timeout = 259200,
    update_by = 1,
    update_time = NOW()
WHERE client_id = 'e5cd7e4891bf95d1d19206ce24a7b32e'
  AND status = '0'
  AND del_flag = '0';
