-- 用户认证首期：国际手机号 + 有效账号邮箱/手机号唯一约束
-- 生成列在逻辑删除后变为 NULL，因此原邮箱和手机号可以重新注册。

ALTER TABLE sys_user
    MODIFY COLUMN phonenumber varchar(32) DEFAULT '' COMMENT '国际手机号（E.164）',
    ADD COLUMN active_email varchar(50)
        GENERATED ALWAYS AS (
            CASE WHEN del_flag = '0' AND email <> '' THEN lower(email) ELSE NULL END
        ) STORED,
    ADD COLUMN active_phonenumber varchar(32)
        GENERATED ALWAYS AS (
            CASE WHEN del_flag = '0' AND phonenumber <> '' THEN phonenumber ELSE NULL END
        ) STORED,
    ADD UNIQUE KEY uk_sys_user_tenant_active_email (tenant_id, active_email),
    ADD UNIQUE KEY uk_sys_user_tenant_active_phone (tenant_id, active_phonenumber);

UPDATE sys_config
SET config_value = 'true'
WHERE tenant_id = '000000'
  AND config_key = 'sys.account.registerUser';
