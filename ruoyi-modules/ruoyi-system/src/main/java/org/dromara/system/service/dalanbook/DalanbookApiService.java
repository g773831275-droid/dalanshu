package org.dromara.system.service.dalanbook;

import cn.hutool.crypto.digest.DigestUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.dromara.common.json.utils.JsonUtils;
import org.dromara.common.satoken.utils.LoginHelper;
import org.dromara.system.controller.dalanbook.v1.DalanApiException;
import org.dromara.system.controller.dalanbook.v1.DalanbookDtos.*;
import org.dromara.system.domain.SysUser;
import org.dromara.system.domain.dalanbook.v1.*;
import org.dromara.system.domain.vo.SysOssVo;
import org.dromara.system.mapper.SysUserMapper;
import org.dromara.system.mapper.dalanbook.v1.*;
import org.dromara.system.service.ISysOssService;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DalanbookApiService {
    private static final Set<String> TAGS = Set.of("经验", "提问", "测评", "复盘", "大神分享", "清单");
    private static final Set<String> RATIOS = Set.of("1/1", "4/5", "3/4", "4/3", "16/9");
    private static final Set<String> AGE_RANGES = Set.of("unknown", "under18", "18-24", "25-29", "30-34", "35-39", "40-49", "50plus");
    private static final Set<String> GENDERS = Set.of("unknown", "male", "female", "other");
    private static final List<Category> CATEGORIES = List.of(
        new Category("recommend", "推荐", "system"),
        new Category("career", "职场成长", "topic"),
        new Category("ai", "AI 工具", "topic"),
        new Category("fitness", "健身运动", "topic"),
        new Category("digital", "数码装备", "topic"),
        new Category("lifestyle", "男士生活", "topic"),
        new Category("outdoor", "户外兴趣", "topic"),
        new Category("reading", "阅读写作", "topic"),
        new Category("more", "更多", "system")
    );
    private static final Map<String, String> CATEGORY_NAMES = Map.of(
        "career", "职场成长", "ai", "AI 工具", "fitness", "健身运动", "digital", "数码装备",
        "lifestyle", "男士生活", "outdoor", "户外兴趣", "reading", "阅读写作"
    );

    private final DalanCircleV1Mapper circleMapper;
    private final DalanCircleMemberMapper memberMapper;
    private final DalanPostV1Mapper postMapper;
    private final DalanPostStatsMapper statsMapper;
    private final DalanPostReactionMapper reactionMapper;
    private final DalanTopicMapper topicMapper;
    private final DalanPostTopicMapper postTopicMapper;
    private final DalanUserProfileMapper profileMapper;
    private final DalanUserDeviceMapper deviceMapper;
    private final DalanFollowMapper followMapper;
    private final DalanNotificationMapper notificationMapper;
    private final DalanImpressionMapper impressionMapper;
    private final SysUserMapper userMapper;
    private final ISysOssService ossService;

    public CategoriesResponse categories() {
        return new CategoriesResponse(CATEGORIES, "recommend");
    }

    public FeedResponse feed(String categoryId, String cursor, int requestedLimit) {
        int limit = normalizeLimit(requestedLimit, 40);
        CursorValue cursorValue = decodeCursor(cursor);
        Set<String> circleIds = categoryCircleIds(categoryId);
        if (circleIds.isEmpty() && !isSystemCategory(categoryId)) {
            return new FeedResponse(List.of(), null, false);
        }

        LambdaQueryWrapper<DalanPostV1> query = new LambdaQueryWrapper<DalanPostV1>()
            .eq(DalanPostV1::getStatus, "published")
            .eq(DalanPostV1::getVisibility, "public")
            .in(!circleIds.isEmpty(), DalanPostV1::getCircleId, circleIds)
            .and(cursorValue != null, wrapper -> wrapper
                .lt(DalanPostV1::getCreatedAt, cursorValue == null ? null : cursorValue.createdAt())
                .or()
                .eq(DalanPostV1::getCreatedAt, cursorValue == null ? null : cursorValue.createdAt())
                .lt(DalanPostV1::getId, cursorValue == null ? null : cursorValue.id()))
            .orderByDesc(DalanPostV1::getCreatedAt)
            .orderByDesc(DalanPostV1::getId)
            .last("LIMIT " + (limit + 1));
        List<DalanPostV1> rows = postMapper.selectList(query);
        boolean hasMore = rows.size() > limit;
        List<DalanPostV1> page = hasMore ? rows.subList(0, limit) : rows;
        FeedContext context = context(page);
        List<FeedItem> items = page.stream().map(post -> toFeedItem(post, context)).toList();
        String nextCursor = hasMore && !page.isEmpty() ? encodeCursor(page.get(page.size() - 1)) : null;
        return new FeedResponse(items, nextCursor, hasMore);
    }

    public CircleRecommendResponse circleRecommend(String categoryId) {
        Set<String> categoryIds = categoryCircleIds(categoryId);
        LambdaQueryWrapper<DalanCircleV1> query = new LambdaQueryWrapper<DalanCircleV1>()
            .eq(DalanCircleV1::getStatus, "published")
            .in(!categoryIds.isEmpty(), DalanCircleV1::getId, categoryIds)
            .orderByDesc(DalanCircleV1::getHomeVisible)
            .orderByDesc(DalanCircleV1::getRecommendWeight)
            .orderByAsc(DalanCircleV1::getSortOrder)
            .orderByDesc(DalanCircleV1::getMemberCount)
            .last("LIMIT 1");
        DalanCircleV1 circle = circleMapper.selectOne(query);
        if (circle == null) {
            return new CircleRecommendResponse(null, 6);
        }
        boolean joined = currentUserId().map(id -> isMember(circle.getId(), id)).orElse(false);
        return new CircleRecommendResponse(new CircleRecommendation(circle.getId(), circle.getName(),
            circle.getDescription(), membersText(nvl(circle.getMemberCount())), nvl(circle.getMemberCount()), joined), 6);
    }

    public LeftNavResponse leftNav() {
        List<Shortcut> shortcuts = new ArrayList<>();
        shortcuts.add(new Shortcut("home", "首页", "home", "/", null));
        shortcuts.add(new Shortcut("publish", "发布", "plus", "/publish", null));
        Optional<Long> userId = currentUserId();
        if (userId.isEmpty()) {
            return new LeftNavResponse(shortcuts, List.of());
        }
        long unread = unreadCount(userId.get());
        shortcuts.add(new Shortcut("message", "消息", "bell", "/messages", (int) Math.min(unread, 99)));
        List<DalanCircleMember> memberships = memberMapper.selectList(new LambdaQueryWrapper<DalanCircleMember>()
            .eq(DalanCircleMember::getUserId, userId.get()).orderByDesc(DalanCircleMember::getJoinedAt).last("LIMIT 20"));
        Map<String, DalanCircleV1> circles = circleMap(memberships.stream().map(DalanCircleMember::getCircleId).toList());
        List<MyCircle> mine = memberships.stream().map(member -> circles.get(member.getCircleId()))
            .filter(Objects::nonNull).map(circle -> new MyCircle(circle.getId(), circle.getName(), circle.getCover(), 0)).toList();
        return new LeftNavResponse(shortcuts, mine);
    }

    public SuggestionsResponse suggestions(String rawQuery) {
        String query = rawQuery == null ? "" : rawQuery.trim();
        if (query.isEmpty()) {
            return new SuggestionsResponse(List.of(
                new Suggestion("hot", null, "AI Agent"),
                new Suggestion("hot", null, "职场复盘"),
                new Suggestion("hot", null, "桌搭")
            ));
        }
        String escaped = query.replace("%", "\\%").replace("_", "\\_");
        List<Suggestion> result = new ArrayList<>();
        result.add(new Suggestion("keyword", null, query));
        circleMapper.selectList(new LambdaQueryWrapper<DalanCircleV1>()
                .eq(DalanCircleV1::getStatus, "published").like(DalanCircleV1::getName, escaped).last("LIMIT 4"))
            .forEach(circle -> result.add(new Suggestion("circle", circle.getId(), circle.getName())));
        postMapper.selectList(new LambdaQueryWrapper<DalanPostV1>()
                .eq(DalanPostV1::getStatus, "published").like(DalanPostV1::getTitle, escaped)
                .orderByDesc(DalanPostV1::getCreatedAt).last("LIMIT 5"))
            .forEach(post -> result.add(new Suggestion("post", post.getId(), post.getTitle())));
        return new SuggestionsResponse(result.stream().limit(10).toList());
    }

    public MeSummary meSummary() {
        Long userId = requireUserId();
        return new MeSummary(user(userId), unreadCount(userId));
    }

    public MyProfileDto myProfile() {
        Long userId = requireUserId();
        ensureProfile(userId);
        SysUser user = userMapper.selectById(userId);
        DalanUserProfile profile = profileMapper.selectById(userId);
        return toMyProfile(user, profile);
    }

    @Transactional(rollbackFor = Exception.class)
    public MyProfileDto updateMyProfile(UpdateProfileRequest request) {
        Long userId = requireUserId();
        if (!AGE_RANGES.contains(request.ageRange())) {
            throw new DalanApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_AGE_RANGE", "年龄段无效");
        }
        if (!GENDERS.contains(request.gender())) {
            throw new DalanApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_GENDER", "性别选项无效");
        }
        ensureProfile(userId);
        DalanUserProfile profile = profileMapper.selectById(userId);
        profile.setBio(clean(request.bio()));
        profile.setGender(request.gender());
        profile.setAgeRange(request.ageRange());
        profile.setProvinceCode(clean(request.provinceCode()));
        profile.setProvinceName(clean(request.provinceName()));
        profile.setCityCode(clean(request.cityCode()));
        profile.setCityName(clean(request.cityName()));
        profile.setLocation(location(profile.getProvinceName(), profile.getCityName()));
        profile.setUpdatedAt(Instant.now());
        profileMapper.updateById(profile);

        SysUser user = userMapper.selectById(userId);
        user.setNickName(request.nickname().trim());
        userMapper.updateById(user);
        return toMyProfile(user, profile);
    }

    @Transactional(rollbackFor = Exception.class)
    public DeviceDto reportDevice(DeviceReportRequest request) {
        Long userId = requireUserId();
        String hash = DigestUtil.sha256Hex(request.deviceId());
        DalanUserDevice device = deviceMapper.selectOne(new LambdaQueryWrapper<DalanUserDevice>()
            .eq(DalanUserDevice::getUserId, userId)
            .eq(DalanUserDevice::getDeviceIdHash, hash)
            .last("LIMIT 1"));
        Instant now = Instant.now();
        if (device == null) {
            device = new DalanUserDevice();
            device.setId("d_" + compactId());
            device.setUserId(userId);
            device.setDeviceIdHash(hash);
            device.setFirstSeenAt(now);
        }
        device.setSource(defaultValue(request.source(), "web"));
        device.setDeviceType(defaultValue(request.deviceType(), "unknown"));
        device.setBrand(clean(request.brand()));
        device.setModel(clean(request.model()));
        device.setOs(clean(request.os()));
        device.setOsVersion(clean(request.osVersion()));
        device.setBrowser(clean(request.browser()));
        device.setBrowserVersion(clean(request.browserVersion()));
        device.setScreenWidth(request.screenWidth());
        device.setScreenHeight(request.screenHeight());
        device.setPixelRatio(request.pixelRatio() == null ? null : BigDecimal.valueOf(request.pixelRatio()));
        device.setLanguage(clean(request.language()));
        device.setTimezone(clean(request.timezone()));
        device.setLastSeenAt(now);
        if (deviceMapper.selectById(device.getId()) == null) {
            deviceMapper.insert(device);
        } else {
            deviceMapper.updateById(device);
        }
        return toDevice(device);
    }

    public UserDto user(Long userId) {
        SysUser user = userMapper.selectById(userId);
        if (user == null || "1".equals(user.getDelFlag())) {
            throw new DalanApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "用户不存在");
        }
        DalanUserProfile profile = profileMapper.selectById(userId);
        boolean following = currentUserId().filter(id -> !id.equals(userId)).map(id -> followMapper.selectCount(
            new LambdaQueryWrapper<DalanFollow>().eq(DalanFollow::getFollowerId, id).eq(DalanFollow::getFolloweeId, userId)) > 0).orElse(false);
        Instant createdAt = user.getCreateTime() == null ? null : user.getCreateTime().toInstant();
        return new UserDto(String.valueOf(userId), user.getNickName(), avatarUrl(user.getAvatar()),
            profile == null ? "" : profile.getBio(), profile == null ? sex(user.getSex()) : profile.getGender(),
            profile == null ? "" : profile.getLocation(), profile == null ? 0 : nvl(profile.getFollowerCount()),
            profile == null ? 0 : nvl(profile.getFollowingCount()), profile == null ? 0 : nvl(profile.getPostCount()),
            following, createdAt);
    }

    public CursorPage<CircleDto> circles(String category, String cursor, int requestedLimit) {
        int limit = normalizeLimit(requestedLimit, 50);
        CursorValue cv = decodeCursor(cursor);
        LambdaQueryWrapper<DalanCircleV1> query = new LambdaQueryWrapper<DalanCircleV1>()
            .eq(DalanCircleV1::getStatus, "published")
            .eq(category != null && !category.isBlank(), DalanCircleV1::getCategory, category)
            .and(cv != null, wrapper -> wrapper.lt(DalanCircleV1::getCreatedAt, cv == null ? null : cv.createdAt())
                .or().eq(DalanCircleV1::getCreatedAt, cv == null ? null : cv.createdAt())
                .lt(DalanCircleV1::getId, cv == null ? null : cv.id()))
            .orderByDesc(DalanCircleV1::getCreatedAt).orderByDesc(DalanCircleV1::getId).last("LIMIT " + (limit + 1));
        List<DalanCircleV1> rows = circleMapper.selectList(query);
        boolean hasMore = rows.size() > limit;
        List<DalanCircleV1> page = hasMore ? rows.subList(0, limit) : rows;
        Set<String> joined = joinedCircleIds();
        Long userId = currentUserId().orElse(null);
        List<CircleDto> items = page.stream().map(c -> toCircle(c, joined, userId)).toList();
        String next = hasMore && !page.isEmpty() ? encodeCursor(page.get(page.size() - 1).getCreatedAt(), page.get(page.size() - 1).getId()) : null;
        return new CursorPage<>(items, next, hasMore);
    }

    public List<CircleDto> myCircles(boolean ownedOnly) {
        Long userId = requireUserId();
        List<DalanCircleV1> circles;
        if (ownedOnly) {
            circles = circleMapper.selectList(new LambdaQueryWrapper<DalanCircleV1>()
                .eq(DalanCircleV1::getOwnerId, userId).ne(DalanCircleV1::getStatus, "deleted")
                .orderByDesc(DalanCircleV1::getCreatedAt));
        } else {
            List<String> ids = memberMapper.selectList(new LambdaQueryWrapper<DalanCircleMember>()
                .eq(DalanCircleMember::getUserId, userId)).stream().map(DalanCircleMember::getCircleId).toList();
            circles = ids.isEmpty() ? List.of() : circleMapper.selectBatchIds(ids);
        }
        Set<String> joined = circles.stream().map(DalanCircleV1::getId).collect(Collectors.toSet());
        return circles.stream().map(c -> toCircle(c, joined, userId)).toList();
    }

    public CircleDto circle(String id) {
        DalanCircleV1 circle = findCircle(id);
        Long userId = currentUserId().orElse(null);
        return toCircle(circle, userId == null ? Set.of() : joinedCircleIds(), userId);
    }

    public FeedResponse circlePosts(String circleId, String cursor, int requestedLimit) {
        findCircle(circleId);
        boolean member = currentUserId().map(userId -> isMember(circleId, userId)).orElse(false);
        return postFeed(new LambdaQueryWrapper<DalanPostV1>().eq(DalanPostV1::getCircleId, circleId)
            .eq(!member, DalanPostV1::getVisibility, "public"), cursor, requestedLimit);
    }

    public List<TopicDto> topics(int requestedLimit) {
        int limit = normalizeLimit(requestedLimit, 50);
        return topicMapper.selectList(new LambdaQueryWrapper<DalanTopic>()
                .eq(DalanTopic::getStatus, "published")
                .orderByDesc(DalanTopic::getPostCount)
                .orderByAsc(DalanTopic::getName)
                .last("LIMIT " + limit))
            .stream().map(this::toTopic).toList();
    }

    public TopicDetailDto topic(String slug, String cursor, int requestedLimit) {
        DalanTopic topic = topicMapper.selectOne(new LambdaQueryWrapper<DalanTopic>()
            .eq(DalanTopic::getSlug, slug).eq(DalanTopic::getStatus, "published").last("LIMIT 1"));
        if (topic == null) {
            throw new DalanApiException(HttpStatus.NOT_FOUND, "TOPIC_NOT_FOUND", "话题不存在");
        }
        List<String> postIds = postTopicMapper.selectList(new LambdaQueryWrapper<DalanPostTopic>()
            .select(DalanPostTopic::getPostId).eq(DalanPostTopic::getTopicId, topic.getId()))
            .stream().map(DalanPostTopic::getPostId).toList();
        FeedResponse feed = postIds.isEmpty()
            ? new FeedResponse(List.of(), null, false)
            : postFeed(new LambdaQueryWrapper<DalanPostV1>().in(DalanPostV1::getId, postIds)
                .eq(DalanPostV1::getVisibility, "public"), cursor, requestedLimit);
        return new TopicDetailDto(toTopic(topic), new CursorPage<>(feed.items(), feed.nextCursor(), feed.hasMore()));
    }

    @Transactional(rollbackFor = Exception.class)
    public CircleDto createCircle(CreateCircleRequest request) {
        Long userId = requireUserId();
        if (circleMapper.selectCount(new LambdaQueryWrapper<DalanCircleV1>().eq(DalanCircleV1::getName, request.name().trim())) > 0) {
            throw new DalanApiException(HttpStatus.CONFLICT, "CIRCLE_NAME_EXISTS", "圈子名称已存在");
        }
        Instant now = Instant.now();
        DalanCircleV1 circle = new DalanCircleV1();
        circle.setId("c_" + compactId());
        circle.setOwnerId(userId);
        circle.setName(request.name().trim());
        circle.setCover(request.cover());
        circle.setDescription(request.desc().trim());
        circle.setCategory(request.category());
        circle.setTags(JsonUtils.toJsonString(request.tags() == null ? List.of() : request.tags()));
        circle.setMemberCount(1L);
        circle.setPostCount(0L);
        circle.setStatus("published");
        circle.setCreatedAt(now);
        circle.setUpdatedAt(now);
        circleMapper.insert(circle);
        DalanCircleMember owner = new DalanCircleMember();
        owner.setCircleId(circle.getId());
        owner.setUserId(userId);
        owner.setRole("owner");
        owner.setJoinedAt(now);
        memberMapper.insert(owner);
        return toCircle(circle, Set.of(circle.getId()), userId);
    }

    @Transactional(rollbackFor = Exception.class)
    public CircleDto setJoined(String circleId, boolean joined) {
        Long userId = requireUserId();
        DalanCircleV1 circle = findCircle(circleId);
        boolean exists = isMember(circleId, userId);
        if (joined && !exists) {
            DalanCircleMember member = new DalanCircleMember();
            member.setCircleId(circleId);
            member.setUserId(userId);
            member.setRole("member");
            member.setJoinedAt(Instant.now());
            memberMapper.insert(member);
            circleMapper.changeMemberCount(circleId, 1);
            circle.setMemberCount(nvl(circle.getMemberCount()) + 1);
        } else if (!joined && exists) {
            if (Objects.equals(circle.getOwnerId(), userId)) {
                throw new DalanApiException(HttpStatus.CONFLICT, "OWNER_CANNOT_LEAVE", "圈主不能退出自己的圈子");
            }
            memberMapper.delete(new LambdaQueryWrapper<DalanCircleMember>()
                .eq(DalanCircleMember::getCircleId, circleId).eq(DalanCircleMember::getUserId, userId));
            circleMapper.changeMemberCount(circleId, -1);
            circle.setMemberCount(Math.max(0, nvl(circle.getMemberCount()) - 1));
        }
        return toCircle(circle, joined ? Set.of(circleId) : Set.of(), userId);
    }

    public PostDto post(String id) {
        DalanPostV1 post = findPost(id);
        return toPost(post, context(List.of(post)));
    }

    @Transactional(rollbackFor = Exception.class)
    public PostDto createPost(CreatePostRequest request) {
        Long userId = requireUserId();
        DalanCircleV1 circle = findCircle(request.circleId());
        if (!isMember(circle.getId(), userId)) {
            throw new DalanApiException(HttpStatus.FORBIDDEN, "CIRCLE_MEMBERSHIP_REQUIRED", "加入圈子后才能发布帖子");
        }
        if (!TAGS.contains(request.tag())) {
            throw new DalanApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_POST_TAG", "帖子标签无效");
        }
        if (!RATIOS.contains(request.ratio()) || request.images().stream().anyMatch(image -> !RATIOS.contains(image.ratio()))) {
            throw new DalanApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_IMAGE_RATIO", "图片比例无效");
        }
        Instant now = Instant.now();
        DalanPostV1 post = new DalanPostV1();
        post.setId("p_" + compactId());
        post.setAuthorId(userId);
        post.setCircleId(circle.getId());
        post.setTitle(request.title().trim());
        post.setContent(request.content().trim());
        post.setImages(JsonUtils.toJsonString(request.images()));
        post.setCover(request.images().get(0).url());
        post.setRatio(request.ratio());
        post.setTag(request.tag());
        post.setVisibility("circle".equals(request.visibility()) ? "circle" : "public");
        post.setStatus("published");
        post.setCreatedAt(now);
        post.setUpdatedAt(now);
        postMapper.insert(post);
        savePostTopics(post.getId(), request.topics(), now);
        DalanPostStats stats = new DalanPostStats();
        stats.setPostId(post.getId());
        stats.setUsefulCount(0L);
        stats.setLikeCount(0L);
        stats.setCommentCount(0L);
        stats.setFavoriteCount(0L);
        stats.setUpdatedAt(now);
        statsMapper.insert(stats);
        circleMapper.changePostCount(circle.getId(), 1);
        ensureProfile(userId);
        DalanUserProfile profile = profileMapper.selectById(userId);
        profile.setPostCount(nvl(profile.getPostCount()) + 1);
        profile.setUpdatedAt(now);
        profileMapper.updateById(profile);
        return toPost(post, context(List.of(post)));
    }

    @Transactional(rollbackFor = Exception.class)
    public UsefulResponse useful(String postId, boolean liked) {
        Long userId = requireUserId();
        findPost(postId);
        LambdaQueryWrapper<DalanPostReaction> key = new LambdaQueryWrapper<DalanPostReaction>()
            .eq(DalanPostReaction::getPostId, postId).eq(DalanPostReaction::getUserId, userId)
            .eq(DalanPostReaction::getType, "useful");
        boolean exists = reactionMapper.selectCount(key) > 0;
        if (liked && !exists) {
            DalanPostReaction reaction = new DalanPostReaction();
            reaction.setPostId(postId);
            reaction.setUserId(userId);
            reaction.setType("useful");
            reaction.setCreatedAt(Instant.now());
            try {
                reactionMapper.insert(reaction);
                statsMapper.changeUseful(postId, 1);
            } catch (DuplicateKeyException ignored) {
                // A retry raced with the first request; the desired state is already present.
            }
        } else if (!liked && exists) {
            if (reactionMapper.delete(key) > 0) {
                statsMapper.changeUseful(postId, -1);
            }
        }
        DalanPostStats stats = statsMapper.selectById(postId);
        boolean actual = reactionMapper.selectCount(new LambdaQueryWrapper<DalanPostReaction>()
            .eq(DalanPostReaction::getPostId, postId).eq(DalanPostReaction::getUserId, userId)
            .eq(DalanPostReaction::getType, "useful")) > 0;
        return new UsefulResponse(stats == null ? 0 : nvl(stats.getUsefulCount()), actual);
    }

    @Transactional(rollbackFor = Exception.class)
    public AcceptedResponse impressions(ImpressionRequest request) {
        Long userId = currentUserId().orElse(null);
        Instant now = Instant.now();
        for (ImpressionItem item : request.items()) {
            DalanImpression impression = new DalanImpression();
            impression.setUserId(userId);
            impression.setAnonymousId(userId == null ? request.anonymousId() : null);
            impression.setPostId(item.postId());
            impression.setCategoryId(item.categoryId());
            impression.setOccurredAt(item.occurredAt());
            impression.setCreatedAt(now);
            impressionMapper.insert(impression);
        }
        return new AcceptedResponse(request.items().size());
    }

    public UnreadCountResponse unread() {
        return new UnreadCountResponse(unreadCount(requireUserId()));
    }

    public CursorPage<NotificationDto> notifications(String cursor, int requestedLimit) {
        Long userId = requireUserId();
        int limit = normalizeLimit(requestedLimit, 50);
        CursorValue cv = decodeCursor(cursor);
        LambdaQueryWrapper<DalanNotification> query = new LambdaQueryWrapper<DalanNotification>()
            .eq(DalanNotification::getUserId, userId)
            .and(cv != null, wrapper -> wrapper.lt(DalanNotification::getCreatedAt, cv == null ? null : cv.createdAt())
                .or().eq(DalanNotification::getCreatedAt, cv == null ? null : cv.createdAt())
                .lt(DalanNotification::getId, cv == null ? null : cv.id()))
            .orderByDesc(DalanNotification::getCreatedAt).orderByDesc(DalanNotification::getId)
            .last("LIMIT " + (limit + 1));
        List<DalanNotification> rows = notificationMapper.selectList(query);
        boolean more = rows.size() > limit;
        List<DalanNotification> page = more ? rows.subList(0, limit) : rows;
        List<NotificationDto> items = page.stream().map(n -> new NotificationDto(n.getId(), n.getType(),
            Optional.ofNullable(JsonUtils.parseMap(n.getPayload())).map(HashMap::new).orElseGet(HashMap::new),
            n.getReadAt(), n.getCreatedAt())).toList();
        String next = more && !page.isEmpty() ? encodeCursor(page.get(page.size() - 1).getCreatedAt(), page.get(page.size() - 1).getId()) : null;
        return new CursorPage<>(items, next, more);
    }

    @Transactional(rollbackFor = Exception.class)
    public void markNotificationRead(String id) {
        Long userId = requireUserId();
        DalanNotification notification = notificationMapper.selectById(id);
        if (notification == null || !Objects.equals(notification.getUserId(), userId)) {
            throw new DalanApiException(HttpStatus.NOT_FOUND, "NOTIFICATION_NOT_FOUND", "通知不存在");
        }
        if (notification.getReadAt() == null) {
            notification.setReadAt(Instant.now());
            notificationMapper.updateById(notification);
        }
    }

    public String uploadedUrl(Long ossId) {
        SysOssVo oss = ossService.getById(ossId);
        return oss == null ? null : oss.getUrl();
    }

    private FeedContext context(List<DalanPostV1> posts) {
        if (posts.isEmpty()) return new FeedContext(Map.of(), Map.of(), Map.of(), Set.of(), Set.of(), Set.of());
        Set<String> circleIds = posts.stream().map(DalanPostV1::getCircleId).collect(Collectors.toSet());
        Set<Long> authorIds = posts.stream().map(DalanPostV1::getAuthorId).collect(Collectors.toSet());
        Set<String> postIds = posts.stream().map(DalanPostV1::getId).collect(Collectors.toSet());
        Map<String, DalanCircleV1> circles = circleMap(circleIds);
        Map<Long, SysUser> users = userMapper.selectBatchIds(authorIds).stream().collect(Collectors.toMap(SysUser::getUserId, Function.identity()));
        Map<String, DalanPostStats> stats = statsMapper.selectBatchIds(postIds).stream().collect(Collectors.toMap(DalanPostStats::getPostId, Function.identity()));
        List<DalanPostReaction> reactions = currentUserId().map(userId -> reactionMapper.selectList(
            new LambdaQueryWrapper<DalanPostReaction>().in(DalanPostReaction::getPostId, postIds)
                .eq(DalanPostReaction::getUserId, userId))).orElse(List.of());
        Set<String> useful = reactionIds(reactions, "useful");
        Set<String> liked = reactionIds(reactions, "like");
        Set<String> favorited = reactionIds(reactions, "favorite");
        return new FeedContext(circles, users, stats, useful, liked, favorited);
    }

    private FeedItem toFeedItem(DalanPostV1 post, FeedContext context) {
        DalanCircleV1 circle = context.circles().get(post.getCircleId());
        SysUser user = context.users().get(post.getAuthorId());
        DalanPostStats stats = context.stats().get(post.getId());
        return new FeedItem(post.getId(), new Cover(post.getCover(), post.getRatio(), null), post.getTag(), post.getTitle(),
            new CircleBrief(post.getCircleId(), circle == null ? "" : circle.getName()), author(post.getAuthorId(), user),
            new Useful(stats == null ? 0 : nvl(stats.getUsefulCount()), context.useful().contains(post.getId())), post.getCreatedAt());
    }

    private PostDto toPost(DalanPostV1 post, FeedContext context) {
        DalanCircleV1 circle = context.circles().get(post.getCircleId());
        DalanPostStats stats = context.stats().get(post.getId());
        boolean useful = context.useful().contains(post.getId());
        return new PostDto(post.getId(), post.getTitle(), post.getContent(), images(post.getImages()), post.getCover(),
            post.getRatio(), post.getTag(), postTopics(post.getId()), new CircleBrief(post.getCircleId(), circle == null ? "" : circle.getName()),
            author(post.getAuthorId(), context.users().get(post.getAuthorId())), stats == null ? 0 : nvl(stats.getUsefulCount()),
            stats == null ? 0 : nvl(stats.getLikeCount()), stats == null ? 0 : nvl(stats.getCommentCount()),
            stats == null ? 0 : nvl(stats.getFavoriteCount()), useful, context.liked().contains(post.getId()),
            context.favorited().contains(post.getId()), post.getCreatedAt());
    }

    private FeedResponse postFeed(LambdaQueryWrapper<DalanPostV1> query, String cursor, int requestedLimit) {
        int limit = normalizeLimit(requestedLimit, 40);
        CursorValue cv = decodeCursor(cursor);
        query.eq(DalanPostV1::getStatus, "published")
            .and(cv != null, wrapper -> wrapper.lt(DalanPostV1::getCreatedAt, cv == null ? null : cv.createdAt())
                .or().eq(DalanPostV1::getCreatedAt, cv == null ? null : cv.createdAt())
                .lt(DalanPostV1::getId, cv == null ? null : cv.id()))
            .orderByDesc(DalanPostV1::getCreatedAt).orderByDesc(DalanPostV1::getId)
            .last("LIMIT " + (limit + 1));
        List<DalanPostV1> rows = postMapper.selectList(query);
        boolean more = rows.size() > limit;
        List<DalanPostV1> page = more ? rows.subList(0, limit) : rows;
        FeedContext context = context(page);
        String next = more && !page.isEmpty() ? encodeCursor(page.get(page.size() - 1)) : null;
        return new FeedResponse(page.stream().map(post -> toFeedItem(post, context)).toList(), next, more);
    }

    private void savePostTopics(String postId, List<String> requestedTopics, Instant now) {
        if (requestedTopics == null || requestedTopics.isEmpty()) return;
        requestedTopics.stream().map(String::trim).filter(name -> !name.isEmpty()).distinct().limit(5).forEach(name -> {
            DalanTopic topic = topicMapper.selectOne(new LambdaQueryWrapper<DalanTopic>()
                .eq(DalanTopic::getName, name).last("LIMIT 1"));
            if (topic == null) {
                topic = new DalanTopic();
                topic.setId("t_" + compactId());
                topic.setSlug(topicSlug(name));
                topic.setName(name);
                topic.setDescription("关于 #" + name + " 的真实经验与讨论");
                topic.setPostCount(0L);
                topic.setStatus("published");
                topic.setCreatedAt(now);
                topic.setUpdatedAt(now);
                try {
                    topicMapper.insert(topic);
                } catch (DuplicateKeyException ignored) {
                    topic = topicMapper.selectOne(new LambdaQueryWrapper<DalanTopic>().eq(DalanTopic::getName, name).last("LIMIT 1"));
                }
            }
            if (topic != null) {
                DalanPostTopic relation = new DalanPostTopic();
                relation.setPostId(postId);
                relation.setTopicId(topic.getId());
                relation.setCreatedAt(now);
                postTopicMapper.insert(relation);
                topicMapper.changePostCount(topic.getId(), 1);
            }
        });
    }

    private List<TopicDto> postTopics(String postId) {
        List<String> ids = postTopicMapper.selectList(new LambdaQueryWrapper<DalanPostTopic>()
            .eq(DalanPostTopic::getPostId, postId).orderByAsc(DalanPostTopic::getCreatedAt))
            .stream().map(DalanPostTopic::getTopicId).toList();
        if (ids.isEmpty()) return List.of();
        Map<String, DalanTopic> topics = topicMapper.selectBatchIds(ids).stream()
            .collect(Collectors.toMap(DalanTopic::getId, Function.identity()));
        return ids.stream().map(topics::get).filter(Objects::nonNull).map(this::toTopic).toList();
    }

    private TopicDto toTopic(DalanTopic topic) {
        return new TopicDto(topic.getId(), topic.getSlug(), topic.getName(), topic.getDescription(),
            nvl(topic.getPostCount()), topic.getCreatedAt());
    }

    private String topicSlug(String name) {
        String ascii = name.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        return ascii.isEmpty() ? "topic-" + DigestUtil.sha256Hex(name).substring(0, 12) : ascii;
    }

    private CircleDto toCircle(DalanCircleV1 circle, Set<String> joined, Long userId) {
        return new CircleDto(circle.getId(), circle.getName(), circle.getCover(), circle.getDescription(), circle.getCategory(),
            strings(circle.getTags()), nvl(circle.getMemberCount()), nvl(circle.getPostCount()), joined.contains(circle.getId()),
            userId != null && Objects.equals(circle.getOwnerId(), userId), String.valueOf(circle.getOwnerId()), circle.getCreatedAt());
    }

    private Author author(Long id, SysUser user) {
        String name = user == null || user.getNickName() == null ? "大蓝书用户" : user.getNickName();
        return new Author(String.valueOf(id), name, user == null ? null : avatarUrl(user.getAvatar()), avatarColor(id));
    }

    private String avatarUrl(Long ossId) {
        if (ossId == null) return null;
        try {
            SysOssVo oss = ossService.getById(ossId);
            return oss == null ? null : oss.getUrl();
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    private Set<String> categoryCircleIds(String categoryId) {
        String category = CATEGORY_NAMES.get(categoryId);
        if (category == null) return Set.of();
        return circleMapper.selectList(new LambdaQueryWrapper<DalanCircleV1>()
                .select(DalanCircleV1::getId).eq(DalanCircleV1::getStatus, "published").eq(DalanCircleV1::getCategory, category))
            .stream().map(DalanCircleV1::getId).collect(Collectors.toSet());
    }

    private boolean isSystemCategory(String id) {
        return id == null || id.isBlank() || "recommend".equals(id) || "more".equals(id);
    }

    private Map<String, DalanCircleV1> circleMap(Collection<String> ids) {
        if (ids.isEmpty()) return Map.of();
        return circleMapper.selectBatchIds(ids).stream().collect(Collectors.toMap(DalanCircleV1::getId, Function.identity()));
    }

    private Set<String> joinedCircleIds() {
        return currentUserId().map(userId -> memberMapper.selectList(new LambdaQueryWrapper<DalanCircleMember>()
                .select(DalanCircleMember::getCircleId).eq(DalanCircleMember::getUserId, userId)).stream()
            .map(DalanCircleMember::getCircleId).collect(Collectors.toSet())).orElse(Set.of());
    }

    private boolean isMember(String circleId, Long userId) {
        return memberMapper.selectCount(new LambdaQueryWrapper<DalanCircleMember>()
            .eq(DalanCircleMember::getCircleId, circleId).eq(DalanCircleMember::getUserId, userId)) > 0;
    }

    private DalanCircleV1 findCircle(String id) {
        DalanCircleV1 circle = circleMapper.selectById(id);
        if (circle == null || !"published".equals(circle.getStatus())) {
            throw new DalanApiException(HttpStatus.NOT_FOUND, "CIRCLE_NOT_FOUND", "圈子不存在");
        }
        return circle;
    }

    private DalanPostV1 findPost(String id) {
        DalanPostV1 post = postMapper.selectById(id);
        if (post == null || !"published".equals(post.getStatus())) {
            throw new DalanApiException(HttpStatus.NOT_FOUND, "POST_NOT_FOUND", "帖子不存在");
        }
        if ("circle".equals(post.getVisibility())) {
            boolean member = currentUserId().map(userId -> isMember(post.getCircleId(), userId)).orElse(false);
            if (!member) {
                throw new DalanApiException(HttpStatus.FORBIDDEN, "CIRCLE_MEMBERSHIP_REQUIRED", "该帖子仅圈内成员可见");
            }
        }
        return post;
    }

    private long unreadCount(Long userId) {
        return notificationMapper.selectCount(new LambdaQueryWrapper<DalanNotification>()
            .eq(DalanNotification::getUserId, userId).isNull(DalanNotification::getReadAt));
    }

    private void ensureProfile(Long userId) {
        if (profileMapper.selectById(userId) != null) return;
        DalanUserProfile profile = new DalanUserProfile();
        profile.setUserId(userId);
        profile.setBio("");
        profile.setGender("unknown");
        profile.setLocation("");
        profile.setAgeRange("unknown");
        profile.setProvinceCode("");
        profile.setProvinceName("");
        profile.setCityCode("");
        profile.setCityName("");
        profile.setFollowerCount(0L);
        profile.setFollowingCount(0L);
        profile.setPostCount(0L);
        profile.setCreatedAt(Instant.now());
        profile.setUpdatedAt(Instant.now());
        try {
            profileMapper.insert(profile);
        } catch (DuplicateKeyException ignored) {
        }
    }

    private Optional<Long> currentUserId() {
        return LoginHelper.isLogin() ? Optional.ofNullable(LoginHelper.getUserId()) : Optional.empty();
    }

    private Long requireUserId() {
        return currentUserId().orElseThrow(() -> new DalanApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "请先登录"));
    }

    private int normalizeLimit(int requested, int max) {
        return requested <= 0 ? 20 : Math.min(requested, max);
    }

    private CursorValue decodeCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) return null;
        try {
            String decoded = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            int separator = decoded.indexOf('|');
            if (separator <= 0 || separator == decoded.length() - 1) throw new IllegalArgumentException();
            return new CursorValue(Instant.ofEpochMilli(Long.parseLong(decoded.substring(0, separator))), decoded.substring(separator + 1));
        } catch (RuntimeException exception) {
            throw new DalanApiException(HttpStatus.BAD_REQUEST, "INVALID_CURSOR", "cursor 无效或已失效");
        }
    }

    private String encodeCursor(DalanPostV1 post) {
        return encodeCursor(post.getCreatedAt(), post.getId());
    }

    private String encodeCursor(Instant createdAt, String id) {
        String raw = createdAt.toEpochMilli() + "|" + id;
        return Base64.getUrlEncoder().withoutPadding().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    private List<ImageDto> images(String json) {
        if (json == null || json.isBlank()) return List.of();
        return JsonUtils.parseArray(json, ImageDto.class);
    }

    private List<String> strings(String json) {
        if (json == null || json.isBlank()) return List.of();
        return JsonUtils.parseArray(json, String.class);
    }

    private Set<String> reactionIds(List<DalanPostReaction> reactions, String type) {
        return reactions.stream().filter(reaction -> type.equals(reaction.getType()))
            .map(DalanPostReaction::getPostId).collect(Collectors.toSet());
    }

    private long nvl(Long value) { return value == null ? 0 : value; }
    private MyProfileDto toMyProfile(SysUser user, DalanUserProfile profile) {
        DalanUserDevice latest = deviceMapper.selectOne(new LambdaQueryWrapper<DalanUserDevice>()
            .eq(DalanUserDevice::getUserId, user.getUserId())
            .orderByDesc(DalanUserDevice::getLastSeenAt).last("LIMIT 1"));
        return new MyProfileDto(String.valueOf(user.getUserId()), user.getNickName(), avatarUrl(user.getAvatar()),
            profile.getBio(), profile.getGender(), profile.getAgeRange(), profile.getProvinceCode(),
            profile.getProvinceName(), profile.getCityCode(), profile.getCityName(), profile.getLocation(),
            latest == null ? null : toDevice(latest));
    }
    private DeviceDto toDevice(DalanUserDevice device) {
        return new DeviceDto(device.getDeviceType(), device.getBrand(), device.getModel(), device.getOs(),
            device.getOsVersion(), device.getBrowser(), device.getBrowserVersion(), device.getLastSeenAt());
    }
    private String clean(String value) { return value == null ? "" : value.trim(); }
    private String defaultValue(String value, String fallback) { return value == null || value.isBlank() ? fallback : value.trim(); }
    private String location(String province, String city) {
        if (province == null || province.isBlank()) return city == null ? "" : city;
        return city == null || city.isBlank() ? province : province + " · " + city;
    }
    private String compactId() { return UUID.randomUUID().toString().replace("-", "").substring(0, 20); }
    private String avatarColor(Long id) {
        String[] colors = {"#245BDB", "#1F9D6A", "#0D1B33", "#D88B16", "#D94B4B", "#5E6B7F"};
        return colors[Math.floorMod(id == null ? 0 : id.hashCode(), colors.length)];
    }
    private String sex(String value) { return "0".equals(value) ? "male" : "1".equals(value) ? "female" : "unknown"; }
    private String membersText(long count) {
        return count >= 10000 ? String.format(Locale.ROOT, "%.1f 万人正在讨论", count / 10000.0) : count + " 人正在讨论";
    }

    private record CursorValue(Instant createdAt, String id) {}
    private record FeedContext(Map<String, DalanCircleV1> circles, Map<Long, SysUser> users,
                               Map<String, DalanPostStats> stats, Set<String> useful,
                               Set<String> liked, Set<String> favorited) {}
}
