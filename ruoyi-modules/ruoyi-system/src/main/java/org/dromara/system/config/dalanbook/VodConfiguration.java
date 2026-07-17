package org.dromara.system.config.dalanbook;

import org.springframework.boot.context.properties.bind.Bindable;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.dromara.system.service.dalanbook.vod.DisabledVolcengineVodGateway;
import org.dromara.system.service.dalanbook.vod.SdkVolcengineVodGateway;
import org.dromara.system.service.dalanbook.vod.VolcengineVodGateway;

@Configuration
public class VodConfiguration {

    @Bean
    public VodProperties vodProperties(Environment environment) {
        VodProperties properties = new VodProperties();
        Binder.get(environment).bind("vod", Bindable.ofInstance(properties));
        properties.setEnabled(booleanValue(environment, "VOD_ENABLED", properties.isEnabled()));
        properties.setAccessKeyId(value(environment, "VOD_ACCESS_KEY_ID", properties.getAccessKeyId()));
        properties.setAccessKeySecret(value(environment, "VOD_ACCESS_KEY_SECRET", properties.getAccessKeySecret()));
        properties.setRegion(value(environment, "VOD_REGION", properties.getRegion()));
        properties.setSpaceName(value(environment, "VOD_SPACE_NAME", properties.getSpaceName()));
        properties.setApplicationId(longValue(environment, "VOD_APPLICATION_ID", properties.getApplicationId()));
        properties.setPlayDomain(value(environment, "VOD_PLAY_DOMAIN", properties.getPlayDomain()));
        properties.setCallbackUrl(value(environment, "VOD_CALLBACK_URL", properties.getCallbackUrl()));
        properties.setCallbackPrivateKey(value(environment, "VOD_CALLBACK_PRIVATE_KEY",
            value(environment, "VOD_CALLBACK_SECRET", properties.getCallbackPrivateKey())));
        properties.setPreviousCallbackPrivateKey(value(environment, "VOD_PREVIOUS_CALLBACK_PRIVATE_KEY",
            value(environment, "VOD_PREVIOUS_CALLBACK_SECRET", properties.getPreviousCallbackPrivateKey())));
        properties.setWorkflowTemplateId(value(environment, "VOD_WORKFLOW_TEMPLATE_ID",
            value(environment, "VOD_WORKFLOW_ID", properties.getWorkflowTemplateId())));
        properties.setSnapshotTemplateId(value(environment, "VOD_SNAPSHOT_TEMPLATE_ID", properties.getSnapshotTemplateId()));
        properties.setUploadTokenTtlSeconds(integerValue(environment, "VOD_UPLOAD_TOKEN_TTL_SECONDS",
            properties.getUploadTokenTtlSeconds()));
        properties.setPlayAuthTtlSeconds(integerValue(environment, "VOD_PLAY_AUTH_TTL_SECONDS", properties.getPlayAuthTtlSeconds()));
        properties.setCallbackMaxAgeSeconds(integerValue(environment, "VOD_CALLBACK_MAX_AGE_SECONDS", properties.getCallbackMaxAgeSeconds()));
        return properties;
    }

    @Bean
    public VolcengineVodGateway volcengineVodGateway(VodProperties properties) {
        return properties.isSdkConfigured()
            ? new SdkVolcengineVodGateway(properties)
            : new DisabledVolcengineVodGateway(properties);
    }

    private String value(Environment environment, String key, String fallback) {
        String value = environment.getProperty(key);
        return value == null || value.isBlank() ? fallback : value;
    }

    private boolean booleanValue(Environment environment, String key, boolean fallback) {
        String value = environment.getProperty(key);
        return value == null || value.isBlank() ? fallback : Boolean.parseBoolean(value);
    }

    private int integerValue(Environment environment, String key, int fallback) {
        String value = environment.getProperty(key);
        if (value == null || value.isBlank()) return fallback;
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException ignored) {
            return fallback;
        }
    }

    private Long longValue(Environment environment, String key, Long fallback) {
        String value = environment.getProperty(key);
        if (value == null || value.isBlank()) return fallback;
        try {
            return Long.valueOf(value);
        } catch (NumberFormatException ignored) {
            return fallback;
        }
    }
}
