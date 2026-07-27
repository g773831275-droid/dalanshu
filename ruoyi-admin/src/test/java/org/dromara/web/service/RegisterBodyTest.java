package org.dromara.web.service;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.dromara.common.core.domain.model.RegisterBody;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;

@Tag("dev")
class RegisterBodyTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void rejectsInvalidPhoneNumber() {
        RegisterBody body = validBody();
        body.setPhonenumber("12345678901");

        assertEquals(Set.of("phonenumber"), invalidProperties(body));
    }

    @Test
    void rejectsNonNumericSmsCode() {
        RegisterBody body = validBody();
        body.setSmsCode("abc123");

        assertEquals(Set.of("smsCode"), invalidProperties(body));
    }

    private RegisterBody validBody() {
        RegisterBody body = new RegisterBody();
        body.setClientId("web-client");
        body.setGrantType("password");
        body.setPhonenumber("13800138000");
        body.setSmsCode("123456");
        body.setPassword("dalanbook123");
        return body;
    }

    private Set<String> invalidProperties(RegisterBody body) {
        return validator.validate(body).stream()
            .map(violation -> violation.getPropertyPath().toString())
            .collect(java.util.stream.Collectors.toSet());
    }
}
