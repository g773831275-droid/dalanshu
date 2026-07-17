package org.dromara.common.oss.core;

import org.dromara.common.oss.enums.OssImageStyle;
import org.dromara.common.oss.properties.OssProperties;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("dev")
class OssImageStylePresignTest {

    @Test
    void shouldSignTosImageProcessParameter() {
        OssProperties properties = new OssProperties();
        properties.setAccessKey("test-access-key");
        properties.setSecretKey("test-secret-key");
        properties.setBucketName("file-system");
        properties.setRegion("cn-shanghai");
        properties.setEndpoint("tos-s3-cn-shanghai.volces.com");
        properties.setIsHttps("Y");
        properties.setAccessPolicy("0");

        OssClient client = new OssClient("test", properties);
        String url = client.createPresignedGetUrl("dalanbook/test.jpg", Duration.ofMinutes(2),
            OssImageStyle.POST_FEED_720);
        String decoded = URLDecoder.decode(url, StandardCharsets.UTF_8);

        assertTrue(decoded.contains("x-tos-process=" + OssImageStyle.POST_FEED_720.getProcess()));
        assertTrue(decoded.contains("X-Amz-Signature="));
    }
}
