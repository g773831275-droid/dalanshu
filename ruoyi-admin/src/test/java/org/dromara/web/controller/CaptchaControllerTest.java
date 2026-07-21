package org.dromara.web.controller;

import org.dromara.common.core.exception.ServiceException;
import org.dromara.common.mail.config.properties.MailProperties;
import org.dromara.common.sms.config.properties.VolcSmsProperties;
import org.dromara.common.sms.service.VolcSmsSender;
import org.dromara.common.web.config.properties.CaptchaProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CaptchaControllerTest {

    @Test
    @DisplayName("未启用火山引擎短信时拒绝发送验证码")
    void rejectSmsCodeWhenVolcSmsIsDisabled() {
        VolcSmsSender sender = new VolcSmsSender(new VolcSmsProperties());

        ServiceException exception = assertThrows(
            ServiceException.class,
            () -> sender.sendRegisterCode("13800138000", "123456")
        );

        assertEquals("短信服务未启用，请联系管理员", exception.getMessage());
    }

    @Test
    @Tag("dev")
    @DisplayName("火山引擎短信配置不完整时拒绝发送验证码")
    void rejectSmsCodeWhenVolcSmsConfigurationIsIncomplete() {
        VolcSmsProperties properties = new VolcSmsProperties();
        properties.setEnabled(true);
        VolcSmsSender sender = new VolcSmsSender(properties);

        ServiceException exception = assertThrows(
            ServiceException.class,
            () -> sender.sendRegisterCode("13800138000", "123456")
        );

        assertEquals("火山引擎短信服务配置不完整，请联系管理员", exception.getMessage());
    }

    @Test
    @Tag("dev")
    @DisplayName("未配置 SMTP 密码时拒绝发送邮箱验证码")
    void rejectEmailCodeWhenSmtpPasswordIsMissing() {
        MailProperties mailProperties = new MailProperties();
        mailProperties.setEnabled(true);
        mailProperties.setPass("");
        CaptchaController controller = new CaptchaController(
            new CaptchaProperties(), mailProperties, new VolcSmsSender(new VolcSmsProperties()));

        ServiceException exception = assertThrows(
            ServiceException.class,
            () -> controller.emailCodeImpl("user@example.com", "register")
        );

        assertEquals("邮件服务未配置，请联系管理员", exception.getMessage());
    }
}
