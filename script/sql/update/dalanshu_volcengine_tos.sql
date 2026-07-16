-- 火山引擎 TOS（S3 兼容协议）配置。
-- 执行后，请先配置服务器环境变量，再在“系统管理 -> 文件管理 -> 配置管理”中启用 volcengine。
-- AK/SK 仅保存环境变量占位符，不写入数据库。

insert into sys_oss_config (
    oss_config_id, tenant_id, config_key, access_key, secret_key, bucket_name,
    prefix, endpoint, domain, is_https, region, access_policy, status, ext1,
    create_dept, create_by, create_time, update_by, update_time, remark
)
select
    1988888888888888001, '000000', 'volcengine',
    '${VOLCENGINE_ACCESS_KEY_ID}', '${VOLCENGINE_ACCESS_KEY_SECRET}', '${TOS_BUCKET_NAME}',
    'dalanbook', '${TOS_S3_ENDPOINT}', '', 'Y', '${TOS_REGION}', '0', '1', '',
    103, 1, sysdate(), 1, sysdate(), '火山引擎 TOS，密钥由环境变量注入'
where not exists (
    select 1 from sys_oss_config where config_key = 'volcengine'
);
