package org.dromara.system.service.dalanbook.vod;

import org.dromara.system.config.dalanbook.VodProperties;
import org.dromara.system.controller.dalanbook.v1.DalanApiException;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

@Tag("dev")
class SdkVolcengineVodGatewayCallbackTest {
    private static final String CALLBACK_URL = "https://api.example.com/internal/v1/vod/events";
    private static final String PRIVATE_KEY = "callback-private-key";
    private static final String PAYLOAD = """
        {"EventId":"event-1","EventType":"WorkflowComplete","Data":{"SpaceName":"short-video","Vid":"v01234",
        "PosterUrl":"https://cdn.example.com/poster.jpg","SourceInfo":{"Duration":12.5,"Width":720,"Height":1280,"Size":1024}}}
        """;

    @Test
    void acceptsSignedWorkflowCompletionCallback() throws Exception {
        SdkVolcengineVodGateway gateway = new SdkVolcengineVodGateway(properties());
        String timestamp = String.valueOf(Instant.now().getEpochSecond());

        VolcengineVodGateway.CallbackEvent event = gateway.verifyAndParseCallback(PAYLOAD, signedHeaders(timestamp));

        assertEquals("event-1", event.eventId());
        assertEquals("v01234", event.vodVid());
        assertEquals("short-video", event.spaceName());
        assertEquals("ready", event.status());
        assertEquals(12_500L, event.durationMs());
        assertEquals(720, event.width());
        assertEquals(1280, event.height());
    }

    @Test
    void rejectsInvalidCallbackSignature() {
        SdkVolcengineVodGateway gateway = new SdkVolcengineVodGateway(properties());

        DalanApiException error = assertThrows(DalanApiException.class, () ->
            gateway.verifyAndParseCallback(PAYLOAD, Map.of(
                "X-VOD-TIMESTAMP", String.valueOf(Instant.now().getEpochSecond()),
                "X-VOD-SIGNATURE", "not-a-valid-signature")));

        assertEquals(HttpStatus.UNAUTHORIZED, error.getStatus());
        assertEquals("INVALID_VOD_CALLBACK", error.getCode());
    }

    @Test
    void rejectsExpiredCallbackBeforeVerifyingTheSignature() throws Exception {
        SdkVolcengineVodGateway gateway = new SdkVolcengineVodGateway(properties());
        String timestamp = String.valueOf(Instant.now().minusSeconds(481).getEpochSecond());

        DalanApiException error = assertThrows(DalanApiException.class, () ->
            gateway.verifyAndParseCallback(PAYLOAD, signedHeaders(timestamp)));

        assertEquals(HttpStatus.UNAUTHORIZED, error.getStatus());
        assertEquals("EXPIRED_VOD_CALLBACK", error.getCode());
    }

    private VodProperties properties() {
        VodProperties properties = new VodProperties();
        properties.setEnabled(true);
        properties.setAccessKeyId("ak");
        properties.setAccessKeySecret("sk");
        properties.setRegion("cn-north-1");
        properties.setSpaceName("short-video");
        properties.setApplicationId(100001L);
        properties.setCallbackUrl(CALLBACK_URL);
        properties.setCallbackPrivateKey(PRIVATE_KEY);
        properties.setWorkflowTemplateId("workflow-id");
        return properties;
    }

    private Map<String, String> signedHeaders(String timestamp) throws Exception {
        return Map.of("X-VOD-TIMESTAMP", timestamp, "X-VOD-SIGNATURE", signature(timestamp));
    }

    private String signature(String timestamp) throws Exception {
        String encodedPayload = Base64.getEncoder().encodeToString(PAYLOAD.getBytes(StandardCharsets.UTF_8));
        String source = CALLBACK_URL + "|" + timestamp + "|" + PRIVATE_KEY + "|" + encodedPayload;
        return HexFormat.of().formatHex(MessageDigest.getInstance("MD5").digest(source.getBytes(StandardCharsets.UTF_8)));
    }
}
