# 短信服务总览

大蓝书注册 / 登录验证码通过统一的 `SmsSender` 抽象发送，可在阿里云号码认证服务（dypnsapi）与火山引擎短信之间通过配置切换。

## 厂商选择

通过环境变量 `DALANSHU_SMS_PROVIDER` 控制：

| 取值   | 实现              | 验证码生成与校验              | 适用场景                                 |
| ------ | ----------------- | ------------------------------ | ---------------------------------------- |
| aliyun | `AliyunSmsSender` | 阿里云侧生成、阿里云侧校验     | 默认。调用 `SendSmsVerifyCode` / `CheckSmsVerifyCode` |
| volc   | `VolcSmsSender`   | 本地生成、Redis 缓存、本地校验 | 火山引擎 `SendSms` 通道                  |

不设置时默认 `aliyun`。切换厂商只需修改 `DALANSHU_SMS_PROVIDER` 并重启服务，无需重新打包。

## 抽象层

- 接口：`org.dromara.common.sms.service.SmsSender`
  - `sendRegisterCode(phoneNumber)`：发送注册验证码
  - `checkRegisterCode(phoneNumber, verifyCode)`：校验注册验证码
  - `codeExpiration()`：验证码有效期
- 装配：`SmsAutoConfiguration` 按 `dalanshu.sms.provider` 选择具体实现并注入 `SmsSender` Bean
- 调用方：`CaptchaController`（发送）、`SysRegisterService` / `SmsAuthStrategy`（校验）均注入 `SmsSender` 接口，与具体厂商解耦

## 接口

`GET /api/v1/auth/sms/code?phonenumber=13800138000` 发送 6 位注册验证码，按手机号限制为每分钟一次。

注册流程：用户填入手机号 → 调用本接口 → 用户填入收到的验证码 → 调用注册接口 → 服务端通过 `SmsSender.checkRegisterCode` 校验 → 校验通过后建号并自动登录。

## 配置

切换厂商时只需关注以下两组变量：

```bash
# 总开关
DALANSHU_SMS_PROVIDER=aliyun   # 或 volc

# 选中厂商对应的配置（参见各厂商接入文档）
# - aliyun：参见 阿里云短信接入.md
# - volc：参见 火山引擎短信接入.md
```

未选中厂商的配置可保留占位，不会被读取。

## 文档

- [阿里云短信接入.md](./阿里云短信接入.md)：dypnsapi 通道（默认）
- [火山引擎短信接入.md](./火山引擎短信接入.md)：火山引擎 SendSms 通道
