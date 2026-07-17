package org.dromara.system.config.dalanbook;

import org.dromara.system.service.dalanbook.vod.DisabledVolcengineVodGateway;
import org.dromara.system.service.dalanbook.vod.VolcengineVodGateway;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("dev")
class VodConfigurationTest {

    @Test
    void externalVodEnvironmentVariablesOverrideYamlBinding() {
        StandardEnvironment environment = new StandardEnvironment();
        environment.getPropertySources().addFirst(new MapPropertySource("test", Map.ofEntries(
            Map.entry("vod.enabled", "false"),
            Map.entry("vod.space-name", "yaml-space"),
            Map.entry("VOD_ENABLED", "true"),
            Map.entry("VOD_ACCESS_KEY_ID", "ak"),
            Map.entry("VOD_ACCESS_KEY_SECRET", "sk"),
            Map.entry("VOD_REGION", "cn-north-1"),
            Map.entry("VOD_SPACE_NAME", "env-space"),
            Map.entry("VOD_APPLICATION_ID", "100001"),
            Map.entry("VOD_CALLBACK_URL", "https://api.example.com/internal/v1/vod/events"),
            Map.entry("VOD_CALLBACK_PRIVATE_KEY", "private-key"),
            Map.entry("VOD_WORKFLOW_TEMPLATE_ID", "workflow-id")
        )));

        VodProperties properties = new VodConfiguration().vodProperties(environment);

        assertTrue(properties.isSdkConfigured());
        assertEquals("env-space", properties.getSpaceName());
        assertEquals(100001L, properties.getApplicationId());
    }

    @Test
    void incompleteSettingsKeepTheDisabledGateway() {
        VodProperties properties = new VodProperties();
        properties.setEnabled(true);

        VolcengineVodGateway gateway = new VodConfiguration().volcengineVodGateway(properties);

        assertInstanceOf(DisabledVolcengineVodGateway.class, gateway);
    }
}
