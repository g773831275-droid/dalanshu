package org.dromara.common.oss.utils;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertEquals;

@Tag("dev")
class OssEndpointUtilsTest {

    @Test
    void shouldRecognizeVolcengineS3EndpointAsCloudStorage() {
        String endpoint = "tos-s3-cn-beijing.volces.com";

        assertTrue(OssEndpointUtils.isCloudService(endpoint));
        assertTrue(OssEndpointUtils.isVolcengineTos(endpoint));
        assertFalse(OssEndpointUtils.isVolcengineTos("tos-cn-beijing.volces.com"));
    }

    @Test
    void shouldAddProtocolOnlyWhenMissing() {
        assertEquals("https://tos-s3-cn-beijing.volces.com",
            OssEndpointUtils.withProtocol("tos-s3-cn-beijing.volces.com", true));
        assertEquals("https://tos-s3-cn-beijing.volces.com",
            OssEndpointUtils.withProtocol("https://tos-s3-cn-beijing.volces.com", false));
    }
}
