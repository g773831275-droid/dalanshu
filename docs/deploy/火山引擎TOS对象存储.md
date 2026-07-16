# 火山引擎 TOS 对象存储

项目通过火山引擎 TOS 的 S3 兼容接口完成上传、下载、删除和私有文件预签名访问。

## 1. 安全要求

- 使用专用 IAM 子用户，并仅授予目标 Bucket 的 `PutObject`、`GetObject`、`DeleteObject` 权限。
- AK/SK 只能通过服务器环境变量或密钥管理服务注入，不得写入 Git、YAML 或数据库明文。
- 一旦 AK/SK 出现在聊天、日志或提交记录中，立即禁用并轮换。

## 2. 必需配置

从 TOS 控制台确认 Bucket 所在 Region 和 **S3 Endpoint**。注意必须使用包含 `tos-s3-` 的 S3 Endpoint，不能填写原生 TOS SDK Endpoint。

以北京为例：

```bash
export VOLCENGINE_ACCESS_KEY_ID='新建的 AccessKey ID'
export VOLCENGINE_ACCESS_KEY_SECRET='新建的 Secret AccessKey'
export TOS_BUCKET_NAME='Bucket 名称'
export TOS_REGION='cn-beijing'
export TOS_S3_ENDPOINT='tos-s3-cn-beijing.volces.com'
export TOS_PREFIX='dalanbook'
```

同地域火山引擎服务器可按 TOS 控制台说明改用内网 S3 Endpoint，例如北京区域通常为 `tos-s3-cn-beijing.ivolces.com`。

可选配置：

```bash
export TOS_DOMAIN='绑定到 Bucket 的自定义域名'
```

私有桶通常不要设置 `TOS_DOMAIN`，由后端生成短时有效的预签名 URL。

## 3. 初始化数据库配置

执行：

```text
script/sql/update/dalanshu_volcengine_tos.sql
```

该脚本只在数据库中保存环境变量占位符，不保存真实 AK/SK。随后在管理后台的 OSS 配置管理中将 `volcengine` 设置为默认配置。

配置项应为：

| 配置项 | 值 |
| --- | --- |
| configKey | `volcengine` |
| accessKey | `${VOLCENGINE_ACCESS_KEY_ID}` |
| secretKey | `${VOLCENGINE_ACCESS_KEY_SECRET}` |
| bucketName | `${TOS_BUCKET_NAME}` |
| prefix | `dalanbook` 或 `${TOS_PREFIX}` |
| endpoint | `${TOS_S3_ENDPOINT}` |
| isHttps | `Y` |
| region | `${TOS_REGION}` |
| accessPolicy | 私有桶 `0` |

## 4. 验证接口

- 上传：`POST /resource/oss/upload`，表单字段 `file`
- 下载：`GET /resource/oss/download/{ossId}`
- 删除：`DELETE /resource/oss/{ossIds}`
- 大蓝书图片上传：`POST /api/v1/uploads`，表单字段 `file`

上传成功后检查 `sys_oss.service` 为 `volcengine`，并分别验证下载、删除和私有 URL 到期行为。
