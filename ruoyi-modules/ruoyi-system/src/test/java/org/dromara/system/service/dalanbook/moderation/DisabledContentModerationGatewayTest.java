package org.dromara.system.service.dalanbook.moderation;

import org.dromara.system.config.dalanbook.ContentModerationProperties;
import org.dromara.system.controller.dalanbook.v1.DalanApiException;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

@Tag("dev")
class DisabledContentModerationGatewayTest {

    @Test
    void skipsReviewWhenTheFeatureIsDisabled() {
        DisabledContentModerationGateway gateway = new DisabledContentModerationGateway(new ContentModerationProperties());

        assertDoesNotThrow(() -> gateway.checkText("本地开发文本", "text-1"));
        assertDoesNotThrow(() -> gateway.checkImage("https://example.com/image.png", "image-1"));
    }

    @Test
    void rejectsRequestsWhenEnabledConfigurationIsIncomplete() {
        ContentModerationProperties properties = new ContentModerationProperties();
        properties.setEnabled(true);
        DisabledContentModerationGateway gateway = new DisabledContentModerationGateway(properties);

        DalanApiException exception = assertThrows(DalanApiException.class,
            () -> gateway.checkText("待审核文本", "text-1"));

        assertEquals("CONTENT_MODERATION_NOT_CONFIGURED", exception.getCode());
    }
}
