package org.dromara.system.service.dalanbook.vod;

import java.time.Instant;
import java.util.Map;

/**
 * Isolates the VOD vendor SDK from the community domain. The concrete gateway is
 * added after the VOD space and the provider SDK/API version have been confirmed.
 */
public interface VolcengineVodGateway {

    UploadCredential createUploadCredential(UploadRequest request);

    UploadCompletion completeUpload(UploadCompletionRequest request);

    PlaybackSource getPlaybackSource(String vodVid, int ttlSeconds);

    CallbackEvent verifyAndParseCallback(String payload, Map<String, String> headers);

    record UploadRequest(String fileName, String contentType, long size, String spaceName,
                         String workflowId, String snapshotTemplateId, int ttlSeconds) {
    }

    record UploadCredential(String uploadUrl, String uploadMethod, Map<String, String> uploadHeaders,
                            UploadSts uploadSts, Instant expiresAt) {
    }

    record UploadSts(String accessKeyId, String secretAccessKey, String sessionToken,
                     String expiredTime, String currentTime, String spaceName) {
    }

    record UploadCompletionRequest(String vodVid) {
    }

    record UploadCompletion(String vodVid, String posterUrl, Long durationMs, Integer width,
                            Integer height, Long size) {
    }

    record PlaybackSource(String url, Instant expiresAt, String vid, String playAuth) {
    }

    record CallbackEvent(String eventId, String spaceName, String vodVid, String type,
                         String status, String posterUrl, Long durationMs, Integer width,
                         Integer height, Long size, String failureReason) {
    }
}
