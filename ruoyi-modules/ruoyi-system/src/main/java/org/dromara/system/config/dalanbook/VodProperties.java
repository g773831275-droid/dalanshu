package org.dromara.system.config.dalanbook;

import lombok.Data;

/**
 * 火山引擎 VOD 的部署时配置。密钥仅由环境变量或外部 properties 文件提供。
 */
@Data
public class VodProperties {
    private boolean enabled;
    private String accessKeyId;
    private String accessKeySecret;
    private String region;
    private String spaceName;
    private Long applicationId;
    private String playDomain;
    private String callbackUrl;
    private String callbackPrivateKey;
    private String previousCallbackPrivateKey;
    private String workflowTemplateId;
    private String snapshotTemplateId;
    private int uploadTokenTtlSeconds = 900;
    private int playAuthTtlSeconds = 900;
    private int callbackMaxAgeSeconds = 480;

    public boolean isSdkConfigured() {
        return enabled && hasText(accessKeyId) && hasText(accessKeySecret) && hasText(region) && hasText(spaceName)
            && applicationId != null && applicationId > 0 && hasText(callbackUrl) && hasText(callbackPrivateKey)
            && hasText(workflowTemplateId);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
