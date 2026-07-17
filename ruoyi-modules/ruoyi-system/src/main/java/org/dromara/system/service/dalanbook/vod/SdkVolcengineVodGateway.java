package org.dromara.system.service.dalanbook.vod;

import cn.hutool.crypto.digest.DigestUtil;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.volcengine.model.sts2.SecurityToken2;
import com.volcengine.service.vod.IVodService;
import com.volcengine.service.vod.impl.VodServiceImpl;
import com.volcengine.service.vod.model.business.VodMediaInfo;
import com.volcengine.service.vod.model.business.VodPlayInfo;
import com.volcengine.service.vod.model.request.VodGetMediaInfosRequest;
import com.volcengine.service.vod.model.request.VodGetPlayInfoRequest;
import com.volcengine.service.vod.model.response.VodGetMediaInfosResponse;
import com.volcengine.service.vod.model.response.VodGetPlayInfoResponse;
import org.dromara.system.config.dalanbook.VodProperties;
import org.dromara.system.controller.dalanbook.v1.DalanApiException;
import org.springframework.http.HttpStatus;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Official volc-sdk-java adapter. Browser upload uses a short-lived VOD STS
 * credential; long-lived account credentials remain only in this process.
 */
public class SdkVolcengineVodGateway implements VolcengineVodGateway {
    private static final ObjectMapper CALLBACK_OBJECT_MAPPER = new ObjectMapper();
    private final VodProperties properties;
    private final IVodService vodService;

    public SdkVolcengineVodGateway(VodProperties properties) {
        this.properties = properties;
        this.vodService = createService(properties.getRegion());
        this.vodService.setAccessKey(properties.getAccessKeyId());
        this.vodService.setSecretKey(properties.getAccessKeySecret());
    }

    private IVodService createService(String region) {
        try {
            return VodServiceImpl.getInstance(region);
        } catch (Exception exception) {
            throw new IllegalStateException("无法初始化火山 VOD SDK", exception);
        }
    }

    @Override
    public UploadCredential createUploadCredential(UploadRequest request) {
        try {
            SecurityToken2 token = vodService.getUploadSts2WithExpire(request.ttlSeconds());
            Instant expiresAt = Instant.now().plusSeconds(request.ttlSeconds());
            return new UploadCredential(null, null, Map.of(), new UploadSts(token.getAccessKeyId(),
                token.getSecretAccessKey(), token.getSessionToken(), token.getExpiredTime(), token.getCurrentTime(),
                request.spaceName()), expiresAt);
        } catch (Exception exception) {
            throw upstream(exception);
        }
    }

    @Override
    public UploadCompletion completeUpload(UploadCompletionRequest request) {
        try {
            VodGetMediaInfosResponse response = vodService.getMediaInfos(VodGetMediaInfosRequest.newBuilder()
                .setVids(request.vodVid()).build());
            assertSuccess(response.getResponseMetadata().hasError(),
                response.getResponseMetadata().hasError() ? response.getResponseMetadata().getError().getMessage() : null);
            List<VodMediaInfo> media = response.getResult().getMediaInfoListList();
            if (media.isEmpty() || !request.vodVid().equals(media.get(0).getBasicInfo().getVid())) {
                throw new DalanApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VOD_VIDEO_NOT_FOUND", "点播服务未找到刚上传的视频");
            }
            VodMediaInfo item = media.get(0);
            Long durationMs = item.hasSourceInfo() ? Math.round(item.getSourceInfo().getDuration() * 1000D) : null;
            Integer width = item.hasSourceInfo() && item.getSourceInfo().getWidth() > 0 ? item.getSourceInfo().getWidth() : null;
            Integer height = item.hasSourceInfo() && item.getSourceInfo().getHeight() > 0 ? item.getSourceInfo().getHeight() : null;
            Long size = item.hasSourceInfo() && item.getSourceInfo().getSize() > 0
                ? Math.round(item.getSourceInfo().getSize()) : null;
            return new UploadCompletion(request.vodVid(), null, durationMs, width, height, size);
        } catch (DalanApiException exception) {
            throw exception;
        } catch (Exception exception) {
            throw upstream(exception);
        }
    }

    @Override
    public PlaybackSource getPlaybackSource(String vodVid, int ttlSeconds) {
        try {
            VodGetPlayInfoRequest request = VodGetPlayInfoRequest.newBuilder()
                .setVid(vodVid)
                .setFormat("hls")
                .setSsl("1")
                .build();
            String playAuth = vodService.getPlayAuthToken(request, (long) ttlSeconds);
            VodGetPlayInfoResponse response = vodService.getPlayInfo(request);
            assertSuccess(response.getResponseMetadata().hasError(),
                response.getResponseMetadata().hasError() ? response.getResponseMetadata().getError().getMessage() : null);
            String directUrl = response.getResult().getPlayInfoListList().stream()
                .map(VodPlayInfo::getMainPlayUrl)
                .filter(url -> url != null && !url.isBlank())
                .findFirst()
                .orElse(null);
            if (playAuth == null || playAuth.isBlank()) {
                throw new DalanApiException(HttpStatus.BAD_GATEWAY, "VOD_INVALID_PLAYBACK", "点播服务未返回播放授权");
            }
            return new PlaybackSource(directUrl, Instant.now().plusSeconds(ttlSeconds), vodVid, playAuth);
        } catch (DalanApiException exception) {
            throw exception;
        } catch (Exception exception) {
            throw upstream(exception);
        }
    }

    @Override
    public CallbackEvent verifyAndParseCallback(String payload, Map<String, String> headers) {
        verifyCallbackSignature(payload, headers);
        Map<String, Object> root = parseCallbackPayload(payload);
        Map<String, Object> data = map(first(root, "Data", "data"));
        Map<String, Object> sourceInfo = map(first(data, "SourceInfo", "sourceInfo"));
        String type = string(first(root, "EventType", "Event", "EventName", "Type"));
        String status = callbackStatus(type, string(first(data, "Status", "status")));
        return new CallbackEvent(string(first(root, "EventId", "EventID", "RequestId")),
            string(first(data, "SpaceName", "spaceName")), string(first(data, "Vid", "vid")), type, status,
            string(first(data, "PosterUrl", "posterUrl")), durationMillis(first(sourceInfo, "Duration", "duration")),
            integer(first(sourceInfo, "Width", "width")), integer(first(sourceInfo, "Height", "height")),
            longValue(first(sourceInfo, "Size", "size")), string(first(data, "ErrorMessage", "Message", "errorMessage")));
    }

    private void verifyCallbackSignature(String payload, Map<String, String> headers) {
        if (blank(properties.getCallbackUrl()) || blank(properties.getCallbackPrivateKey())) {
            throw new DalanApiException(HttpStatus.SERVICE_UNAVAILABLE, "VOD_CALLBACK_NOT_CONFIGURED", "VOD 回调验签尚未配置");
        }
        String timestamp = header(headers, "X-VOD-TIMESTAMP");
        String signature = header(headers, "X-VOD-SIGNATURE");
        if (blank(timestamp) || blank(signature)) {
            throw new DalanApiException(HttpStatus.UNAUTHORIZED, "INVALID_VOD_CALLBACK", "VOD 回调缺少签名");
        }
        long callbackTime;
        try {
            callbackTime = Long.parseLong(timestamp);
        } catch (NumberFormatException exception) {
            throw new DalanApiException(HttpStatus.UNAUTHORIZED, "INVALID_VOD_CALLBACK", "VOD 回调时间戳无效");
        }
        if (Math.abs(Instant.now().getEpochSecond() - callbackTime) > properties.getCallbackMaxAgeSeconds()) {
            throw new DalanApiException(HttpStatus.UNAUTHORIZED, "EXPIRED_VOD_CALLBACK", "VOD 回调已过期");
        }
        String encodedPayload = Base64.getEncoder().encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        if (!matchesSignature(signature, timestamp, encodedPayload, properties.getCallbackPrivateKey())
            && !matchesSignature(signature, timestamp, encodedPayload, properties.getPreviousCallbackPrivateKey())) {
            throw new DalanApiException(HttpStatus.UNAUTHORIZED, "INVALID_VOD_CALLBACK", "VOD 回调签名无效");
        }
    }

    private Map<String, Object> parseCallbackPayload(String payload) {
        try {
            return CALLBACK_OBJECT_MAPPER.readValue(payload, new TypeReference<>() { });
        } catch (JsonProcessingException exception) {
            throw new DalanApiException(HttpStatus.BAD_REQUEST, "INVALID_VOD_CALLBACK", "VOD 回调内容无效");
        }
    }

    private boolean matchesSignature(String signature, String timestamp, String encodedPayload, String secret) {
        if (blank(secret)) return false;
        String source = properties.getCallbackUrl() + "|" + timestamp + "|" + secret + "|" + encodedPayload;
        byte[] expected = DigestUtil.md5Hex(source).getBytes(StandardCharsets.US_ASCII);
        return MessageDigest.isEqual(expected, signature.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.US_ASCII));
    }

    private void assertSuccess(boolean error, String message) {
        if (error) {
            throw new DalanApiException(HttpStatus.BAD_GATEWAY, "VOD_UPSTREAM_ERROR", "点播服务请求失败" + (blank(message) ? "" : "：" + message));
        }
    }

    private DalanApiException upstream(Exception exception) {
        return new DalanApiException(HttpStatus.BAD_GATEWAY, "VOD_UPSTREAM_ERROR", "点播服务请求失败");
    }

    private String callbackStatus(String eventType, String providerStatus) {
        String value = (eventType + " " + providerStatus).toLowerCase(Locale.ROOT);
        if (value.contains("fail") || value.contains("error") || value.contains("reject")) return "failed";
        if (value.contains("uploadgetmetacomplete")) return "processing";
        if (value.contains("fileuploadcomplete")) return "uploaded";
        if (value.contains("workflow") || value.contains("transcode") || value.contains("success") || value.contains("complete")) return "ready";
        return null;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> map(Object value) {
        return value instanceof Map<?, ?> ? (Map<String, Object>) value : Map.of();
    }

    private Object first(Map<String, Object> values, String... names) {
        for (String name : names) {
            if (values.containsKey(name)) return values.get(name);
        }
        return null;
    }

    private String header(Map<String, String> headers, String name) {
        return headers.entrySet().stream().filter(entry -> name.equalsIgnoreCase(entry.getKey()))
            .map(Map.Entry::getValue).findFirst().orElse(null);
    }

    private String string(Object value) { return value == null ? null : String.valueOf(value); }
    private Integer integer(Object value) {
        return value instanceof Number number ? number.intValue() : parseInteger(string(value));
    }
    private Integer parseInteger(String value) {
        try { return blank(value) ? null : Integer.valueOf(value); } catch (NumberFormatException ignored) { return null; }
    }
    private Long longValue(Object value) {
        return value instanceof Number number ? number.longValue() : parseLong(string(value));
    }
    private Long durationMillis(Object value) {
        if (value instanceof Number number) return Math.round(number.doubleValue() * 1000D);
        try { return blank(string(value)) ? null : Math.round(Double.parseDouble(string(value)) * 1000D); }
        catch (NumberFormatException ignored) { return null; }
    }
    private Long parseLong(String value) {
        try { return blank(value) ? null : Long.valueOf(value); } catch (NumberFormatException ignored) { return null; }
    }
    private boolean blank(String value) { return value == null || value.isBlank(); }
}
