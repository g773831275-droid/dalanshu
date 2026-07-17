package org.dromara.system.service.dalanbook.vod;

import org.dromara.system.config.dalanbook.VodProperties;
import org.dromara.system.controller.dalanbook.v1.DalanApiException;
import org.springframework.http.HttpStatus;

import java.util.Map;

/**
 * Deliberately fails closed until an approved VOD SDK/API implementation is wired.
 * It prevents application instances without credentials from issuing unusable upload
 * credentials or accepting unauthenticated provider callbacks.
 */
public class DisabledVolcengineVodGateway implements VolcengineVodGateway {
    private final VodProperties properties;

    public DisabledVolcengineVodGateway(VodProperties properties) {
        this.properties = properties;
    }

    @Override
    public UploadCredential createUploadCredential(UploadRequest request) {
        throw unavailable();
    }

    @Override
    public UploadCompletion completeUpload(UploadCompletionRequest request) {
        throw unavailable();
    }

    @Override
    public PlaybackSource getPlaybackSource(String vodVid, int ttlSeconds) {
        throw unavailable();
    }

    @Override
    public CallbackEvent verifyAndParseCallback(String payload, Map<String, String> headers) {
        throw unavailable();
    }

    private DalanApiException unavailable() {
        String message = properties.isEnabled()
            ? "火山 VOD 网关尚未完成绑定，请确认 SpaceName 和官方 SDK/API 版本"
            : "视频服务尚未配置，请在部署环境启用 VOD 后重试";
        return new DalanApiException(HttpStatus.SERVICE_UNAVAILABLE, "VOD_NOT_CONFIGURED", message);
    }
}
