package org.dromara.system.config.dalanbook;

import org.dromara.system.service.dalanbook.moderation.AliyunContentModerationGateway;
import org.dromara.system.service.dalanbook.moderation.ContentModerationGateway;
import org.dromara.system.service.dalanbook.moderation.DisabledContentModerationGateway;
import org.springframework.boot.context.properties.bind.Bindable;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

@Configuration
public class ContentModerationConfiguration {

    @Bean
    public ContentModerationProperties contentModerationProperties(Environment environment) {
        ContentModerationProperties properties = new ContentModerationProperties();
        Binder.get(environment).bind("dalanbook.content-moderation", Bindable.ofInstance(properties));
        properties.setEnabled(booleanValue(environment, "DALANSHU_CONTENT_MODERATION_ENABLED", properties.isEnabled()));
        properties.setAccessKeyId(value(environment, "DALANSHU_CONTENT_MODERATION_ACCESS_KEY_ID", properties.getAccessKeyId()));
        properties.setAccessKeySecret(value(environment, "DALANSHU_CONTENT_MODERATION_ACCESS_KEY_SECRET", properties.getAccessKeySecret()));
        properties.setRegion(value(environment, "DALANSHU_CONTENT_MODERATION_REGION", properties.getRegion()));
        properties.setEndpoint(value(environment, "DALANSHU_CONTENT_MODERATION_ENDPOINT", properties.getEndpoint()));
        properties.setTextService(value(environment, "DALANSHU_CONTENT_MODERATION_TEXT_SERVICE", properties.getTextService()));
        properties.setImageService(value(environment, "DALANSHU_CONTENT_MODERATION_IMAGE_SERVICE", properties.getImageService()));
        return properties;
    }

    @Bean
    public ContentModerationGateway contentModerationGateway(ContentModerationProperties properties) {
        return properties.isSdkConfigured()
            ? new AliyunContentModerationGateway(properties)
            : new DisabledContentModerationGateway(properties);
    }

    private String value(Environment environment, String key, String fallback) {
        String value = environment.getProperty(key);
        return value == null || value.isBlank() ? fallback : value;
    }

    private boolean booleanValue(Environment environment, String key, boolean fallback) {
        String value = environment.getProperty(key);
        return value == null || value.isBlank() ? fallback : Boolean.parseBoolean(value);
    }
}
