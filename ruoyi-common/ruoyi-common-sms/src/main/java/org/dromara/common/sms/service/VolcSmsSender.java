package org.dromara.common.sms.service;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.RandomUtil;
import cn.hutool.core.util.StrUtil;
import com.volcengine.model.request.SmsSendRequest;
import com.volcengine.model.response.SmsSendResponse;
import com.volcengine.service.sms.SmsService;
import com.volcengine.service.sms.SmsServiceInfoConfig;
import com.volcengine.service.sms.impl.SmsServiceImpl;
import lombok.extern.slf4j.Slf4j;
import org.dromara.common.core.constant.GlobalConstants;
import org.dromara.common.core.exception.ServiceException;
import org.dromara.common.sms.config.properties.VolcSmsProperties;
import org.dromara.common.redis.utils.RedisUtils;
import org.redisson.api.RateType;

import java.time.Duration;
import java.util.Map;

/**
 * 通过火山引擎 SendSms 接口发送验证码。验证码由本地生成并缓存到 Redis。
 */
@Slf4j
public class VolcSmsSender implements SmsSender {

    private final VolcSmsProperties properties;

    public VolcSmsSender(VolcSmsProperties properties) {
        this.properties = properties;
    }

    @Override
    public void sendRegisterCode(String phoneNumber) {
        validateConfiguration();
        checkDailyLimit(phoneNumber);

        String code = RandomUtil.randomNumbers(6);
        SmsSendRequest request = new SmsSendRequest();
        request.setSmsAccount(properties.getSmsAccount());
        request.setSign(properties.getSign());
        request.setTemplateId(properties.getRegisterTemplateId());
        request.setPhoneNumbers(phoneNumber);
        request.setTemplateParamByMap(Map.of("code", code));

        try {
            SmsSendResponse response = smsService().send(request);
            if (response == null || response.getResponseMetadata() == null
                || response.getResponseMetadata().getError() != null) {
                throw new IllegalStateException("火山引擎短信服务未返回有效受理结果");
            }
            String key = GlobalConstants.CAPTCHA_CODE_KEY + phoneNumber;
            RedisUtils.setCacheObject(key, code, codeExpiration());
            log.info("火山引擎注册验证码已受理, phone={}, requestId={}, messageIds={}",
                maskPhone(phoneNumber),
                response.getResponseMetadata().getRequestId(),
                response.getResult() == null ? null : response.getResult().getMessageId());
        } catch (Exception exception) {
            log.error("火山引擎注册验证码发送失败, phone={}", maskPhone(phoneNumber), exception);
            throw new ServiceException("短信发送失败，请稍后重试");
        }
    }

    @Override
    public boolean checkRegisterCode(String phoneNumber, String verifyCode) {
        String key = GlobalConstants.CAPTCHA_CODE_KEY + phoneNumber;
        String cachedCode = RedisUtils.getCacheObject(key);
        if (StrUtil.isBlank(cachedCode)) {
            return false;
        }
        boolean ok = StrUtil.equals(cachedCode, verifyCode);
        if (ok) {
            RedisUtils.deleteObject(key);
        }
        return ok;
    }

    @Override
    public Duration codeExpiration() {
        return Duration.ofMinutes(properties.getCodeExpireMinutes());
    }

    private SmsService smsService() {
        SmsServiceInfoConfig config = new SmsServiceInfoConfig(properties.getAccessKey(), properties.getSecretKey());
        config.setRegion(properties.getRegion());
        return SmsServiceImpl.getInstance(config);
    }

    private void validateConfiguration() {
        if (!properties.isEnabled()) {
            throw new ServiceException("短信服务未启用，请联系管理员");
        }
        if (StrUtil.hasBlank(
            properties.getAccessKey(),
            properties.getSecretKey(),
            properties.getSmsAccount(),
            properties.getSign(),
            properties.getRegisterTemplateId())) {
            throw new ServiceException("火山引擎短信服务配置不完整，请联系管理员");
        }
        if (properties.getCodeExpireMinutes() < 1) {
            throw new ServiceException("火山引擎短信验证码有效期配置不正确，请联系管理员");
        }
        if (properties.getDailyMax() < 1) {
            throw new ServiceException("火山引擎短信每日发送上限配置不正确，请联系管理员");
        }
    }

    private void checkDailyLimit(String phoneNumber) {
        String key = GlobalConstants.GLOBAL_REDIS_KEY + "sms:volc:daily:" + phoneNumber;
        long permits = RedisUtils.rateLimiter(key, RateType.OVERALL, properties.getDailyMax(), 86_400, 86_400);
        if (permits < 0) {
            throw new ServiceException("今日验证码发送次数已达上限，请明日再试");
        }
    }

    private String maskPhone(String phoneNumber) {
        if (StrUtil.length(phoneNumber) < 7) {
            return "***";
        }
        return StrUtil.sub(phoneNumber, 0, 3) + "****" + StrUtil.subSuf(phoneNumber, phoneNumber.length() - 4);
    }
}
