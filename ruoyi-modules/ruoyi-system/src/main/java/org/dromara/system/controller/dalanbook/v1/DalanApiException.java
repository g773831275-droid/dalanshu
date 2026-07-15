package org.dromara.system.controller.dalanbook.v1;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class DalanApiException extends RuntimeException {
    private final HttpStatus status;
    private final String code;
    private final Object details;

    public DalanApiException(HttpStatus status, String code, String message) {
        this(status, code, message, null);
    }

    public DalanApiException(HttpStatus status, String code, String message, Object details) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
    }
}
