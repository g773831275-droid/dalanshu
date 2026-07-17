package org.dromara.system.service.dalanbook;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

@Tag("dev")
class DalanTopicNameNormalizerTest {

    @Test
    void normalizesUnicodeCaseWhitespaceAndHashBoundaries() {
        DalanTopicNameNormalizer.NormalizedTopicName topic =
            DalanTopicNameNormalizer.normalize("  #ＡＩ   工具#  ");

        assertEquals("AI 工具", topic.displayName());
        assertEquals("ai工具", topic.normalizedName());
    }

    @Test
    void keepsCommonTechnicalTopicCharacters() {
        DalanTopicNameNormalizer.NormalizedTopicName topic =
            DalanTopicNameNormalizer.normalize("AI/ML + R&D");

        assertEquals("AI/ML + R&D", topic.displayName());
        assertEquals("ai/ml+r&d", topic.normalizedName());
    }

    @Test
    void rejectsPureNumberAndUnsupportedPunctuation() {
        assertThrows(IllegalArgumentException.class, () -> DalanTopicNameNormalizer.normalize("123"));
        assertThrows(IllegalArgumentException.class, () -> DalanTopicNameNormalizer.normalize("测试,广告"));
    }
}
