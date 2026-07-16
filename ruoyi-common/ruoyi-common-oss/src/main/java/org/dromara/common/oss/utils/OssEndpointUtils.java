package org.dromara.common.oss.utils;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import org.dromara.common.core.constant.Constants;
import org.dromara.common.core.utils.StringUtils;
import org.dromara.common.oss.constant.OssConstant;

import java.util.Locale;

/**
 * OSS Endpoint 工具。
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class OssEndpointUtils {

    public static boolean isCloudService(String endpoint) {
        String normalizedEndpoint = StringUtils.defaultString(endpoint).toLowerCase(Locale.ROOT);
        return StringUtils.containsAny(normalizedEndpoint, OssConstant.CLOUD_SERVICE);
    }

    public static boolean isVolcengineTos(String endpoint) {
        String normalizedEndpoint = StringUtils.defaultString(endpoint).toLowerCase(Locale.ROOT);
        return normalizedEndpoint.contains(OssConstant.VOLCENGINE_TOS_ENDPOINT)
            && normalizedEndpoint.contains("volces.com");
    }

    public static String withProtocol(String endpoint, boolean https) {
        if (StringUtils.startsWithAny(endpoint, Constants.HTTP, Constants.HTTPS)) {
            return endpoint;
        }
        return (https ? Constants.HTTPS : Constants.HTTP) + endpoint;
    }
}
