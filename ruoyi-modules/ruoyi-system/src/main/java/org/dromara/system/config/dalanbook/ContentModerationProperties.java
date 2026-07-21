package org.dromara.system.config.dalanbook;

import lombok.Data;

/**
 * 阿里云内容安全部署配置。AccessKey 只允许由环境变量或外部 properties 文件提供。
 */
@Data
public class ContentModerationProperties {
    private boolean enabled;
    private String accessKeyId;
    private String accessKeySecret;
    private String region = "cn-shanghai";
    private String endpoint = "green-cip.cn-shanghai.aliyuncs.com";
    private String textService = "comment_detection";
    private String imageService = "postImageCheck";

    public boolean isSdkConfigured() {
        return enabled && hasText(accessKeyId) && hasText(accessKeySecret) && hasText(region) && hasText(endpoint);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
