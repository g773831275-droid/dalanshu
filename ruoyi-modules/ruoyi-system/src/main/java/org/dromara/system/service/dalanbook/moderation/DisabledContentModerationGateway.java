package org.dromara.system.service.dalanbook.moderation;

import org.dromara.system.config.dalanbook.ContentModerationProperties;
import org.dromara.system.controller.dalanbook.v1.DalanApiException;
import org.springframework.http.HttpStatus;

/**
 * Keeps local development usable, while preventing an enabled but incomplete deployment from bypassing review.
 */
public class DisabledContentModerationGateway implements ContentModerationGateway {
    private final ContentModerationProperties properties;

    public DisabledContentModerationGateway(ContentModerationProperties properties) {
        this.properties = properties;
    }

    @Override
    public void checkText(String content, String dataId) {
        ensureAvailable();
    }

    @Override
    public void checkImage(String imageUrl, String dataId) {
        ensureAvailable();
    }

    private void ensureAvailable() {
        if (properties.isEnabled()) {
            throw new DalanApiException(HttpStatus.SERVICE_UNAVAILABLE, "CONTENT_MODERATION_NOT_CONFIGURED",
                "内容安全服务未完成配置，请联系管理员");
        }
    }
}
