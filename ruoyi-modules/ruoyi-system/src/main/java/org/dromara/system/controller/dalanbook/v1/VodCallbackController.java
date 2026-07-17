package org.dromara.system.controller.dalanbook.v1;

import cn.dev33.satoken.annotation.SaIgnore;
import lombok.RequiredArgsConstructor;
import org.dromara.system.service.dalanbook.DalanbookApiService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@SaIgnore
@RestController
@RequiredArgsConstructor
@RequestMapping("/internal/v1/vod")
public class VodCallbackController {
    private final DalanbookApiService service;

    @PostMapping("/events")
    public ResponseEntity<Void> event(@RequestBody String payload, @RequestHeader HttpHeaders headers) {
        service.handleVodCallback(payload, headers.toSingleValueMap());
        return ResponseEntity.ok().build();
    }
}
