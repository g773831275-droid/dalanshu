# Flutter 开发计划

## 1. 目标与边界

为现有 `dalanbook-frontend` 用户端提供 Android 和 iOS 安装包，第一期采用 Flutter WebView 容器复用已上线的 React/TanStack Start 站点，不重写现有页面、业务接口和认证逻辑。

第一期目标：

- 使用一套 Flutter 工程构建 Android APK/AAB 与 iOS IPA。
- 加载生产 HTTPS 域名，保持网页与 `/api` 同源访问。
- 支持登录、浏览、互动、图片/视频选择与上传、短视频播放等现有业务闭环。
- 提供移动端必要的加载态、网络错误、返回键、外部链接和安全区处理。

第一期不包含：

- 将 React 页面重写为 Flutter Widget。
- 将前端构建产物直接内置为完全离线的应用。
- 替换火山引擎 VOD 的上传、转码、存储、鉴权或回调能力。
- 推送通知、原生相机拍摄、原生分享、应用内更新等增强能力；这些在基础版本稳定后分阶段接入。

## 2. 技术决策

### 2.1 采用线上站点加载

Flutter 使用 `webview_flutter` 加载正式 HTTPS 地址，例如 `https://<web-domain>/`。当前 `dalanbook-frontend` 是 TanStack Start 工程，包含服务端渲染入口，业务 API 使用 `/api` 相对路径。因此线上同源加载可以同时保留 SSR、路由直达和现有鉴权行为。

当前默认加载 `http://118.196.139.226/`，由 `ALLOW_HTTP_ENTRY=true` 开启 HTTP 入口。本地联调可通过 `WEB_ENTRY_URL=http://127.0.0.1:5174/` 覆盖，Android 同时使用 `adb reverse tcp:5174 tcp:5174` 访问宿主机。正式上架前应切换生产 HTTPS 地址并设置 `ALLOW_HTTP_ENTRY=false`。

不将 `.output/public` 直接作为 Flutter assets 内置。该目录只包含静态资源，不能替代 TanStack Start 服务端运行时；本地 `file://` 或应用内资源地址还会导致相对 API 地址、跨域策略和路由回退失效。

### 2.2 Flutter 容器职责

Flutter 仅负责原生容器能力：

1. 初始化 WebView，限制只在受信任域名内导航。
2. 显示启动页、页面加载进度、断网页和加载失败重试。
3. Android 系统返回键优先回退 WebView 历史；无历史时再退出或由 Flutter 路由处理。
4. 处理 `tel:`、`mailto:`、地图链接等非 Web 页面链接，按白名单交给系统。
5. 处理状态栏、底部安全区、横竖屏和暗色模式策略。
6. 为网页文件选择能力配置平台实现，并在必要时申请系统权限。

网页继续负责路由、登录 Token、本地存储、页面状态和业务请求。Token 不经 Flutter JavaScript Channel 导出或重复保存。

### 2.3 视频能力决策

继续使用火山引擎 VOD：

- `tt-uploader` 负责短期 STS 直传，业务服务负责上传凭证、资产状态和回调。
- `@volcengine/veplayer` 负责当前 Web 端播放，继续使用现有 HLS、播放鉴权和过期刷新机制。
- Flutter WebView 先以实际设备验证播放器兼容性，不在第一期预先切换 Video.js。

Video.js 是 Web 播放器库，不替代 VOD 上传、转码、存储和播放鉴权。只有在 VePlayer 在 Android WebView 或 iOS WKWebView 出现可复现的兼容问题时，才单独评估以 Video.js 替换网页播放层；需重新验证 HLS、签名地址刷新、自动播放、全屏、播放失败重试和埋点。若 Web 播放仍不稳定，再将播放页面迁移为 Flutter 原生播放器，并继续复用后端下发的短期播放源。

## 3. 工程结构

在仓库根目录新增独立工程，不侵入现有前端构建流程：

```text
flutter-app/
  lib/
    main.dart
    app.dart
    features/web_shell/
    services/
  android/
  ios/
  assets/
  test/
  pubspec.yaml
```

配置原则：

- 应用名称、包名、图标、启动页、网页入口地址均通过环境或构建配置区分开发、测试、生产环境。
- `WEB_ENTRY_URL` 默认指向当前部署地址，`ALLOW_HTTP_ENTRY` 默认开启；正式上架构建应使用生产 HTTPS 地址并关闭 HTTP 入口。
- Android 包名和 iOS Bundle Identifier 使用正式且唯一的组织前缀；发布前不得再随意变更。
- 仅把公开的网页入口地址、渠道标识等放入客户端配置。不得写入 API 密钥、VOD AK/SK、回调密钥、STS 或播放鉴权参数。
- 最低系统版本、签名、证书、供应商账号信息不提交到仓库，使用 CI 密钥管理或本机安全存储注入。

## 4. 实施阶段

### 阶段 0：发布前置条件

1. 确认用户端生产域名、HTTPS 证书和 API 同源反向代理均已可用。
2. 确认网页在移动 Safari 与 Android Chrome 下的响应式布局、登录、发布和视频流程可用。
3. 确认生产环境已设置 `VITE_VOD_APP_ID`、`VITE_VOD_LICENSE_URL`，且播放器 License 允许正式 Web 域名。
4. 明确 Android applicationId、iOS Bundle Identifier、应用名称、图标、隐私政策地址和支持邮箱。

验收：移动浏览器中可完成登录、图文发布、视频发布和视频播放；所有生产页面与 API 均使用 HTTPS。

### 阶段 1：最小可安装容器

1. 创建 Flutter 工程，引入 WebView、网络状态和外部链接所需依赖。
2. 实现启动页、WebView 初始化、进度提示、错误页面和手动重试。
3. 配置 Android `INTERNET` 和本地明文访问权限、iOS WebView 本地 HTTP 例外；Dart 配置在发布构建中仅允许 HTTPS 生产地址。
4. 实现 Android 返回键与 WebView 历史的协调逻辑。
5. 限制域内网页导航；非受信任跳转拒绝，受支持外链交给系统浏览器。
6. 在 Android Debug 和 iOS Simulator 完成基础安装、加载和导航验证。

验收：Android 与 iOS 均可安装、打开首页、前进后退、断网提示和恢复加载；任意外部不可信 URL 不会在应用内自动打开。

### 阶段 2：业务兼容与媒体联调

1. 验证 `localStorage` 中登录 Token 的保存、刷新、退出登录和清除应用数据后的回归登录。
2. 验证图片、头像、视频 `<input type="file">` 文件选择，覆盖相册、文件管理器、取消选择和异常格式。
3. 真机验证图片上传、最大 200 MiB 视频上传、上传进度、后台切换、网络中断和失败重试。
4. 验证 HLS 视频首帧、静音自动播放、用户手势播放、进度拖动、横屏全屏、播放失败与播放地址过期刷新。
5. 验证安全区下的网页底部导航、发布页浮层、软键盘与表单输入，必要时在网页端做小范围 CSS 适配。
6. 验证复制链接等浏览器能力；无法直接工作时，通过受限 JavaScript Channel 提供原生剪贴板能力。

验收：在至少一台主流 Android 真机和一台真实 iPhone 上，用户可完成登录、浏览、互动、图文发布、视频发布和视频播放闭环。

### 阶段 3：发布质量与合规

1. 配置 Android release 签名，构建 AAB 用于 Google Play 或其他商店，按分发需求构建 APK。
2. 在 macOS 上配置 Apple Developer 证书、描述文件、签名和 TestFlight 分发，构建 IPA。
3. 编写隐私说明，覆盖网络访问、相册/文件选择、媒体上传和可能的设备信息采集。
4. 增加崩溃与 WebView 加载失败的监控，不采集密码、Token、STS 或播放鉴权参数。
5. 检查 iOS 审核要求。仅加载网页的应用可能被判定功能不足，应至少提供与业务匹配的原生价值，例如推送通知、原生分享或相机/相册优化。

验收：release 包可由真实设备安装；Android 签名和 iOS TestFlight 分发可用；隐私声明、截图、应用图标和商店元数据齐备。

### 阶段 4：后续增强（按优先级评估）

1. 原生推送通知，并通过网页或 Universal Link/Android App Link 跳转到对应帖子、消息或用户页。
2. 原生分享、相机拍摄、相册多选和下载保存能力。
3. Flutter 原生视频播放页，复用后端提供的短期 HLS 播放源。
4. 应用版本检查、灰度开关和强制升级策略。
5. 逐步将高频且需要原生体验的页面迁移为 Flutter 页面，其余页面继续保留 WebView。

## 5. 测试矩阵

| 场景 | Android WebView | iOS WKWebView | 通过条件 |
|---|---|---|---|
| 首次启动与断网恢复 | 真机 | 真机 | 有加载态、失败态和重试，恢复网络后可继续访问 |
| 登录与会话刷新 | 真机 | 真机 | Token 可刷新，退出和清数据后不残留会话 |
| 路由与系统返回 | 真机 | 真机 | 不错误退出、不形成循环历史 |
| 图片/头像选择上传 | 真机 | 真机 | 相册或文件选择可用，预览和上传成功 |
| 视频选择与上传 | 真机 | 真机 | 200 MiB 以内文件可选择、上传、失败可感知 |
| HLS 视频播放 | 真机 | 真机 | 首帧、暂停、进度、全屏和过期刷新可用 |
| 软键盘与安全区 | 真机 | 真机 | 输入框不被遮挡，底部操作可点击 |
| 外部链接 | 真机 | 真机 | 受信任链接按策略打开，未知链接不自动放行 |

## 6. 风险与处理

| 风险 | 影响 | 处理方式 |
|---|---|---|
| 服务端页面未部署或 API 非同源 | 页面、路由或登录失败 | Flutter 只加载稳定 HTTPS 生产域名，部署层提供同源 `/api` |
| WebView 文件选择差异 | 无法上传图片或视频 | Android/iOS 分别真机验证，必要时补充原生文件选择桥接 |
| 火山 Web 播放器兼容问题 | 视频无法播放或全屏异常 | 保留 VOD，先修正 WebView 配置；再评估 Video.js；最后考虑原生播放器 |
| 应用进入后台时上传中断 | 用户发布失败 | 第一阶段明确提示并允许重试；需要可靠后台上传时再接入原生上传任务 |
| iOS 审核认为应用仅为网页封装 | 无法上架 | 增加符合业务价值的原生能力，并准备隐私说明和审核演示账号 |
| 客户端泄露敏感配置 | 账号或媒体安全风险 | 禁止在 Flutter/Dart、网页构建变量和日志中存放密钥、STS、Token 或播放凭证 |

## 7. 构建与交付

开发期：

```bash
cd flutter-app
flutter pub get
flutter run
```

发布构建：

```bash
cd flutter-app
flutter build appbundle --release \
  --dart-define=WEB_ENTRY_URL=https://<web-domain>/ \
  --dart-define=ALLOW_HTTP_ENTRY=false
flutter build apk --release \
  --dart-define=WEB_ENTRY_URL=https://<web-domain>/ \
  --dart-define=ALLOW_HTTP_ENTRY=false
flutter build ipa --release \
  --dart-define=WEB_ENTRY_URL=https://<web-domain>/ \
  --dart-define=ALLOW_HTTP_ENTRY=false
```

`flutter build ipa` 必须在 macOS 且已配置 Apple 签名的环境执行。交付物包括 Android AAB/APK、iOS IPA/TestFlight 构建、对应版本号、变更说明、测试记录和已知限制。

## 8. 上线与回滚

1. 先对内部测试用户分发 Android APK 和 TestFlight 构建，覆盖登录、发布、上传和播放场景。
2. 观察 WebView 加载失败率、登录失败率、上传失败率、视频播放首帧和崩溃率。
3. 生产入口地址通过构建配置或远程开关可控；网页发生严重故障时可切换至维护页或停止新版本分发。
4. 客户端问题优先回滚至已验证的应用版本；网页业务问题由既有 Web 发布流程回滚，不通过紧急修改 Flutter 包修复。
