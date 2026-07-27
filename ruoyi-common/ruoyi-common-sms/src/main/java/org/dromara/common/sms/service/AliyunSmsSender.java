package org.dromara.common.sms.service;

import cn.hutool.core.util.StrUtil;
import com.aliyun.dypnsapi20170525.Client;
import com.aliyun.dypnsapi20170525.models.CheckSmsVerifyCodeRequest;
import com.aliyun.dypnsapi20170525.models.CheckSmsVerifyCodeResponse;
import com.aliyun.dypnsapi20170525.models.SendSmsVerifyCodeRequest;
import com.aliyun.dypnsapi20170525.models.SendSmsVerifyCodeResponse;
import com.aliyun.teaopenapi.models.Config;
import lombok.extern.slf4j.Slf4j;
import org.dromara.common.core.constant.GlobalConstants;
import org.dromara.common.core.exception.ServiceException;
import org.dromara.common.redis.utils.RedisUtils;
import org.dromara.common.sms.config.properties.AliyunSmsProperties;
import org.redisson.api.RateType;

import java.time.Duration;

/**
 * 通过阿里云号码认证服务 SendSmsVerifyCode 发送注册验证码。
 * 验证码由阿里云侧生成、缓存和校验，本地仅做调用频率限制。
 */
@Slf4j
public class AliyunSmsSender implements SmsSender {

    private final AliyunSmsProperties properties;
    private volatile Client client;

    public AliyunSmsSender(AliyunSmsProperties properties) {
        this.properties = properties;
    }

    @Override
    public void sendRegisterCode(String phoneNumber) {
        validateConfiguration();
        checkDailyLimit(phoneNumber);

        SendSmsVerifyCodeRequest request = new SendSmsVerifyCodeRequest()
            .setPhoneNumber(phoneNumber)
            .setSignName(properties.getSign())
            .setTemplateCode(properties.getRegisterTemplateCode())
            .setTemplateParam(properties.getTemplateParam())
            .setCodeType(Long.valueOf(properties.getCodeType()))
            .setCodeLength(Long.valueOf(properties.getCodeLength()))
            .setValidTime(Long.valueOf(properties.getValidTime()))
            .setInterval(Long.valueOf(properties.getInterval()))
            .setReturnVerifyCode(properties.isReturnVerifyCode());

        try {
            SendSmsVerifyCodeResponse response = client().sendSmsVerifyCode(request);
            if (response == null || response.getBody() == null
                || !StrUtil.equals("OK", response.getBody().getCode())) {
                String errCode = response == null || response.getBody() == null ? null : response.getBody().getCode();
                String errMsg = response == null || response.getBody() == null ? null : response.getBody().getMessage();
                throw new IllegalStateException("阿里云号码认证服务未返回有效受理结果: " + errCode + " " + errMsg);
            }
            log.info("阿里云注册验证码已受理, phone={}, requestId={}",
                maskPhone(phoneNumber),
                response.getBody().getRequestId());
        } catch (Exception exception) {
            log.error("阿里云注册验证码发送失败, phone={}", maskPhone(phoneNumber), exception);
            throw new ServiceException("短信发送失败，请稍后重试");
        }
    }

    public boolean checkRegisterCode(String phoneNumber, String verifyCode) {
        validateConfiguration();
        CheckSmsVerifyCodeRequest request = new CheckSmsVerifyCodeRequest()
            .setPhoneNumber(phoneNumber)
            .setVerifyCode(verifyCode);
        try {
            CheckSmsVerifyCodeResponse response = client().checkSmsVerifyCode(request);
            if (response == null || response.getBody() == null
                || response.getBody().getModel() == null) {
                return false;
            }
            return "PASS".equalsIgnoreCase(response.getBody().getModel().getVerifyResult());
        } catch (Exception exception) {
            log.error("阿里云注册验证码校验失败, phone={}", maskPhone(phoneNumber), exception);
            return false;
        }
    }

    @Override
    public Duration codeExpiration() {
        return Duration.ofSeconds(properties.getValidTime());
    }

    private Client client() {
        Client local = client;
        if (local == null) {
            synchronized (this) {
                local = client;
                if (local == null) {
                    local = buildClient();
                    client = local;
                }
            }
        }
        return local;
    }

    private Client buildClient() {
        Config config = new Config()
            .setAccessKeyId(properties.getAccessKeyId())
            .setAccessKeySecret(properties.getAccessKeySecret())
            .setRegionId(properties.getRegion());
        try {
            return new Client(config);
        } catch (Exception e) {
            throw new IllegalStateException("阿里云号码认证客户端初始化失败", e);
        }
    }

    private void validateConfiguration() {
        if (!properties.isEnabled()) {
            throw new ServiceException("短信服务未启用，请联系管理员");
        }
        if (StrUtil.hasBlank(
            properties.getAccessKeyId(),
            properties.getAccessKeySecret(),
            properties.getSign(),
            properties.getRegisterTemplateCode())) {
            throw new ServiceException("阿里云号码认证服务配置不完整，请联系管理员");
        }
        if (properties.getCodeLength() < 4 || properties.getCodeLength() > 8) {
            throw new ServiceException("阿里云号码认证验证码长度配置不正确，请联系管理员");
        }
        if (properties.getDailyMax() < 1) {
            throw new ServiceException("阿里云号码认证每日发送上限配置不正确，请联系管理员");
        }
    }

    private void checkDailyLimit(String phoneNumber) {
        String key = GlobalConstants.GLOBAL_REDIS_KEY + "sms:aliyun:daily:" + phoneNumber;
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
