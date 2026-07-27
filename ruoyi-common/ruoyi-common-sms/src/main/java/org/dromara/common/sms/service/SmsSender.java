package org.dromara.common.sms.service;

import java.time.Duration;

/**
 * 短信验证码发送/校验统一抽象。具体实现由 dalanshu.sms.provider 选择。
 */
public interface SmsSender {

    /**
     * 发送注册验证码。验证码可由实现方生成，也可由运营商侧生成。
     *
     * @param phoneNumber 手机号
     */
    void sendRegisterCode(String phoneNumber);

    /**
     * 校验注册验证码。
     *
     * @param phoneNumber 手机号
     * @param verifyCode  用户提交的验证码
     * @return 校验通过返回 true
     */
    boolean checkRegisterCode(String phoneNumber, String verifyCode);

    /**
     * 验证码有效期，用于本地缓存或日志展示。
     */
    Duration codeExpiration();
}
