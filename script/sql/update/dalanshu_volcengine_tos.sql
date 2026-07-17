-- 火山引擎 TOS（S3 兼容协议）配置。
-- 执行前，请先配置服务器环境变量。脚本执行后会将 volcengine 设为默认对象存储。
-- AK/SK 仅保存环境变量占位符，不写入数据库。

insert into sys_oss_config (
    oss_config_id, tenant_id, config_key, access_key, secret_key, bucket_name,
    prefix, endpoint, domain, is_https, region, access_policy, status, ext1,
    create_dept, create_by, create_time, update_by, update_time, remark
)
select
    1988888888888888001, '000000', 'volcengine',
    '${VOLCENGINE_ACCESS_KEY_ID}', '${VOLCENGINE_ACCESS_KEY_SECRET}', 'file-system',
    'dalanbook', 'tos-s3-cn-shanghai.volces.com', '', 'Y', 'cn-shanghai', '0', '1', '',
    103, 1, sysdate(), 1, sysdate(), '火山引擎 TOS，密钥由环境变量注入'
where not exists (
    select 1 from sys_oss_config where config_key = 'volcengine'
);

update sys_oss_config
set access_key = '${VOLCENGINE_ACCESS_KEY_ID}',
    secret_key = '${VOLCENGINE_ACCESS_KEY_SECRET}',
    bucket_name = 'file-system',
    prefix = 'dalanbook',
    endpoint = 'tos-s3-cn-shanghai.volces.com',
    domain = '',
    is_https = 'Y',
    region = 'cn-shanghai',
    access_policy = '0',
    update_by = 1,
    update_time = sysdate(),
    remark = '火山引擎 TOS，密钥由环境变量注入'
where tenant_id = '000000'
  and config_key = 'volcengine';

update sys_oss_config
set status = '1', update_by = 1, update_time = sysdate()
where tenant_id = '000000';

update sys_oss_config
set status = '0', update_by = 1, update_time = sysdate()
where tenant_id = '000000'
  and config_key = 'volcengine';
