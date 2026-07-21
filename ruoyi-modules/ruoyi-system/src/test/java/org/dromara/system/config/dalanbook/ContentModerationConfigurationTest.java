package org.dromara.system.config.dalanbook;

import org.dromara.system.service.dalanbook.moderation.ContentModerationGateway;
import org.dromara.system.service.dalanbook.moderation.DisabledContentModerationGateway;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("dev")
class ContentModerationConfigurationTest {

    @Test
    void externalEnvironmentVariablesOverrideYamlBinding() {
        StandardEnvironment environment = new StandardEnvironment();
        environment.getPropertySources().addFirst(new MapPropertySource("test", Map.ofEntries(
            Map.entry("dalanbook.content-moderation.enabled", "false"),
            Map.entry("DALANSHU_CONTENT_MODERATION_ENABLED", "true"),
            Map.entry("DALANSHU_CONTENT_MODERATION_ACCESS_KEY_ID", "ak"),
            Map.entry("DALANSHU_CONTENT_MODERATION_ACCESS_KEY_SECRET", "sk"),
            Map.entry("DALANSHU_CONTENT_MODERATION_REGION", "cn-hangzhou"),
            Map.entry("DALANSHU_CONTENT_MODERATION_ENDPOINT", "green-cip.cn-hangzhou.aliyuncs.com")
        )));

        ContentModerationProperties properties = new ContentModerationConfiguration().contentModerationProperties(environment);

        assertTrue(properties.isSdkConfigured());
        assertEquals("cn-hangzhou", properties.getRegion());
    }

    @Test
    void incompleteSettingsKeepTheDisabledGateway() {
        ContentModerationProperties properties = new ContentModerationProperties();
        properties.setEnabled(true);

        ContentModerationGateway gateway = new ContentModerationConfiguration().contentModerationGateway(properties);

        assertInstanceOf(DisabledContentModerationGateway.class, gateway);
    }
}
