package org.dromara.common.sms.config;

import org.dromara.common.sms.core.dao.PlusSmsDao;
import org.dromara.common.sms.config.properties.VolcSmsProperties;
import org.dromara.common.sms.handler.SmsExceptionHandler;
import org.dromara.common.sms.service.VolcSmsSender;
import org.dromara.sms4j.api.dao.SmsDao;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/**
 * 短信配置类
 *
 * @author Feng
 */
@AutoConfiguration(after = {RedisAutoConfiguration.class})
@EnableConfigurationProperties(VolcSmsProperties.class)
public class SmsAutoConfiguration {

    @Primary
    @Bean
    public SmsDao smsDao() {
        return new PlusSmsDao();
    }

    /**
     * 异常处理器
     */
    @Bean
    public SmsExceptionHandler smsExceptionHandler() {
        return new SmsExceptionHandler();
    }

    @Bean
    public VolcSmsSender volcSmsSender(VolcSmsProperties properties) {
        return new VolcSmsSender(properties);
    }

}
