# 火山引擎 VOD 视频点播

大蓝书短视频使用火山引擎 VOD 负责直传、转码、封面和 HLS 分发。业务服务只签发短期上传凭证、接收 VOD 回调并在鉴权后下发短期播放地址；视频二进制不会经过应用服务器，也不保存到 `sys_oss`。

## 1. 安全要求

- 为 VOD 单独创建 IAM 子用户或角色，授予目标空间所需的最小 VOD OpenAPI 权限；不能复用仅有 TOS Bucket 权限的凭据。
- AK/SK、回调密钥和工作流标识只能通过环境变量或部署平台密钥管理服务注入，禁止写入 Git、YAML、SQL、浏览器变量或日志。
- 浏览器上传时会短暂取得 VOD STS，其中包含临时 AK/SK 和会话令牌；仅允许在 `tt-uploader` 当前内存任务中使用，禁用 localStorage 缓存且不得记录到日志。它们不是部署使用的长期 AK/SK。
- 点播域名必须启用 HTTPS 和 URL 鉴权，鉴权范围必须同时覆盖 HLS 清单和全部分片。
- 前端使用火山引擎 `@volcengine/veplayer`。当前普通 HLS 可使用 DirectUrl；后续启用私有播放时可直接下发 `vid + playAuth`，不需要替换播放器。
- VePlayer 生产 License URL 和点播 SDK 应用 ID 是公开前端配置，分别以 `VITE_VOD_LICENSE_URL`、`VITE_VOD_APP_ID` 注入。License URL 必须绑定正式域名；`localhost` 开发无需配置。它们不是 AK/SK、播放凭证或 VOD 回调密钥。

## 2. VOD 控制台准备

1. 创建或提供 VOD Space，并记录 `SpaceName` 和所在地域。
2. 配置 HTTPS 点播加速域名、证书和 URL 鉴权。
3. 创建 H.264/AAC HLS 转码工作流，输出最高 1080p 的多码率流；记录工作流 ID。
4. 创建封面截图模板；记录模板 ID。
5. 在点播 SDK 应用管理中创建 Web 应用，记录前端播放器应用 ID，并为生产域名生成 License URL。
6. 配置 HTTP 回调到 `https://<api-domain>/internal/v1/vod/events`，订阅上传元数据完成、工作流成功、工作流失败和媒体删除事件，并记录验签密钥。

## 3. 本地配置

```bash
mkdir -p ~/.config/dalanshu
cp script/env/vod.properties.example ~/.config/dalanshu/vod.properties
chmod 600 ~/.config/dalanshu/vod.properties
```

填写 VOD 凭据和控制台生成的空间、播放域名、工作流和截图模板标识。`VOD_ENABLED` 在完成测试空间验证前保持 `false`。

`dev` Profile 会读取该文件；生产环境使用同名环境变量或密钥管理服务。

前端部署环境额外设置：

```bash
VITE_VOD_LICENSE_URL=https://<vod-license-url>
VITE_VOD_APP_ID=<vod-web-sdk-app-id>
```

构建期会将这两个公开配置嵌入前端产物。不要在任何 `VITE_*` 变量中放入 AK/SK、短期 STS、回调密钥或播放凭证。

## 4. 联调顺序

1. 调用视频上传凭证接口，以短期 STS 配置 `tt-uploader` 直传一条测试视频；确认浏览器不持久化 STS。
2. 调用完成接口，验证回调签名、`SpaceName`、幂等处理和视频元数据。
3. 确认转码工作流产出 HLS、封面、DirectUrl 与 Vid/PlayAuth 播放信息。
4. 使用公开视频和圈内可见视频分别验证 VePlayer 的 Vid 模式、DirectUrl 回退、播放源过期刷新和非成员拒绝访问。
