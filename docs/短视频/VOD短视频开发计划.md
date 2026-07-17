# VOD 短视频开发计划

## 目标与边界

- 支持用户发布一条最长 3 分钟、最大 200 MiB 的竖版短视频；单帖视频和图片互斥。
- 视频文件浏览器直传火山引擎 VOD，不经过应用服务，不保存到 `sys_oss`。
- 使用火山引擎 VePlayer Web Player SDK 播放。短视频页面关闭 SDK 默认控制栏，只保留播放、暂停、静音、进度、全屏和失败重试。
- 业务服务负责用户权限、视频资产状态、VOD 回调以及短期播放地址；部署账户的长期 AK/SK 和回调密钥永不发送到浏览器。直传仅使用短期 STS。

## 实施阶段

### 1. 数据与接口

1. 创建 `dalan_video_asset`，保存作者、VOD VID、处理状态、封面、时长、分辨率、失败原因和回调幂等信息。
2. 为帖子增加 `video_asset_id`，在服务层校验图片和视频互斥、资产归属和未重复关联。
3. 提供上传凭证、资产状态、受权限保护的播放源和 VOD 回调接口。
4. 将视频摘要加入帖子详情和信息流，视频处理完成前不公开展示。

验收：迁移 SQL 可重复执行；无视频帖子行为不变；未经授权的用户不能读取私有视频资产或圈子视频播放源。

### 2. 前端发布与播放

1. 发布页校验媒体类型、文件大小和时长，视频上传时禁用图片选择，反之亦然。
2. 使用火山官方 `tt-uploader` 和服务端下发的短期 STS Token 将文件直传 VOD；上传完成后回报业务服务绑定资产，并轮询转码状态。
3. 信息流展示封面、视频标识和时长；详情页等待 `ready` 后再创建播放器。
4. 使用 `@volcengine/veplayer` 的 Vid 模式，通过 `vid + playAuthToken` 和 `root` 挂载到 React 容器；保留 DirectUrl 作为 Mock 和兼容回退，卸载时销毁实例。
5. 初始化前配置生产 License URL；本地 `localhost` 调试依赖 SDK 的本地许可规则，不提交 License 内容。
6. 播放失败或 PlayAuth Token 失效时，重新请求播放源并重建播放器。

验收：前端构建通过；Mock 模式可走完整发布、处理中、成功和失败页面状态；默认播放器控制栏不出现。

### 3. VOD 网关与安全

1. 通过官方 VOD Java SDK 封装上传 STS Token、PlayAuth Token 和回调验签，隔离在 `VolcengineVodGateway`。
2. 未配置或配置不完整时 fail closed，返回 `VOD_NOT_CONFIGURED`，不生成伪造地址。
3. 通过环境变量或外部 `vod.properties` 注入 AK/SK、Space、地域、播放域名、工作流、截图模板和回调密钥。
4. 回调验证签名和 SpaceName，并按事件 ID 幂等处理上传、转码成功、转码失败和删除事件。
5. 点播域名启用 HTTPS 与 URL 鉴权，范围同时覆盖 HLS 清单和分片。

验收：缺少任何关键配置时请求被拒绝；回调重复投递不改变最终状态；日志和错误响应不含任何密钥、播放签名或完整回调密文。

### 4. 火山控制台与联调

1. 创建 VOD Space、HTTPS 点播域名和最小权限 IAM 凭据。
2. 创建 H.264/AAC 多码率 HLS 工作流与封面截图模板，配置回调地址。
3. 在播放器 SDK 应用管理中创建应用、申请测试 License，并绑定线上前端域名及其子域名。
4. 将控制台参数写入部署密钥管理服务，先以测试空间开启 `VOD_ENABLED=true`。
5. 依次验证上传、转码、封面、公开视频、圈内视频、URL 过期刷新、回调失败重试和播放质量上报。

验收：手机与桌面浏览器都能首帧播放 HLS；质量平台可见播放量、首帧和失败率；非成员和未登录用户无法播放受限视频。

## 配置清单

后端：`VOD_ENABLED`、`VOD_ACCESS_KEY_ID`、`VOD_ACCESS_KEY_SECRET`、`VOD_REGION`、`VOD_SPACE_NAME`、`VOD_APPLICATION_ID`、`VOD_CALLBACK_URL`、`VOD_CALLBACK_PRIVATE_KEY`、`VOD_WORKFLOW_TEMPLATE_ID`、`VOD_UPLOAD_TOKEN_TTL_SECONDS`、`VOD_PLAY_AUTH_TTL_SECONDS`。

前端：`VITE_VOD_APP_ID`、`VITE_VOD_LICENSE_URL`，只放应用 ID 和 License 在线地址，不放长期 AK/SK、回调密钥、短期 STS 或播放鉴权参数；短期 STS 仅由上传接口按需返回并保留在内存。

## 上线与回滚

灰度期间只允许白名单作者上传，监控上传失败率、转码时长、播放首帧和回调失败。发生 VOD 故障时将 `VOD_ENABLED` 设为 `false` 停止新上传，既有图片帖子不受影响；视频帖子显示可重试的不可用状态，不回退为图片或暴露原始文件地址。
