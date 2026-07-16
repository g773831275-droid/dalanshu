package org.dromara.common.oss.core;

import org.dromara.common.oss.properties.OssProperties;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * 火山引擎 TOS 真实联通测试。
 *
 * <p>默认跳过，只有显式设置 {@code TOS_LIVE_TEST=true} 时才会访问真实桶。</p>
 */
@Tag("dev")
class VolcengineTosLiveTest {

    @Test
    void shouldUploadDownloadAndDeleteObject() {
        assumeTrue("true".equalsIgnoreCase(System.getenv("TOS_LIVE_TEST")));

        OssProperties properties = new OssProperties();
        properties.setAccessKey(required("VOLCENGINE_ACCESS_KEY_ID"));
        properties.setSecretKey(required("VOLCENGINE_ACCESS_KEY_SECRET"));
        properties.setBucketName(required("TOS_BUCKET_NAME"));
        properties.setRegion(required("TOS_REGION"));
        properties.setEndpoint(required("TOS_S3_ENDPOINT"));
        properties.setPrefix(System.getenv().getOrDefault("TOS_PREFIX", "dalanbook"));
        properties.setIsHttps("Y");
        properties.setAccessPolicy("0");

        OssClient client = new OssClient("volcengine-live-test", properties);
        byte[] expected = ("dalanshu-tos-live-test-" + UUID.randomUUID())
            .getBytes(StandardCharsets.UTF_8);
        String key = properties.getPrefix() + "/integration-tests/" + UUID.randomUUID() + ".txt";

        try {
            client.upload(new ByteArrayInputStream(expected), key, (long) expected.length, "text/plain");
            ByteArrayOutputStream actual = new ByteArrayOutputStream();
            client.download(key, actual, null);
            assertArrayEquals(expected, actual.toByteArray());
        } finally {
            client.delete(key);
        }
    }

    private static String required(String name) {
        String value = System.getenv(name);
        assumeTrue(value != null && !value.isBlank(), name + " 未配置");
        return value;
    }
}
