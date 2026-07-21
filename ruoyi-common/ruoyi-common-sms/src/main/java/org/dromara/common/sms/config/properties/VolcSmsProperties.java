package org.dromara.common.sms.config.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 火山引擎短信服务配置。
 */
@Data
@ConfigurationProperties(prefix = "volc-sms")
public class VolcSmsProperties {

    /** 是否启用火山引擎短信发送。 */
    private boolean enabled;

    /** IAM AccessKey ID。 */
    private String accessKey;

    /** IAM SecretAccessKey。 */
    private String secretKey;

    /** 短信子账户 ID（SendSms 的 SmsAccount）。 */
    private String smsAccount;

    /** 已审核的短信签名文字（SendSms 的 Sign），例如：大蓝书。 */
    private String sign;

    /** 已审核的注册验证码模板 ID（SendSms 的 TemplateId）。 */
    private String registerTemplateId;

    /** 注册验证码有效期（分钟），必须与短信模板文案一致。 */
    private int codeExpireMinutes = 5;

    /** 单个手机号 24 小时内最大发送量。 */
    private int dailyMax = 30;

    /** 火山引擎短信服务区域。 */
    private String region = "cn-north-1";
}
