package org.dromara.common.core.domain.model;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.hibernate.validator.constraints.Length;

@Data
public class RecoverPasswordBody {

    @NotBlank(message = "{auth.clientid.not.blank}")
    private String clientId;

    @NotBlank(message = "{user.email.not.blank}")
    @Email(message = "{user.email.not.valid}")
    private String email;

    @NotBlank(message = "{email.code.not.blank}")
    private String emailCode;

    @NotBlank(message = "新密码不能为空")
    @Length(min = 8, max = 30, message = "密码长度必须在{min}到{max}个字符之间")
    private String newPassword;
}
