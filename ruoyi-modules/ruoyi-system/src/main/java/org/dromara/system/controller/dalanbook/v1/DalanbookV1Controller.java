package org.dromara.system.controller.dalanbook.v1;

import cn.dev33.satoken.annotation.SaIgnore;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.dromara.common.ratelimiter.annotation.RateLimiter;
import org.dromara.system.controller.dalanbook.v1.DalanbookDtos.*;
import org.dromara.system.domain.vo.SysOssVo;
import org.dromara.system.service.ISysOssService;
import org.dromara.system.service.dalanbook.DalanHomePlacementService;
import org.dromara.system.service.dalanbook.DalanbookApiService;
import org.dromara.system.service.dalanbook.moderation.ContentModerationGateway;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.Set;

@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1")
public class DalanbookV1Controller {
    private static final long MAX_IMAGE_SIZE = 10L * 1024 * 1024;
    private static final Set<String> IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/webp", "image/gif");

    private final DalanbookApiService service;
    private final DalanHomePlacementService homePlacementService;
    private final ISysOssService ossService;
    private final ContentModerationGateway contentModerationGateway;

    @SaIgnore
    @GetMapping("/home/categories")
    public CategoriesResponse categories() {
        return service.categories();
    }

    @SaIgnore
    @GetMapping("/home/feed")
    public FeedResponse feed(@RequestParam(defaultValue = "recommend") String categoryId,
                             @RequestParam(defaultValue = "recommend") String channel,
                             @RequestParam(required = false) String cursor,
                             @RequestParam(defaultValue = "20") @Min(1) @Max(40) int limit) {
        return service.feed(categoryId, channel, cursor, limit);
    }

    @SaIgnore
    @GetMapping("/home/placements")
    public HomePlacementsResponse homePlacements() {
        return homePlacementService.activePlacements();
    }

    @SaIgnore
    @GetMapping("/home/circle-recommend")
    public CircleRecommendResponse circleRecommend(@RequestParam(required = false) String categoryId) {
        return service.circleRecommend(categoryId);
    }

    @SaIgnore
    @GetMapping("/home/left-nav")
    public LeftNavResponse leftNav() {
        return service.leftNav();
    }

    @SaIgnore
    @GetMapping("/search/suggest")
    public SuggestionsResponse searchSuggest(@RequestParam(defaultValue = "") String q) {
        return service.suggestions(q);
    }

    @SaIgnore
    @GetMapping("/search/posts")
    public FeedResponse searchPosts(@RequestParam @NotBlank @Size(max = 100) String q,
                                    @RequestParam(required = false) String cursor,
                                    @RequestParam(defaultValue = "20") @Min(1) @Max(40) int limit) {
        return service.searchPosts(q, cursor, limit);
    }

    @SaIgnore
    @GetMapping("/search/circles")
    public CursorPage<CircleDto> searchCircles(@RequestParam @NotBlank @Size(max = 100) String q,
                                                @RequestParam(required = false) String category,
                                                @RequestParam(required = false) String cursor,
                                                @RequestParam(defaultValue = "20") @Min(1) @Max(50) int limit) {
        return service.searchCircles(q, category, cursor, limit);
    }

    @GetMapping("/me/summary")
    public MeSummary meSummary() {
        return service.meSummary();
    }

    @GetMapping("/me/profile")
    public MyProfileDto myProfile() {
        return service.myProfile();
    }

    @PutMapping("/me/profile")
    public MyProfileDto updateMyProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return service.updateMyProfile(request);
    }

    @PostMapping("/me/device")
    public DeviceDto reportDevice(@Valid @RequestBody DeviceReportRequest request) {
        return service.reportDevice(request);
    }

    @GetMapping("/auth/me")
    public UserDto authMe() {
        return service.meSummary().user();
    }

    @SaIgnore
    @GetMapping("/users/{id}")
    public UserDto user(@PathVariable Long id) {
        return service.user(id);
    }

    @PutMapping("/users/{id}/follow")
    public UserDto follow(@PathVariable Long id, @Valid @RequestBody FollowRequest request) {
        return service.setFollowing(id, request.following());
    }

    @SaIgnore
    @GetMapping("/users/{id}/followers")
    public CursorPage<UserDto> followers(@PathVariable Long id,
                                         @RequestParam(required = false) String cursor,
                                         @RequestParam(defaultValue = "20") @Min(1) @Max(50) int limit) {
        return service.userFollowers(id, cursor, limit);
    }

    @SaIgnore
    @GetMapping("/users/{id}/following")
    public CursorPage<UserDto> following(@PathVariable Long id,
                                         @RequestParam(required = false) String cursor,
                                         @RequestParam(defaultValue = "20") @Min(1) @Max(50) int limit) {
        return service.userFollowing(id, cursor, limit);
    }

    @SaIgnore
    @GetMapping("/users/{id}/posts")
    public FeedResponse userPosts(@PathVariable Long id,
                                  @RequestParam(required = false) String cursor,
                                  @RequestParam(defaultValue = "20") @Min(1) @Max(40) int limit) {
        return service.userPosts(id, cursor, limit);
    }

    @GetMapping("/me/posts")
    public FeedResponse myPosts(@RequestParam(defaultValue = "published") String type,
                                @RequestParam(required = false) String cursor,
                                @RequestParam(defaultValue = "20") @Min(1) @Max(40) int limit) {
        return service.myPosts(type, cursor, limit);
    }

    @SaIgnore
    @GetMapping("/circles")
    public CursorPage<CircleDto> circles(@RequestParam(required = false) String category,
                                         @RequestParam(required = false) String cursor,
                                         @RequestParam(defaultValue = "20") @Min(1) @Max(50) int limit) {
        return service.circles(category, cursor, limit);
    }

    @GetMapping("/circles/mine")
    public List<CircleDto> myCircles(@RequestParam(defaultValue = "false") boolean ownedOnly) {
        return service.myCircles(ownedOnly);
    }

    @SaIgnore
    @GetMapping("/circles/{id}")
    public CircleDto circle(@PathVariable String id) {
        return service.circle(id);
    }

    @SaIgnore
    @GetMapping("/circles/{id}/pinned-items")
    public CirclePinnedItemsResponse circlePinnedItems(@PathVariable String id) {
        return service.circlePinnedItems(id);
    }

    @SaIgnore
    @GetMapping("/circles/{id}/posts")
    public FeedResponse circlePosts(@PathVariable String id,
                                    @RequestParam(required = false) String cursor,
                                    @RequestParam(defaultValue = "20") @Min(1) @Max(40) int limit) {
        return service.circlePosts(id, cursor, limit);
    }

    @PostMapping("/circles")
    public ResponseEntity<CircleDto> createCircle(@Valid @RequestBody CreateCircleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createCircle(request));
    }

    @SaIgnore
    @GetMapping("/topics")
    public List<TopicDto> topics(@RequestParam(required = false) String keyword,
                                 @RequestParam(defaultValue = "20") @Min(1) @Max(50) int limit) {
        return service.topics(keyword, limit);
    }

    @SaIgnore
    @GetMapping("/topics/{slug}")
    public TopicDetailDto topic(@PathVariable String slug,
                                @RequestParam(required = false) String cursor,
                                @RequestParam(defaultValue = "20") @Min(1) @Max(40) int limit) {
        return service.topic(slug, cursor, limit);
    }

    @PutMapping("/circles/{id}/membership")
    public CircleDto membership(@PathVariable String id, @RequestBody Map<String, Boolean> body) {
        if (!body.containsKey("joined")) {
            throw new DalanApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_FAILED", "joined 不能为空");
        }
        return service.setJoined(id, Boolean.TRUE.equals(body.get("joined")));
    }

    @SaIgnore
    @GetMapping("/posts/{id}")
    public PostDto post(@PathVariable String id) {
        return service.post(id);
    }

    @RateLimiter(key = "T(org.dromara.common.satoken.utils.LoginHelper).getUserId()", time = 3600, count = 10)
    @PostMapping("/posts")
    public ResponseEntity<PostDto> createPost(@Valid @RequestBody CreatePostRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createPost(request));
    }

    @RateLimiter(key = "T(org.dromara.common.satoken.utils.LoginHelper).getUserId()", time = 3600, count = 10)
    @PostMapping("/media/videos/upload-credentials")
    public ResponseEntity<VideoUploadCredentialResponse> videoUploadCredentials(
        @Valid @RequestBody VideoUploadCredentialRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createVideoUploadCredential(request));
    }

    @GetMapping("/media/videos/{id}")
    public VideoAssetDto videoAsset(@PathVariable String id) {
        return service.videoAsset(id);
    }

    @PostMapping("/media/videos/{id}/complete")
    public VideoAssetDto completeVideoUpload(@PathVariable String id,
                                              @Valid @RequestBody VideoUploadCompleteRequest request) {
        return service.completeVideoUpload(id, request);
    }

    @SaIgnore
    @GetMapping("/posts/{id}/video-playback")
    public VideoPlaybackResponse videoPlayback(@PathVariable String id) {
        return service.videoPlayback(id);
    }

    @RateLimiter(key = "T(org.dromara.common.satoken.utils.LoginHelper).getUserId()", time = 60, count = 120)
    @PostMapping("/posts/{id}/useful")
    public UsefulResponse useful(@PathVariable String id, @Valid @RequestBody UsefulRequest request) {
        return service.useful(id, request.liked());
    }

    @RateLimiter(key = "T(org.dromara.common.satoken.utils.LoginHelper).getUserId()", time = 60, count = 120)
    @PostMapping("/posts/{id}/reactions/{type}")
    public ReactionResponse reaction(@PathVariable String id, @PathVariable String type,
                                     @Valid @RequestBody ReactionRequest request) {
        return service.reaction(id, type, request.active());
    }

    @SaIgnore
    @GetMapping("/posts/{id}/comments")
    public CommentPage comments(@PathVariable String id, @RequestParam(required = false) String cursor,
                                @RequestParam(defaultValue = "20") @Min(1) @Max(50) int limit) {
        return service.comments(id, cursor, limit);
    }

    @RateLimiter(key = "T(org.dromara.common.satoken.utils.LoginHelper).getUserId()", time = 60, count = 30)
    @PostMapping("/posts/{id}/comments")
    public ResponseEntity<CommentDto> createComment(@PathVariable String id,
                                                     @Valid @RequestBody CreateCommentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createComment(id, request));
    }

    @DeleteMapping("/comments/{id}")
    public Map<String, Boolean> deleteComment(@PathVariable String id) {
        service.deleteComment(id);
        return Map.of("deleted", true);
    }

    @SaIgnore
    @PostMapping("/events/impression")
    public AcceptedResponse impression(@Valid @RequestBody ImpressionRequest request) {
        return service.impressions(request);
    }

    @GetMapping("/notifications/unread-count")
    public UnreadCountResponse unreadCount() {
        return service.unread();
    }

    @GetMapping("/notifications")
    public CursorPage<NotificationDto> notifications(@RequestParam(required = false) String cursor,
                                                      @RequestParam(defaultValue = "20") @Min(1) @Max(50) int limit) {
        return service.notifications(cursor, limit);
    }

    @PutMapping("/notifications/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable String id) {
        service.markNotificationRead(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/uploads", consumes = "multipart/form-data")
    public ResponseEntity<UploadResponse> upload(@RequestPart("file") @NotNull MultipartFile file) {
        if (file.isEmpty()) {
            throw new DalanApiException(HttpStatus.UNPROCESSABLE_ENTITY, "EMPTY_FILE", "上传文件不能为空");
        }
        if (file.getSize() > MAX_IMAGE_SIZE) {
            throw new DalanApiException(HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE", "图片不能超过 10MB");
        }
        if (!IMAGE_TYPES.contains(file.getContentType())) {
            throw new DalanApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_FILE_TYPE", "仅支持 JPEG、PNG、WebP、GIF 图片");
        }
        SysOssVo oss = ossService.upload(file);
        try {
            contentModerationGateway.checkImage(oss.getUrl(), "upload-" + oss.getOssId());
        } catch (RuntimeException exception) {
            ossService.deleteWithValidByIds(List.of(oss.getOssId()), false);
            throw exception;
        }
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(new UploadResponse(oss.getUrl(), String.valueOf(oss.getOssId()), file.getContentType(), file.getSize()));
    }
}
