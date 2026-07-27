package org.dromara.common.sms.config.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 阿里云号码认证服务（Dypnsapi）配置。通过 SendSmsVerifyCode / CheckSmsVerifyCode
 * 发送和校验注册验证码，由阿里云侧生成并暂存验证码。
 */
@Data
@ConfigurationProperties(prefix = "aliyun-sms")
public class AliyunSmsProperties {

    /** 是否启用阿里云号码认证服务。 */
    private boolean enabled;

    /** RAM 用户 AccessKey ID。 */
    private String accessKeyId;

    /** RAM 用户 AccessKey Secret。 */
    private String accessKeySecret;

    /** 已审核的短信签名，例如：恒创联众。 */
    private String sign;

    /** 注册验证码模板 Code（赠送模板可填 100001）。 */
    private String registerTemplateCode;

    /** 模板参数 JSON，例如：{"code":"##code##","min":"5"}。赠送模板 code 用 ##code## 占位符，阿里云发送时替换为动态验证码。 */
    private String templateParam = "{\"code\":\"##code##\",\"min\":\"5\"}";

    /** 验证码类型：1=纯数字，2=数字字母混合。 */
    private int codeType = 1;

    /** 验证码长度，建议 6 位。 */
    private int codeLength = 6;

    /** 验证码有效期（秒），与模板文案一致。 */
    private int validTime = 300;

    /** 同一手机号发送间隔（秒）。 */
    private int interval = 60;

    /** 同一手机号 24 小时内最大发送量。 */
    private int dailyMax = 30;

    /** 是否在响应中返回验证码原文，仅用于联调，生产环境必须为 false。 */
    private boolean returnVerifyCode = false;

    /** 阿里云号码认证服务区域。 */
    private String region = "cn-hangzhou";
}
