# SMTP 邮件工具类使用说明

项目邮件发送统一使用 `ruoyi-common-mail` 模块提供的 `MailUtils`。当前开发与生产环境均接入阿里云 DirectMail，业务代码不应自行创建 SMTP 客户端，也不得在代码、YAML、日志或异常响应中保存和输出 SMTP 密码。

## 1. 当前邮件服务配置

| 配置项 | 当前值或来源 | 说明 |
| --- | --- | --- |
| SMTP 服务 | `smtpdm.aliyun.com` | 阿里云 DirectMail SMTP 地址 |
| 端口 | `465` | 隐式 SSL |
| 发件地址 | `cilantro@mail.idalanshu.com` | 必须是 DirectMail 中已启用的发信地址 |
| SMTP 用户名 | `cilantro@mail.idalanshu.com` | 当前与发件地址一致 |
| SMTP 密码 | `DALANSHU_MAIL_PASSWORD` | 开发环境从仓库外的 `mail.properties` 加载，生产环境由环境变量或密钥管理服务注入 |
| STARTTLS | `false` | 465 端口不同时启用 STARTTLS |
| SSL | `true` | 启用加密连接 |

项目配置位于：

- 开发环境：`ruoyi-admin/src/main/resources/application-dev.yml`
- 生产环境：`ruoyi-admin/src/main/resources/application-prod.yml`

对应配置结构如下。真实密码不得填写到配置文件：

```yaml
mail:
  enabled: true
  host: ${DALANSHU_MAIL_HOST:smtpdm.aliyun.com}
  port: 465
  auth: true
  from: ${DALANSHU_MAIL_FROM:cilantro@mail.idalanshu.com}
  user: ${DALANSHU_MAIL_USERNAME:cilantro@mail.idalanshu.com}
  pass: ${DALANSHU_MAIL_PASSWORD:}
  starttlsEnable: false
  sslEnable: true
  timeout: 10000
  connectionTimeout: 10000
```

`mail.enabled=true` 时，`MailConfig` 才会创建全局 `MailAccount`。业务调用邮件工具前还必须保证 `DALANSHU_MAIL_PASSWORD` 已加载，否则发送会失败。

本机 `dev` Profile 自动读取 `${user.home}/.config/dalanshu/mail.properties`：

```properties
DALANSHU_MAIL_PASSWORD=<阿里云DirectMail-SMTP密码>
```

该文件位于 Git 仓库外，权限应设置为 `600`；修改后必须完整重启 Java 进程。从 IntelliJ IDEA 启动时无需再在 Run Configuration 中重复配置该变量。

本机开发环境变量的配置方法见[开发联调环境](../deploy/开发联调环境.md)。

## 2. 模块依赖和调用入口

使用邮件能力的 Maven 模块需要依赖：

```xml
<dependency>
    <groupId>org.dromara</groupId>
    <artifactId>ruoyi-common-mail</artifactId>
</dependency>
```

`ruoyi-admin` 已包含该依赖。业务代码统一导入：

```java
import org.dromara.common.mail.utils.MailUtils;
```

`MailUtils` 是静态工具类，不需要注入 Spring Bean。常用方法会返回 SMTP 服务生成的 `message-id`；业务通常不需要把该值返回给客户端，可以用于内部投递日志或问题排查。

## 3. 发送文本邮件

```java
String messageId = MailUtils.sendText(
    "user@example.com",
    "操作结果通知",
    "您的操作已经处理完成。"
);
```

一个字符串中包含多个收件人时，可用英文逗号或分号分隔：

```java
MailUtils.sendText(
    "user1@example.com,user2@example.com",
    "系统通知",
    "这是一封批量通知邮件。"
);
```

收件人来自业务数据时，推荐先完成去重、非空和格式校验，再使用集合重载：

```java
List<String> recipients = List.of("user1@example.com", "user2@example.com");
MailUtils.sendText(recipients, "系统通知", "这是一封批量通知邮件。");
```

大量群发、营销订阅和运营活动邮件不应在一次 Web 请求中直接遍历发送，应使用合规的批量发信能力、消息队列或后台任务，并处理退订、频控和无效地址。

## 4. 发送 HTML 邮件

```java
String html = """
    <h2>欢迎加入大蓝书</h2>
    <p>您的账号已经创建成功。</p>
    """;

MailUtils.sendHtml("user@example.com", "注册成功", html);
```

HTML 内容如果包含用户输入，必须先进行 HTML 转义或使用安全模板渲染，禁止直接拼接昵称、评论、富文本等不可信内容，避免邮件内容注入和钓鱼链接风险。

## 5. 抄送、密送和通用发送

同时指定收件人、抄送和密送时使用 `send`：

```java
MailUtils.send(
    "owner@example.com",          // to
    "reviewer@example.com",       // cc，可为 null
    "audit@example.com",          // bcc，可为 null
    "工单处理通知",
    "工单已经处理完成。",
    false                          // false 为文本，true 为 HTML
);
```

集合形式适合由业务层完成地址整理后调用：

```java
MailUtils.send(
    List.of("owner@example.com"),
    List.of("reviewer@example.com"),
    List.of("audit@example.com"),
    "工单处理通知",
    "<p>工单已经处理完成。</p>",
    true
);
```

密送地址不会出现在普通收件人的邮件头中，但仍属于个人信息，禁止写入公开日志。

## 6. 发送附件

`sendText`、`sendHtml` 和 `send` 的最后一个可变参数均可接收附件：

```java
File report = buildTemporaryReport();

try {
    MailUtils.sendText(
        "user@example.com",
        "月度报告",
        "报告见附件。",
        report
    );
} finally {
    Files.deleteIfExists(report.toPath());
}
```

附件使用要求：

- 只能发送业务代码生成或经过权限校验的文件。
- 禁止让客户端直接传入服务器文件路径，否则存在任意文件读取风险。
- 发送前校验文件大小、类型、后缀和内容安全；同时遵守 DirectMail 的附件限制。
- 临时文件应在发送完成或失败后清理。
- 大附件优先上传至私有对象存储，邮件中提供短期受控下载入口，不要长时间占用应用内存和 SMTP 连接。

## 7. HTML 内嵌图片

HTML 中使用 `cid` 引用图片，Map 的 Key 与 `cid` 保持一致：

```java
try (InputStream logo = Files.newInputStream(Path.of("/safe/path/logo.png"))) {
    String html = "<h2>大蓝书</h2><img src=\"cid:logo\" alt=\"大蓝书\">";
    MailUtils.sendHtml(
        "user@example.com",
        "欢迎邮件",
        html,
        Map.of("logo", logo)
    );
}
```

当前工具类会在添加内嵌图片后关闭传入的流，调用方不要在发送后继续复用该流。仍建议调用方使用 `try-with-resources` 明确资源生命周期。

## 8. 找回密码邮箱验证码

兼容账户的找回密码邮箱验证码发送入口位于 `CaptchaController#emailCodeImpl`，核心调用如下：

```java
MailUtils.sendText(
    email,
    scene + "验证码",
    "您本次" + scene + "验证码为：" + code
        + "，有效期为" + Constants.CAPTCHA_EXPIRATION + "分钟，请尽快填写。"
);
```

验证码场景必须遵守以下规则：

- 发送前校验图形验证码，并按邮箱和 IP 限流。
- 注册与找回密码使用不同的 Redis Key，验证码只能消费一次。
- 接口响应、前端状态、日志和异常中不得返回验证码。
- SMTP 未配置或发送失败时返回统一业务提示，详细异常只记录在服务端。
- 日志不得记录完整邮箱验证码、SMTP 密码或认证会话信息。

新业务如果需要邮件验证码，应复用统一验证码服务或提取领域服务，不要在不同 Controller 中复制“生成、缓存、发送、校验”逻辑。

## 9. 异常处理、事务和异步发送

`MailUtils` 发送失败时会抛出运行时异常。面向用户的业务接口应记录服务端异常，并转换为稳定、无敏感信息的业务提示：

```java
try {
    MailUtils.sendText(to, subject, content);
} catch (Exception exception) {
    log.error("邮件发送失败，业务类型: {}", businessType, exception);
    throw new ServiceException("邮件发送失败，请稍后重试");
}
```

注意：日志可以记录业务类型和内部业务 ID，但不要输出邮件正文、验证码、SMTP 密码或大批量收件人列表。

重要业务不要把“数据库提交成功”依赖于 SMTP 瞬时可用性。推荐流程是：

1. 在数据库事务内保存业务数据和待发送事件。
2. 事务提交后由消息队列或后台任务发送邮件。
3. 保存发送状态、重试次数和最后失败原因。
4. 使用业务事件 ID 保证幂等，避免重试时重复发送。

验证码等需要即时反馈的场景可以同步发送，但必须设置连接与读取超时，并进行限流；不要无限重试。

## 10. 不要在业务代码中切换全局账号

`MailUtils.getMailAccount(String from, String user, String pass)` 会修改工具类持有的全局 `MailAccount`。在并发 Web 请求中调用可能让不同请求互相覆盖发件人或凭据，因此业务代码不要使用它动态切换账号。

本项目统一从 Spring 配置读取阿里云发件账号。确实需要独立账号时，应构造独立 `MailAccount` 并调用带 `MailAccount` 参数的 `send` 重载，同时确保凭据来自安全配置中心，而不是接口参数：

```java
MailAccount account = buildAccountFromSecureConfiguration();
MailUtils.send(account, recipients, subject, content, false);
```

新增多发件账号前，应先评估账号隔离、发信域名、SPF、DKIM、DMARC、配额、退信处理和密钥轮换方案。

## 11. 本地验证和故障排查

本机启动前确认外部开发配置已经创建且非空：

```bash
test -s ~/.config/dalanshu/mail.properties && echo "SMTP 配置文件已创建"
```

不要使用 `cat ~/.config/dalanshu/mail.properties` 或输出 `DALANSHU_MAIL_PASSWORD`，以免密码进入终端历史、录屏或日志。

常见问题：

| 现象 | 排查方向 |
| --- | --- |
| `邮件服务未配置` | `mail.properties` 不存在、内容为空，或 Java 进程尚未重启加载新配置 |
| 认证失败 | SMTP 用户名或 SMTP 密码错误；不要混用阿里云登录密码、AccessKey 和 SMTP 密码 |
| 连接超时 | 检查到 `smtpdm.aliyun.com:465` 的网络、DNS、防火墙和代理 |
| 发件地址被拒绝 | DirectMail 发信地址未启用，或 `mail.from`、`mail.user` 不匹配 |
| 邮件进入垃圾箱 | 检查 SPF、DKIM、DMARC、正文质量、发送频率和收件人质量 |
| 程序显示成功但未收到 | 在 DirectMail 控制台查询发送记录、退信和无效地址，同时检查收件方垃圾箱 |

开发联调只向本人或明确授权的测试邮箱发送。禁止在自动化测试中调用真实 SMTP；单元测试应 Mock 邮件发送边界，集成测试应使用隔离账号或本地邮件接收器。

## 12. 现有参考实现

- 工具类：`org.dromara.common.mail.utils.MailUtils`
- 自动配置：`org.dromara.common.mail.config.MailConfig`
- 配置属性：`org.dromara.common.mail.config.properties.MailProperties`
- 找回密码验证码：`org.dromara.web.controller.CaptchaController#emailCodeImpl`
- 基础示例：`org.dromara.demo.controller.MailSendController`
