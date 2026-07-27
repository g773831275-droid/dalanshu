package org.dromara.common.sms.config.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 短信服务总开关与厂商选择。
 */
@Data
@ConfigurationProperties(prefix = "dalanshu.sms")
public class SmsProperties {

    /**
     * 短信厂商：aliyun 或 volc。
     */
    private String provider = "aliyun";
}
