package org.dromara.system.service.dalanbook.vod;

import org.dromara.system.config.dalanbook.VodProperties;
import org.dromara.system.controller.dalanbook.v1.DalanApiException;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

@Tag("dev")
class DisabledVolcengineVodGatewayTest {

    @Test
    void rejectsUploadCredentialWhenVodIsDisabled() {
        VodProperties properties = new VodProperties();
        DisabledVolcengineVodGateway gateway = new DisabledVolcengineVodGateway(properties);

        DalanApiException error = assertThrows(DalanApiException.class, () ->
            gateway.createUploadCredential(new VolcengineVodGateway.UploadRequest(
                "short-video.mp4", "video/mp4", 1024L, "space", "workflow", "snapshot", 900)));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getStatus());
        assertEquals("VOD_NOT_CONFIGURED", error.getCode());
    }

    @Test
    void rejectsCallbacksUntilVendorGatewayIsConfigured() {
        VodProperties properties = new VodProperties();
        properties.setEnabled(true);
        DisabledVolcengineVodGateway gateway = new DisabledVolcengineVodGateway(properties);

        DalanApiException error = assertThrows(DalanApiException.class, () ->
            gateway.verifyAndParseCallback("{}", java.util.Map.of()));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getStatus());
        assertEquals("VOD_NOT_CONFIGURED", error.getCode());
    }
}
