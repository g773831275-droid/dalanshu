package org.dromara.web.controller;

import org.dromara.common.core.exception.ServiceException;
import org.dromara.common.mail.config.properties.MailProperties;
import org.dromara.common.web.config.properties.CaptchaProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CaptchaControllerTest {

    @Test
    @Tag("dev")
    @DisplayName("未配置 SMTP 密码时拒绝发送邮箱验证码")
    void rejectEmailCodeWhenSmtpPasswordIsMissing() {
        MailProperties mailProperties = new MailProperties();
        mailProperties.setEnabled(true);
        mailProperties.setPass("");
        CaptchaController controller = new CaptchaController(new CaptchaProperties(), mailProperties);

        ServiceException exception = assertThrows(
            ServiceException.class,
            () -> controller.emailCodeImpl("user@example.com", "register")
        );

        assertEquals("邮件服务未配置，请联系管理员", exception.getMessage());
    }
}
