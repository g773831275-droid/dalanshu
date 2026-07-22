# 大蓝书 Flutter App

基于 `docs/移动端/prototype.html` 实现的原生 Flutter 可点击原型。当前版本使用本地 Mock 数据和本地图片资产，不接入真实 API、短信、OSS、VOD 或 Firebase。

## 工程信息

- Dart package：`dalanbook_app`
- Android applicationId：`com.dalanshu.app`
- iOS Bundle Identifier：`com.dalanshu.app`
- 平台：Android、iOS
- Android 最低版本：7.0（API 24）
- 当前版本：`1.0.1 (2)`

代码按功能组织：

```text
lib/
  app/                    应用入口、主导航和登录守卫
  core/
    design_system/        颜色、字排和通用组件
    mock/                 Mock 模型、数据和交互状态
  features/
    auth/                 欢迎与手机号登录
    discover/             发现与搜索
    islands/              岛屿列表与详情
    post/                 帖子详情与互动
    publish/              图文/视频选择与发布原型
    notifications/        通知
    profile/              我的与设置
```

## 运行与验证

在 `flutter-app` 目录执行：

```bash
flutter pub get
flutter run
```

静态检查、测试和 Android debug 包构建：

```bash
flutter analyze
flutter test
flutter build apk --debug
```

游客可浏览发现、搜索、岛屿和帖子详情。发布、通知、我的以及加入、点赞、收藏、关注和评论会触发登录，登录完成后恢复目标页面或动作。

发布页已支持从系统相册选择最多 9 张图片、选择视频、预览和移除。当前发布提交仍使用 Mock 反馈，不会把媒体上传到服务端。
