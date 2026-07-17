package org.dromara.system.controller.dalanbook.v1;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class DalanbookDtos {
    private DalanbookDtos() {
    }

    public record Category(String id, String name, String type) {}
    public record CategoriesResponse(List<Category> categories, String defaultId) {}
    public record Cover(String url, String ratio, String blurhash) {}
    public record CircleBrief(String id, String name) {}
    public record Author(String id, String name, String avatarUrl, String avatarColor) {}
    public record Useful(long count, boolean liked) {}
    public record FeedItem(String id, Cover cover, String tag, String title, CircleBrief circle,
                           Author author, Useful useful, Instant createdAt, VideoBrief video) {}
    public record FeedResponse(List<FeedItem> items, String nextCursor, boolean hasMore) {}

    public record CircleRecommendation(String id, String name, String desc, String membersText,
                                       long memberCount, boolean joined) {}
    public record CircleRecommendResponse(CircleRecommendation circle, int insertAfterIndex) {}
    public record Shortcut(String id, String label, String icon, String href, Integer badge) {}
    public record MyCircle(String id, String name, String avatarUrl, long unread) {}
    public record LeftNavResponse(List<Shortcut> shortcuts, List<MyCircle> myCircles) {}
    public record Suggestion(String type, String id, String text) {}
    public record SuggestionsResponse(List<Suggestion> suggestions) {}

    public record UserDto(String id, String nickname, String avatar, String bio, String gender,
                          String location, long followerCount, long followingCount, long postCount,
                          boolean isFollowing, Instant createdAt) {}
    public record FollowRequest(@NotNull Boolean following) {}
    public record MeSummary(UserDto user, long unreadCount) {}
    public record DeviceDto(String deviceType, String brand, String model, String os, String osVersion,
                            String browser, String browserVersion, Instant lastSeenAt) {}
    public record MyProfileDto(String id, String nickname, String avatar, String bio, String gender,
                               String ageRange, String provinceCode, String provinceName,
                               String cityCode, String cityName, String location, DeviceDto latestDevice) {}
    public record UpdateProfileRequest(
        @NotBlank @Size(max = 30) String nickname,
        @Size(max = 300) String bio,
        @NotBlank @Size(max = 20) String gender,
        @NotBlank @Size(max = 20) String ageRange,
        @Size(max = 20) String provinceCode,
        @Size(max = 40) String provinceName,
        @Size(max = 20) String cityCode,
        @Size(max = 40) String cityName
    ) {}
    public record DeviceReportRequest(
        @NotBlank @Size(max = 100) String deviceId,
        @Size(max = 20) String source,
        @Size(max = 20) String deviceType,
        @Size(max = 60) String brand,
        @Size(max = 120) String model,
        @Size(max = 40) String os,
        @Size(max = 40) String osVersion,
        @Size(max = 40) String browser,
        @Size(max = 40) String browserVersion,
        @Min(0) @Max(20000) Integer screenWidth,
        @Min(0) @Max(20000) Integer screenHeight,
        @Min(0) @Max(20) Double pixelRatio,
        @Size(max = 30) String language,
        @Size(max = 80) String timezone
    ) {}

    public record ImageDto(String ossId, @NotBlank String url, @NotBlank String ratio) {}
    public record ImageInput(@NotBlank @Pattern(regexp = "^[0-9]+$") String ossId,
                             @NotBlank String ratio) {}
    public record VideoBrief(String assetId, String status, String posterUrl, Long durationMs,
                             Integer width, Integer height) {}
    public record VideoAssetDto(String id, String status, String posterUrl, Long durationMs,
                                Integer width, Integer height, String failureReason,
                                Instant createdAt, Instant updatedAt) {}
    public record VideoUploadCredentialRequest(
        @NotBlank @Size(max = 255) String fileName,
        @NotBlank @Size(max = 100) String contentType,
        @NotNull @Min(1) Long size
    ) {}
    public record VideoUploadCredentialResponse(String assetId, String uploadUrl, String uploadMethod,
                                                Map<String, String> uploadHeaders, Instant expiresAt,
                                                Long applicationId, String spaceName, String workflowTemplateId,
                                                VideoUploadSts uploadSts) {}
    public record VideoUploadSts(String accessKeyId, String secretAccessKey, String sessionToken,
                                 String expiredTime, String currentTime, String spaceName) {}
    public record VideoUploadCompleteRequest(@NotBlank @Size(max = 128) String vid) {}
    public record VideoPlaybackResponse(String url, Instant expiresAt, String posterUrl, Long durationMs,
                                        String vid, String playAuth) {}
    public record PostDto(String id, String title, String content, List<ImageDto> images, String cover,
                          String ratio, String tag, List<TopicDto> topics, CircleBrief circle, Author author, long usefulCount,
                          long likeCount, long commentCount, long favoriteCount, boolean isUseful,
                          boolean isLiked, boolean isFavorited, Instant createdAt, VideoBrief video) {}
    public record CursorPage<T>(List<T> items, String nextCursor, boolean hasMore) {}

    public record CreatePostRequest(
        @NotBlank @Size(max = 120) String title,
        @NotBlank @Size(max = 10000) String content,
        @NotBlank String circleId,
        @Size(max = 9) List<@Valid ImageInput> images,
        @Pattern(regexp = "^$|^[A-Za-z0-9_-]{1,64}$") String videoAssetId,
        @NotBlank String tag,
        @NotBlank String ratio,
        @Size(max = 5) List<@NotBlank @Size(max = 20) String> topics,
        String visibility
    ) {}

    public record CreateCircleRequest(
        @NotBlank @Size(max = 80) String name,
        @NotBlank @Size(max = 500) String cover,
        @NotBlank @Size(max = 300) String desc,
        @NotBlank @Size(max = 40) String category,
        @Size(max = 10) List<@NotBlank @Size(max = 20) String> tags
    ) {}

    public record CircleDto(String id, String name, String cover, String desc, String category,
                            List<String> tags, long memberCount, long postCount, boolean isJoined,
                            boolean isOwner, String ownerId, Instant createdAt) {}

    public record TopicDto(String id, String slug, String name, String description, long postCount,
                           Instant createdAt) {}
    public record TopicDetailDto(TopicDto topic, CursorPage<FeedItem> posts) {}

    public record UsefulRequest(@NotNull Boolean liked) {}
    public record UsefulResponse(long count, boolean liked) {}
    public record ReactionRequest(@NotNull Boolean active) {}
    public record ReactionResponse(String type, long count, boolean active) {}

    public record CommentDto(String id, String parentId, Author author, String content, boolean deleted,
                             boolean isMine, Instant createdAt, List<CommentDto> replies) {}
    public record CommentPage(List<CommentDto> items, String nextCursor, boolean hasMore) {}
    public record CreateCommentRequest(@NotBlank @Size(max = 1000) String content, String parentId) {}

    public record ImpressionItem(@NotBlank String postId, String categoryId, @NotNull Instant occurredAt) {}
    public record ImpressionRequest(@NotEmpty @Size(max = 100) List<@Valid ImpressionItem> items,
                                    @Size(max = 64) String anonymousId) {}
    public record AcceptedResponse(int accepted) {}

    public record NotificationDto(String id, String type, Map<String, Object> payload,
                                  Instant readAt, Instant createdAt) {}
    public record UnreadCountResponse(long count) {}
    public record UploadResponse(String url, String ossId, String contentType, long size) {}
}
