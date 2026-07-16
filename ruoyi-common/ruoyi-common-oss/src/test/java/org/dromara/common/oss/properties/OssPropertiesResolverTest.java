package org.dromara.common.oss.properties;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

@Tag("dev")
class OssPropertiesResolverTest {

    @Test
    void shouldLoadVolcengineConfigurationFromEnvironment() {
        StandardEnvironment environment = new StandardEnvironment();
        environment.getPropertySources().addFirst(new MapPropertySource("test", Map.of(
            "VOLCENGINE_ACCESS_KEY_ID", "test-ak",
            "VOLCENGINE_ACCESS_KEY_SECRET", "test-sk",
            "TOS_BUCKET_NAME", "dalanbook-test",
            "TOS_S3_ENDPOINT", "tos-s3-cn-beijing.volces.com",
            "TOS_REGION", "cn-beijing"
        )));
        OssProperties properties = new OssProperties();
        properties.setAccessKey("${VOLCENGINE_ACCESS_KEY_ID}");
        properties.setSecretKey("${VOLCENGINE_ACCESS_KEY_SECRET}");

        OssProperties resolved = OssPropertiesResolver.resolve("volcengine", properties, environment);

        assertEquals("test-ak", resolved.getAccessKey());
        assertEquals("test-sk", resolved.getSecretKey());
        assertEquals("dalanbook-test", resolved.getBucketName());
        assertEquals("tos-s3-cn-beijing.volces.com", resolved.getEndpoint());
        assertEquals("cn-beijing", resolved.getRegion());
    }
}
