package org.dromara.common.oss.properties;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import org.dromara.common.core.utils.StringUtils;
import org.springframework.core.env.Environment;

import java.util.function.Consumer;

/**
 * 解析数据库 OSS 配置中的 Spring 占位符，并允许通过环境变量注入 TOS 配置。
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class OssPropertiesResolver {

    private static final String VOLCENGINE_CONFIG_KEY = "volcengine";

    public static OssProperties resolve(String configKey, OssProperties properties, Environment environment) {
        boolean volcengine = VOLCENGINE_CONFIG_KEY.equalsIgnoreCase(configKey)
            || StringUtils.containsIgnoreCase(properties.getEndpoint(), "volces.com");

        if (volcengine) {
            override(environment, properties::setAccessKey,
                "VOLCENGINE_ACCESS_KEY_ID", "TOS_ACCESS_KEY");
            override(environment, properties::setSecretKey,
                "VOLCENGINE_ACCESS_KEY_SECRET", "TOS_SECRET_KEY");
            override(environment, properties::setBucketName, "TOS_BUCKET_NAME");
            override(environment, properties::setEndpoint, "TOS_S3_ENDPOINT");
            override(environment, properties::setRegion, "TOS_REGION");
            override(environment, properties::setDomain, "TOS_DOMAIN");
            override(environment, properties::setPrefix, "TOS_PREFIX");
        }

        properties.setAccessKey(resolvePlaceholder(environment, properties.getAccessKey()));
        properties.setSecretKey(resolvePlaceholder(environment, properties.getSecretKey()));
        properties.setBucketName(resolvePlaceholder(environment, properties.getBucketName()));
        properties.setEndpoint(resolvePlaceholder(environment, properties.getEndpoint()));
        properties.setRegion(resolvePlaceholder(environment, properties.getRegion()));
        properties.setDomain(resolvePlaceholder(environment, properties.getDomain()));
        properties.setPrefix(resolvePlaceholder(environment, properties.getPrefix()));
        return properties;
    }

    private static void override(Environment environment, Consumer<String> setter, String... keys) {
        for (String key : keys) {
            String value = environment.getProperty(key);
            if (StringUtils.isNotBlank(value)) {
                setter.accept(value);
                return;
            }
        }
    }

    private static String resolvePlaceholder(Environment environment, String value) {
        return StringUtils.isBlank(value) ? value : environment.resolveRequiredPlaceholders(value);
    }
}
