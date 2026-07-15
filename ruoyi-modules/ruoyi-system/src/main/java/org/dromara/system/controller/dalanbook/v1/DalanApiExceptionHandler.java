package org.dromara.system.controller.dalanbook.v1;

import jakarta.validation.ConstraintViolationException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(assignableTypes = DalanbookV1Controller.class)
public class DalanApiExceptionHandler {
    public record ErrorBody(String code, String message, Object details) {}

    @ExceptionHandler(DalanApiException.class)
    public ResponseEntity<ErrorBody> handle(DalanApiException exception) {
        return ResponseEntity.status(exception.getStatus())
            .body(new ErrorBody(exception.getCode(), exception.getMessage(), exception.getDetails()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorBody> handleValidation(MethodArgumentNotValidException exception) {
        Map<String, String> details = exception.getBindingResult().getFieldErrors().stream()
            .collect(java.util.stream.Collectors.toMap(
                error -> error.getField(),
                error -> error.getDefaultMessage() == null ? "参数无效" : error.getDefaultMessage(),
                (first, ignored) -> first));
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
            .body(new ErrorBody("VALIDATION_FAILED", "请求参数校验失败", details));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorBody> handleConstraint(ConstraintViolationException exception) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
            .body(new ErrorBody("VALIDATION_FAILED", "请求参数校验失败", exception.getMessage()));
    }
}
