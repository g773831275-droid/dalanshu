package org.dromara.system.service.dalanbook;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.text.Normalizer;
import java.util.Locale;

/**
 * Normalizes user supplied topic names for display and uniqueness checks.
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class DalanTopicNameNormalizer {

    public static final int MAX_NAME_LENGTH = 20;

    public static NormalizedTopicName normalize(String rawName) {
        if (rawName == null) {
            throw new IllegalArgumentException("话题名称不能为空");
        }
        String name = Normalizer.normalize(rawName, Normalizer.Form.NFKC)
            .trim()
            .replaceAll("^#+|#+$", "")
            .trim()
            .replaceAll("\\s+", " ");
        int length = name.codePointCount(0, name.length());
        if (length < 2 || length > MAX_NAME_LENGTH) {
            throw new IllegalArgumentException("话题名称需要 2-20 个字符");
        }
        if (name.codePoints().allMatch(Character::isDigit)) {
            throw new IllegalArgumentException("话题名称不能为纯数字");
        }
        if (name.codePoints().anyMatch(codePoint -> !isAllowed(codePoint))) {
            throw new IllegalArgumentException("话题名称包含不支持的字符");
        }
        String normalizedName = name.toLowerCase(Locale.ROOT).replace(" ", "");
        return new NormalizedTopicName(name, normalizedName);
    }

    public static String normalizeKeyword(String rawKeyword) {
        if (rawKeyword == null) return "";
        String keyword = Normalizer.normalize(rawKeyword, Normalizer.Form.NFKC)
            .trim()
            .replaceAll("^#+|#+$", "")
            .trim()
            .replaceAll("\\s+", " ")
            .replaceAll("[^\\p{L}\\p{N}_+\\-./&· ]", "")
            .trim();
        if (keyword.codePointCount(0, keyword.length()) > MAX_NAME_LENGTH) {
            return keyword.substring(0, keyword.offsetByCodePoints(0, MAX_NAME_LENGTH));
        }
        return keyword;
    }

    private static boolean isAllowed(int codePoint) {
        return Character.isLetterOrDigit(codePoint)
            || Character.isWhitespace(codePoint)
            || codePoint == '_'
            || codePoint == '-'
            || codePoint == '+'
            || codePoint == '.'
            || codePoint == '/'
            || codePoint == '&'
            || codePoint == '·';
    }

    public record NormalizedTopicName(String displayName, String normalizedName) {}
}
