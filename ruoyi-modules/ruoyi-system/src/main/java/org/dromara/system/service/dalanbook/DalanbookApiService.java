package org.dromara.system.service.dalanbook;

import cn.hutool.crypto.digest.DigestUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import lombok.RequiredArgsConstructor;
import org.dromara.common.json.utils.JsonUtils;
import org.dromara.common.mybatis.helper.DataPermissionHelper;
import org.dromara.common.oss.enums.OssImageStyle;
import org.dromara.common.satoken.utils.LoginHelper;
import org.dromara.system.config.dalanbook.VodProperties;
import org.dromara.system.controller.dalanbook.v1.DalanApiException;
import org.dromara.system.controller.dalanbook.v1.DalanbookDtos.*;
import org.dromara.system.domain.SysUser;
import org.dromara.system.domain.dalanbook.v1.*;
import org.dromara.system.domain.vo.SysOssVo;
import org.dromara.system.mapper.SysUserMapper;
import org.dromara.system.mapper.dalanbook.v1.*;
import org.dromara.system.service.ISysOssService;
import org.dromara.system.service.dalanbook.cache.DalanbookHomeFeedCacheService;
import org.dromara.system.service.dalanbook.cache.DalanbookHomeFeedSnapshot;
import org.dromara.system.service.dalanbook.vod.VolcengineVodGateway;
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
    private static final Set<String> RATIOS = Set.of("1/1", "4/5", "3/4", "4/3", "16/9", "9/16");
    private static final Set<String> VIDEO_CONTENT_TYPES = Set.of("video/mp4", "video/quicktime", "video/webm");
    private static final long MAX_VIDEO_SIZE = 200L * 1024 * 1024;
    private static final long MAX_VIDEO_DURATION_MS = 3L * 60 * 1000;
    private static final Set<String> HOME_CHANNELS = Set.of("recommend", "following", "latest");
    private static final Set<String> MY_POST_TYPES = Set.of("published", "liked", "favorite");
    private static final Set<String> MESSAGE_NOTIFICATION_TYPES = Set.of("post_like", "post_favorite", "user_follow");
    private static final Set<String> AGE_RANGES = Set.of("unknown", "under18", "18-24", "25-29", "30-34", "35-39", "40-49", "50plus");
    private static final Set<String> GENDERS = Set.of("unknown", "male", "female", "other");
    private static final Set<String> AVATAR_IMAGE_SUFFIXES = Set.of("jpg", "jpeg", "png", "webp", "gif");
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
    private final DalanCirclePinnedItemMapper pinnedItemMapper;
    private final DalanPostV1Mapper postMapper;
    private final DalanVideoAssetMapper videoAssetMapper;
    private final DalanPostStatsMapper statsMapper;
    private final DalanPostReactionMapper reactionMapper;
    private final DalanCommentMapper commentMapper;
    private final DalanTopicMapper topicMapper;
    private final DalanPostTopicMapper postTopicMapper;
    private final DalanUserProfileMapper profileMapper;
    private final DalanUserDeviceMapper deviceMapper;
    private final DalanFollowMapper followMapper;
    private final DalanNotificationMapper notificationMapper;
    private final DalanImpressionMapper impressionMapper;
    private final SysUserMapper userMapper;
    private final ISysOssService ossService;
    private final DalanbookHomeFeedCacheService homeFeedCacheService;
    private final VolcengineVodGateway vodGateway;
    private final VodProperties vodProperties;

    public CategoriesResponse categories() {
        return new CategoriesResponse(CATEGORIES, "recommend");
    }

    public FeedResponse feed(String categoryId, String channel, String cursor, int requestedLimit) {
        if (!HOME_CHANNELS.contains(channel)) {
            throw new DalanApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_HOME_CHANNEL", "首页频道无效");
        }
        int limit = normalizeLimit(requestedLimit, 40);
        CursorValue cursorValue = decodeCursor(cursor);
        if (cursorValue == null && !"following".equals(channel)) {
            DalanbookHomeFeedSnapshot snapshot = homeFeedCacheService.loadFirstPage(categoryId, channel, limit);
            return feedResponse(snapshot.getPosts(), snapshot.isHasMore(), context(snapshot));
        }
        Set<String> circleIds = categoryCircleIds(categoryId);
        if (circleIds.isEmpty() && !isSystemCategory(categoryId)) {
            return new FeedResponse(List.of(), null, false);
        }

        Set<Long> followedUserIds = "following".equals(channel) ? followedUserIds(requireUserId()) : Set.of();
        if ("following".equals(channel) && followedUserIds.isEmpty()) {
            return new FeedResponse(List.of(), null, false);
        }

        LambdaQueryWrapper<DalanPostV1> query = new LambdaQueryWrapper<DalanPostV1>()
            .eq(DalanPostV1::getStatus, "published")
            .eq(DalanPostV1::getVisibility, "public")
            .in(!circleIds.isEmpty(), DalanPostV1::getCircleId, circleIds)
            .in(!followedUserIds.isEmpty(), DalanPostV1::getAuthorId, followedUserIds)
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
        return feedResponse(page, hasMore, context(page));
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
            .filter(Objects::nonNull).map(circle -> new MyCircle(circle.getId(), circle.getName(),
                assetUrl(parseNullableOssId(circle.getCover()), circle.getCover(), OssImageStyle.CIRCLE_CARD_720X405), 0)).toList();
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

    public FeedResponse searchPosts(String rawQuery, String cursor, int requestedLimit) {
        String query = searchQuery(rawQuery);
        return postFeed(new LambdaQueryWrapper<DalanPostV1>()
            .eq(DalanPostV1::getVisibility, "public")
            .and(wrapper -> wrapper.like(DalanPostV1::getTitle, query)
                .or().like(DalanPostV1::getContent, query)), cursor, requestedLimit);
    }

    public CursorPage<CircleDto> searchCircles(String rawQuery, String category, String cursor, int requestedLimit) {
        String keyword = searchQuery(rawQuery);
        int limit = normalizeLimit(requestedLimit, 50);
        CursorValue cv = decodeCursor(cursor);
        LambdaQueryWrapper<DalanCircleV1> query = new LambdaQueryWrapper<DalanCircleV1>()
            .eq(DalanCircleV1::getStatus, "published")
            .eq(category != null && !category.isBlank(), DalanCircleV1::getCategory, category)
            .and(wrapper -> wrapper.like(DalanCircleV1::getName, keyword)
                .or().like(DalanCircleV1::getDescription, keyword)
                .or().like(DalanCircleV1::getTags, keyword))
            .and(cv != null, wrapper -> wrapper.lt(DalanCircleV1::getCreatedAt, cv == null ? null : cv.createdAt())
                .or().eq(DalanCircleV1::getCreatedAt, cv == null ? null : cv.createdAt())
                .lt(DalanCircleV1::getId, cv == null ? null : cv.id()))
            .orderByDesc(DalanCircleV1::getCreatedAt)
            .orderByDesc(DalanCircleV1::getId)
            .last("LIMIT " + (limit + 1));
        List<DalanCircleV1> rows = circleMapper.selectList(query);
        boolean hasMore = rows.size() > limit;
        List<DalanCircleV1> page = hasMore ? rows.subList(0, limit) : rows;
        Set<String> joined = joinedCircleIds();
        Long userId = currentUserId().orElse(null);
        List<CircleDto> items = page.stream().map(circle -> toCircle(circle, joined, userId)).toList();
        String next = hasMore && !page.isEmpty()
            ? encodeCursor(page.get(page.size() - 1).getCreatedAt(), page.get(page.size() - 1).getId()) : null;
        return new CursorPage<>(items, next, hasMore);
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
        String nickname = request.nickname().trim();
        String sex = sexCode(request.gender());
        Long avatarOssId = null;
        if (request.avatarOssId() != null && !request.avatarOssId().isBlank()) {
            avatarOssId = parseOssId(request.avatarOssId());
            SysOssVo avatarOss = ossService.getById(avatarOssId);
            if (avatarOss == null) {
                throw new DalanApiException(HttpStatus.UNPROCESSABLE_ENTITY, "AVATAR_NOT_FOUND", "头像图片不存在");
            }
            if (!Objects.equals(avatarOss.getCreateBy(), userId)) {
                throw new DalanApiException(HttpStatus.FORBIDDEN, "AVATAR_NOT_OWNED", "不能使用其他用户上传的图片作为头像");
            }
            String suffix = clean(avatarOss.getFileSuffix()).replace(".", "").toLowerCase(Locale.ROOT);
            if (!AVATAR_IMAGE_SUFFIXES.contains(suffix)) {
                throw new DalanApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_AVATAR_TYPE", "头像仅支持 JPEG、PNG、WebP、GIF 图片");
            }
        }
        Long finalAvatarOssId = avatarOssId;
        int updated = DataPermissionHelper.ignore(() -> userMapper.update(null,
            new LambdaUpdateWrapper<SysUser>()
                .eq(SysUser::getUserId, userId)
                .set(SysUser::getNickName, nickname)
                .set(SysUser::getSex, sex)
                .set(finalAvatarOssId != null, SysUser::getAvatar, finalAvatarOssId)));
        if (updated != 1) {
            throw new DalanApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "用户不存在");
        }
        user.setNickName(nickname);
        user.setSex(sex);
        if (finalAvatarOssId != null) {
            user.setAvatar(finalAvatarOssId);
        }
        homeFeedCacheService.evictAll();
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
        return toUserDto(user, profile, following);
    }

    @Transactional(rollbackFor = Exception.class)
    public UserDto setFollowing(Long followeeId, boolean following) {
        Long followerId = requireUserId();
        if (Objects.equals(followerId, followeeId)) {
            throw new DalanApiException(HttpStatus.UNPROCESSABLE_ENTITY, "FOLLOW_SELF_FORBIDDEN", "不能关注自己");
        }
        user(followeeId);
        ensureProfile(followerId);
        ensureProfile(followeeId);
        LambdaQueryWrapper<DalanFollow> key = new LambdaQueryWrapper<DalanFollow>()
            .eq(DalanFollow::getFollowerId, followerId)
            .eq(DalanFollow::getFolloweeId, followeeId);
        boolean exists = followMapper.selectCount(key) > 0;
        if (following && !exists) {
            DalanFollow follow = new DalanFollow();
            follow.setFollowerId(followerId);
            follow.setFolloweeId(followeeId);
            follow.setCreatedAt(Instant.now());
            try {
                followMapper.insert(follow);
                changeFollowCounts(followerId, followeeId, 1);
                createNotification(followeeId, "user_follow", Map.of("actor", notificationActor(followerId)));
            } catch (DuplicateKeyException ignored) {
                // A retry raced with the first request; the desired state is already present.
            }
        } else if (!following && exists && followMapper.delete(key) > 0) {
            changeFollowCounts(followerId, followeeId, -1);
        }
        return user(followeeId);
    }

    public CursorPage<UserDto> userFollowers(Long userId, String cursor, int requestedLimit) {
        return userRelations(userId, cursor, requestedLimit, true);
    }

    public CursorPage<UserDto> userFollowing(Long userId, String cursor, int requestedLimit) {
        return userRelations(userId, cursor, requestedLimit, false);
    }

    public FeedResponse userPosts(Long userId, String cursor, int requestedLimit) {
        user(userId);
        return postFeed(new LambdaQueryWrapper<DalanPostV1>()
            .eq(DalanPostV1::getAuthorId, userId)
            .eq(DalanPostV1::getVisibility, "public"), cursor, requestedLimit);
    }

    public FeedResponse myPosts(String type, String cursor, int requestedLimit) {
        Long userId = requireUserId();
        if (!MY_POST_TYPES.contains(type)) {
            throw new DalanApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_MY_POST_TYPE", "个人内容类型无效");
        }
        if ("published".equals(type)) {
            return postFeed(new LambdaQueryWrapper<DalanPostV1>().eq(DalanPostV1::getAuthorId, userId), cursor, requestedLimit);
        }
        List<String> postIds = reactionMapper.selectList(new LambdaQueryWrapper<DalanPostReaction>()
                .select(DalanPostReaction::getPostId)
                .eq(DalanPostReaction::getUserId, userId)
                .eq(DalanPostReaction::getType, type))
            .stream().map(DalanPostReaction::getPostId).toList();
        if (postIds.isEmpty()) {
            return new FeedResponse(List.of(), null, false);
        }
        LambdaQueryWrapper<DalanPostV1> query = new LambdaQueryWrapper<DalanPostV1>().in(DalanPostV1::getId, postIds);
        Set<String> joinedIds = joinedCircleIds();
        if (joinedIds.isEmpty()) {
            query.eq(DalanPostV1::getVisibility, "public");
        } else {
            query.and(wrapper -> wrapper.eq(DalanPostV1::getVisibility, "public")
                .or().in(DalanPostV1::getCircleId, joinedIds));
        }
        return postFeed(query, cursor, requestedLimit);
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
        return toCircle(circle, userId == null ? Set.of() : joinedCircleIds(), userId, OssImageStyle.CIRCLE_BANNER_1600X700);
    }

    public CirclePinnedItemsResponse circlePinnedItems(String circleId) {
        findCircle(circleId);
        List<DalanCirclePinnedItem> rows = pinnedItemMapper.selectList(
            new LambdaQueryWrapper<DalanCirclePinnedItem>()
                .eq(DalanCirclePinnedItem::getCircleId, circleId)
                .eq(DalanCirclePinnedItem::getStatus, "published")
                .orderByAsc(DalanCirclePinnedItem::getSortOrder)
                .orderByDesc(DalanCirclePinnedItem::getPublishedAt)
                .orderByDesc(DalanCirclePinnedItem::getId));
        Set<Long> publisherIds = rows.stream().map(DalanCirclePinnedItem::getPublisherId)
            .filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, SysUser> publishers = publisherIds.isEmpty() ? Map.of()
            : userMapper.selectBatchIds(publisherIds).stream()
                .collect(Collectors.toMap(SysUser::getUserId, Function.identity()));
        List<CirclePinnedItemDto> items = rows.stream()
            .map(row -> toPinnedItem(row, publishers.get(row.getPublisherId())))
            .toList();
        return new CirclePinnedItemsResponse(items);
    }

    public FeedResponse circlePosts(String circleId, String cursor, int requestedLimit) {
        findCircle(circleId);
        boolean member = currentUserId().map(userId -> isMember(circleId, userId)).orElse(false);
        return postFeed(new LambdaQueryWrapper<DalanPostV1>().eq(DalanPostV1::getCircleId, circleId)
            .eq(!member, DalanPostV1::getVisibility, "public"), cursor, requestedLimit);
    }

    public List<TopicDto> topics(String requestedKeyword, int requestedLimit) {
        int limit = normalizeLimit(requestedLimit, 50);
        String keyword = DalanTopicNameNormalizer.normalizeKeyword(requestedKeyword);
        String normalizedKeyword = keyword.toLowerCase(Locale.ROOT).replace(" ", "");
        LambdaQueryWrapper<DalanTopic> query = new LambdaQueryWrapper<DalanTopic>()
            .eq(DalanTopic::getStatus, "published")
            .and(!keyword.isEmpty(), wrapper -> wrapper.like(DalanTopic::getName, keyword)
                .or().likeRight(DalanTopic::getNormalizedName, normalizedKeyword))
                .orderByDesc(DalanTopic::getPostCount)
                .orderByAsc(DalanTopic::getName)
                .last("LIMIT " + limit);
        Comparator<DalanTopic> exactMatchFirst = Comparator
            .comparingInt(topic -> !normalizedKeyword.isEmpty()
                && normalizedKeyword.equals(topic.getNormalizedName()) ? 0 : 1);
        return topicMapper.selectList(query).stream()
            .sorted(exactMatchFirst)
            .map(this::toTopic)
            .toList();
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
        return toCircle(circle, Set.of(circle.getId()), userId, OssImageStyle.CIRCLE_BANNER_1600X700);
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
        return toCircle(circle, joined ? Set.of(circleId) : Set.of(), userId, OssImageStyle.CIRCLE_BANNER_1600X700);
    }

    public PostDto post(String id) {
        DalanPostV1 post = findPostForDetail(id);
        return toPost(post, context(List.of(post)));
    }

    @Transactional(rollbackFor = Exception.class)
    public VideoUploadCredentialResponse createVideoUploadCredential(VideoUploadCredentialRequest request) {
        Long userId = requireUserId();
        String contentType = request.contentType().trim().toLowerCase(Locale.ROOT);
        if (!VIDEO_CONTENT_TYPES.contains(contentType)) {
            throw new DalanApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_VIDEO_TYPE", "仅支持 MP4、MOV、WebM 视频");
        }
        if (request.size() > MAX_VIDEO_SIZE) {
            throw new DalanApiException(HttpStatus.PAYLOAD_TOO_LARGE, "VIDEO_TOO_LARGE", "视频不能超过 200MB");
        }
        String fileName = request.fileName().trim();
        VolcengineVodGateway.UploadCredential credential = vodGateway.createUploadCredential(
            new VolcengineVodGateway.UploadRequest(fileName, contentType, request.size(), vodProperties.getSpaceName(),
                vodProperties.getWorkflowTemplateId(), vodProperties.getSnapshotTemplateId(), vodProperties.getUploadTokenTtlSeconds()));
        if (credential.uploadSts() == null || credential.uploadSts().accessKeyId() == null
            || credential.uploadSts().secretAccessKey() == null || credential.uploadSts().sessionToken() == null
            || credential.expiresAt() == null) {
            throw new DalanApiException(HttpStatus.SERVICE_UNAVAILABLE, "VOD_INVALID_CREDENTIAL", "视频服务未返回有效上传凭证");
        }
        Instant now = Instant.now();
        DalanVideoAsset asset = new DalanVideoAsset();
        asset.setId("va_" + compactId());
        asset.setAuthorId(userId);
        asset.setVodVid(null);
        asset.setFileName(fileName);
        asset.setContentType(contentType);
        asset.setFileSize(request.size());
        asset.setStatus("uploading");
        asset.setPosterUrl("");
        asset.setUploadExpiresAt(credential.expiresAt());
        asset.setCreatedAt(now);
        asset.setUpdatedAt(now);
        videoAssetMapper.insert(asset);
        VolcengineVodGateway.UploadSts uploadSts = credential.uploadSts();
        return new VideoUploadCredentialResponse(asset.getId(), credential.uploadUrl(), credential.uploadMethod(),
            credential.uploadHeaders() == null ? Map.of() : Map.copyOf(credential.uploadHeaders()), credential.expiresAt(),
            vodProperties.getApplicationId(), vodProperties.getSpaceName(), vodProperties.getWorkflowTemplateId(),
            new VideoUploadSts(uploadSts.accessKeyId(), uploadSts.secretAccessKey(), uploadSts.sessionToken(),
                uploadSts.expiredTime(), uploadSts.currentTime(), uploadSts.spaceName()));
    }

    public VideoAssetDto videoAsset(String id) {
        Long userId = requireUserId();
        DalanVideoAsset asset = videoAssetMapper.selectById(id);
        if (asset == null || !Objects.equals(asset.getAuthorId(), userId)) {
            throw new DalanApiException(HttpStatus.NOT_FOUND, "VIDEO_NOT_FOUND", "视频不存在");
        }
        return toVideoAsset(asset);
    }

    @Transactional(rollbackFor = Exception.class)
    public VideoAssetDto completeVideoUpload(String id, VideoUploadCompleteRequest request) {
        Long userId = requireUserId();
        DalanVideoAsset asset = findOwnedVideoAssetForUpdate(id, userId);
        if (asset.getVodVid() != null && !asset.getVodVid().isBlank()
            && Set.of("uploaded", "processing", "ready").contains(asset.getStatus())) {
            if (!asset.getVodVid().equals(request.vid().trim())) {
                throw new DalanApiException(HttpStatus.CONFLICT, "VIDEO_COMPLETE_CONFLICT", "视频上传已完成，不能绑定其他视频");
            }
            return toVideoAsset(asset);
        }
        if (!"uploading".equals(asset.getStatus())) {
            throw new DalanApiException(HttpStatus.CONFLICT, "VIDEO_COMPLETE_NOT_ALLOWED", "当前视频状态不能完成上传");
        }
        if (asset.getUploadExpiresAt() != null && asset.getUploadExpiresAt().isBefore(Instant.now())) {
            throw new DalanApiException(HttpStatus.GONE, "VIDEO_UPLOAD_EXPIRED", "上传凭证已过期，请重新选择视频");
        }
        String vid = request.vid().trim();
        if (videoAssetMapper.selectCount(new LambdaQueryWrapper<DalanVideoAsset>()
            .eq(DalanVideoAsset::getVodVid, vid).ne(DalanVideoAsset::getId, asset.getId())) > 0) {
            throw new DalanApiException(HttpStatus.CONFLICT, "VOD_VIDEO_ALREADY_BOUND", "该点播视频已关联到其他上传记录");
        }
        VolcengineVodGateway.UploadCompletion completion = vodGateway.completeUpload(
            new VolcengineVodGateway.UploadCompletionRequest(vid));
        if (completion.vodVid() == null || !vid.equals(completion.vodVid())) {
            throw new DalanApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VOD_VIDEO_NOT_FOUND", "点播服务未确认上传视频");
        }
        asset.setVodVid(vid);
        asset.setStatus("processing");
        if (completion.posterUrl() != null) asset.setPosterUrl(completion.posterUrl());
        if (completion.durationMs() != null) asset.setDurationMs(completion.durationMs());
        if (completion.width() != null) asset.setWidth(completion.width());
        if (completion.height() != null) asset.setHeight(completion.height());
        if (completion.size() != null) asset.setFileSize(completion.size());
        asset.setUpdatedAt(Instant.now());
        videoAssetMapper.updateById(asset);
        return toVideoAsset(asset);
    }

    public VideoPlaybackResponse videoPlayback(String postId) {
        DalanPostV1 post = findPost(postId);
        if (post.getVideoAssetId() == null || post.getVideoAssetId().isBlank()) {
            throw new DalanApiException(HttpStatus.NOT_FOUND, "POST_VIDEO_NOT_FOUND", "该帖子没有视频");
        }
        DalanVideoAsset asset = videoAssetMapper.selectById(post.getVideoAssetId());
        if (asset == null || !"ready".equals(asset.getStatus()) || asset.getVodVid() == null || asset.getVodVid().isBlank()) {
            throw new DalanApiException(HttpStatus.CONFLICT, "VIDEO_NOT_READY", "视频仍在处理中");
        }
        VolcengineVodGateway.PlaybackSource playback = vodGateway.getPlaybackSource(asset.getVodVid(),
            vodProperties.getPlayAuthTtlSeconds());
        if ((playback.url() == null || playback.url().isBlank())
            && (playback.vid() == null || playback.vid().isBlank() || playback.playAuth() == null || playback.playAuth().isBlank())
            || playback.expiresAt() == null) {
            throw new DalanApiException(HttpStatus.SERVICE_UNAVAILABLE, "VOD_INVALID_PLAYBACK", "视频服务未返回有效播放地址");
        }
        return new VideoPlaybackResponse(playback.url(), playback.expiresAt(), emptyToNull(asset.getPosterUrl()), asset.getDurationMs(),
            playback.vid(), playback.playAuth());
    }

    @Transactional(rollbackFor = Exception.class)
    public void handleVodCallback(String payload, Map<String, String> headers) {
        VolcengineVodGateway.CallbackEvent event = vodGateway.verifyAndParseCallback(payload, headers);
        if (event == null || event.vodVid() == null || event.vodVid().isBlank()) {
            throw new DalanApiException(HttpStatus.BAD_REQUEST, "INVALID_VOD_CALLBACK", "VOD 回调缺少视频标识");
        }
        if (vodProperties.getSpaceName() != null && !vodProperties.getSpaceName().isBlank()
            && !vodProperties.getSpaceName().equals(event.spaceName())) {
            throw new DalanApiException(HttpStatus.FORBIDDEN, "INVALID_VOD_CALLBACK", "VOD 回调空间不匹配");
        }
        DalanVideoAsset asset = videoAssetMapper.selectOne(new LambdaQueryWrapper<DalanVideoAsset>()
            .eq(DalanVideoAsset::getVodVid, event.vodVid()).last("LIMIT 1"));
        if (asset == null) {
            return;
        }
        if (event.eventId() != null && event.eventId().equals(asset.getCallbackEventId())) {
            return;
        }
        String status = normalizeVideoStatus(event.status());
        if (status == null) {
            return;
        }
        boolean exceedsDurationLimit = event.durationMs() != null && event.durationMs() > MAX_VIDEO_DURATION_MS;
        if (exceedsDurationLimit) {
            status = "failed";
        }
        asset.setStatus(status);
        asset.setCallbackEventId(event.eventId());
        if (event.posterUrl() != null) asset.setPosterUrl(event.posterUrl());
        if (event.durationMs() != null) asset.setDurationMs(event.durationMs());
        if (event.width() != null) asset.setWidth(event.width());
        if (event.height() != null) asset.setHeight(event.height());
        if (event.size() != null) asset.setFileSize(event.size());
        asset.setFailureReason("failed".equals(status)
            ? (exceedsDurationLimit ? "短视频不能超过 3 分钟" : clean(event.failureReason())) : null);
        asset.setUpdatedAt(Instant.now());
        videoAssetMapper.updateById(asset);
        if ("ready".equals(status)) {
            publishVideoPosts(asset.getId());
        } else if ("failed".equals(status)) {
            postMapper.update(null, new LambdaUpdateWrapper<DalanPostV1>()
                .eq(DalanPostV1::getVideoAssetId, asset.getId())
                .eq(DalanPostV1::getStatus, "media_processing")
                .set(DalanPostV1::getStatus, "media_failed")
                .set(DalanPostV1::getUpdatedAt, Instant.now()));
        }
    }

    @Transactional(rollbackFor = Exception.class)
    public PostDto createPost(CreatePostRequest request) {
        Long userId = requireUserId();
        DalanCircleV1 circle = findCircle(request.circleId());
        if (!TAGS.contains(request.tag())) {
            throw new DalanApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_POST_TAG", "帖子标签无效");
        }
        List<ImageInput> requestedImages = request.images() == null ? List.of() : request.images();
        String videoAssetId = clean(request.videoAssetId());
        if (!videoAssetId.isEmpty() && !requestedImages.isEmpty()) {
            throw new DalanApiException(HttpStatus.UNPROCESSABLE_ENTITY, "MIXED_MEDIA_NOT_SUPPORTED", "图片和视频不能同时发布");
        }
        if (!RATIOS.contains(request.ratio()) || requestedImages.stream().anyMatch(image -> !RATIOS.contains(image.ratio()))) {
            throw new DalanApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_IMAGE_RATIO", "图片比例无效");
        }
        DalanVideoAsset videoAsset = videoAssetId.isEmpty() ? null : findOwnedVideoAsset(videoAssetId, userId);
        if (videoAsset != null && !Set.of("uploading", "uploaded", "processing", "ready").contains(videoAsset.getStatus())) {
            throw new DalanApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VIDEO_NOT_USABLE", "视频上传失败或已删除");
        }
        if (videoAsset != null && postMapper.selectCount(new LambdaQueryWrapper<DalanPostV1>()
            .eq(DalanPostV1::getVideoAssetId, videoAsset.getId())) > 0) {
            throw new DalanApiException(HttpStatus.CONFLICT, "VIDEO_ALREADY_ATTACHED", "该视频已关联到其他帖子");
        }
        List<StoredImage> storedImages = requestedImages.stream().map(image -> {
            Long ossId = parseOssId(image.ossId());
            SysOssVo oss = ossService.getById(ossId);
            if (oss == null) {
                throw new DalanApiException(HttpStatus.UNPROCESSABLE_ENTITY, "IMAGE_NOT_FOUND", "上传图片不存在");
            }
            if (oss.getCreateBy() != null && !Objects.equals(oss.getCreateBy(), userId)) {
                throw new DalanApiException(HttpStatus.FORBIDDEN, "IMAGE_NOT_OWNED", "不能使用其他用户上传的图片");
            }
            return new StoredImage(String.valueOf(ossId), null, image.ratio());
        }).toList();
        Instant now = Instant.now();
        joinCircleForPublishing(circle.getId(), userId, now);
        DalanPostV1 post = new DalanPostV1();
        post.setId("p_" + compactId());
        post.setAuthorId(userId);
        post.setCircleId(circle.getId());
        post.setTitle(request.title().trim());
        post.setContent(request.content().trim());
        post.setImages(JsonUtils.toJsonString(storedImages));
        post.setVideoAssetId(videoAsset == null ? null : videoAsset.getId());
        post.setCover(videoAsset == null ? "" : defaultValue(videoAsset.getPosterUrl(), ""));
        post.setRatio(request.ratio());
        post.setTag(request.tag());
        post.setVisibility("circle".equals(request.visibility()) ? "circle" : "public");
        post.setStatus(videoAsset == null || "ready".equals(videoAsset.getStatus()) ? "published" : "media_processing");
        post.setCreatedAt(now);
        post.setUpdatedAt(now);
        postMapper.insert(post);
        savePostTopics(post.getId(), request.topics(), now, "published".equals(post.getStatus()));
        DalanPostStats stats = new DalanPostStats();
        stats.setPostId(post.getId());
        stats.setUsefulCount(0L);
        stats.setLikeCount(0L);
        stats.setCommentCount(0L);
        stats.setFavoriteCount(0L);
        stats.setUpdatedAt(now);
        statsMapper.insert(stats);
        if ("published".equals(post.getStatus())) {
            incrementPublishedPostCounts(post);
            homeFeedCacheService.evictAll();
        }
        return toPost(post, context(List.of(post)));
    }

    private void joinCircleForPublishing(String circleId, Long userId, Instant joinedAt) {
        if (isMember(circleId, userId)) return;
        DalanCircleMember member = new DalanCircleMember();
        member.setCircleId(circleId);
        member.setUserId(userId);
        member.setRole("member");
        member.setJoinedAt(joinedAt);
        try {
            memberMapper.insert(member);
            circleMapper.changeMemberCount(circleId, 1);
        } catch (DuplicateKeyException ignored) {
            // Concurrent membership creation already produced the desired state.
        }
    }

    @Transactional(rollbackFor = Exception.class)
    public UsefulResponse useful(String postId, boolean liked) {
        ReactionResponse reaction = reaction(postId, "useful", liked);
        return new UsefulResponse(reaction.count(), reaction.active());
    }

    @Transactional(rollbackFor = Exception.class)
    public ReactionResponse reaction(String postId, String type, boolean active) {
        if (!Set.of("useful", "like", "favorite").contains(type)) {
            throw new DalanApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_REACTION_TYPE", "互动类型无效");
        }
        Long userId = requireUserId();
        DalanPostV1 post = findPost(postId);
        LambdaQueryWrapper<DalanPostReaction> key = new LambdaQueryWrapper<DalanPostReaction>()
            .eq(DalanPostReaction::getPostId, postId).eq(DalanPostReaction::getUserId, userId)
            .eq(DalanPostReaction::getType, type);
        boolean exists = reactionMapper.selectCount(key) > 0;
        if (active && !exists) {
            DalanPostReaction reaction = new DalanPostReaction();
            reaction.setPostId(postId);
            reaction.setUserId(userId);
            reaction.setType(type);
            reaction.setCreatedAt(Instant.now());
            boolean created = false;
            try {
                reactionMapper.insert(reaction);
                changeReactionCount(postId, type, 1);
                created = true;
            } catch (DuplicateKeyException ignored) {
                // A retry raced with the first request; the desired state is already present.
            }
            if (created && !Objects.equals(post.getAuthorId(), userId) && Set.of("like", "favorite").contains(type)) {
                createNotification(post.getAuthorId(), "like".equals(type) ? "post_like" : "post_favorite",
                    Map.of("actor", notificationActor(userId), "post", notificationPost(post)));
            }
        } else if (!active && exists) {
            if (reactionMapper.delete(key) > 0) {
                changeReactionCount(postId, type, -1);
            }
        }
        DalanPostStats stats = statsMapper.selectById(postId);
        boolean actual = reactionMapper.selectCount(new LambdaQueryWrapper<DalanPostReaction>()
            .eq(DalanPostReaction::getPostId, postId).eq(DalanPostReaction::getUserId, userId)
            .eq(DalanPostReaction::getType, type)) > 0;
        return new ReactionResponse(type, reactionCount(stats, type), actual);
    }

    public CommentPage comments(String postId, String cursor, int requestedLimit) {
        findPost(postId);
        int limit = normalizeLimit(requestedLimit, 50);
        CursorValue cursorValue = decodeCursor(cursor);
        LambdaQueryWrapper<DalanComment> query = new LambdaQueryWrapper<DalanComment>()
            .eq(DalanComment::getPostId, postId)
            .isNull(DalanComment::getParentId)
            .in(DalanComment::getStatus, List.of("published", "deleted"))
            .and(cursorValue != null, wrapper -> wrapper
                .lt(DalanComment::getCreatedAt, cursorValue == null ? null : cursorValue.createdAt())
                .or()
                .eq(DalanComment::getCreatedAt, cursorValue == null ? null : cursorValue.createdAt())
                .lt(DalanComment::getId, cursorValue == null ? null : cursorValue.id()))
            .orderByDesc(DalanComment::getCreatedAt)
            .orderByDesc(DalanComment::getId)
            .last("LIMIT " + (limit + 1));
        List<DalanComment> rows = commentMapper.selectList(query);
        boolean hasMore = rows.size() > limit;
        List<DalanComment> page = hasMore ? rows.subList(0, limit) : rows;
        List<String> parentIds = page.stream().map(DalanComment::getId).toList();
        List<DalanComment> replyRows = parentIds.isEmpty() ? List.of() : commentMapper.selectList(
            new LambdaQueryWrapper<DalanComment>()
                .eq(DalanComment::getPostId, postId)
                .in(DalanComment::getParentId, parentIds)
                .in(DalanComment::getStatus, List.of("published", "deleted"))
                .orderByAsc(DalanComment::getCreatedAt)
                .orderByAsc(DalanComment::getId));
        Map<String, List<DalanComment>> replies = replyRows.stream()
            .collect(Collectors.groupingBy(DalanComment::getParentId));
        Map<Long, SysUser> users = commentUsers(page, replyRows);
        List<CommentDto> items = page.stream().map(comment -> toComment(comment, users,
            replies.getOrDefault(comment.getId(), List.of()).stream()
                .map(reply -> toComment(reply, users, List.of())).toList())).toList();
        String next = hasMore && !page.isEmpty()
            ? encodeCursor(page.get(page.size() - 1).getCreatedAt(), page.get(page.size() - 1).getId())
            : null;
        return new CommentPage(items, next, hasMore);
    }

    @Transactional(rollbackFor = Exception.class)
    public CommentDto createComment(String postId, CreateCommentRequest request) {
        Long userId = requireUserId();
        DalanPostV1 post = findPost(postId);
        String parentId = clean(request.parentId());
        DalanComment parent = null;
        if (!parentId.isEmpty()) {
            parent = commentMapper.selectById(parentId);
            if (parent == null || !postId.equals(parent.getPostId()) || !"published".equals(parent.getStatus())) {
                throw new DalanApiException(HttpStatus.NOT_FOUND, "COMMENT_NOT_FOUND", "要回复的评论不存在");
            }
            if (parent.getParentId() != null) {
                throw new DalanApiException(HttpStatus.UNPROCESSABLE_ENTITY, "REPLY_DEPTH_EXCEEDED", "评论最多支持两级回复");
            }
        }
        Instant now = Instant.now();
        DalanComment comment = new DalanComment();
        comment.setId("cm_" + compactId());
        comment.setPostId(postId);
        comment.setParentId(parent == null ? null : parent.getId());
        comment.setAuthorId(userId);
        comment.setContent(request.content().trim());
        comment.setStatus("published");
        comment.setCreatedAt(now);
        comment.setUpdatedAt(now);
        commentMapper.insert(comment);
        statsMapper.changeComment(postId, 1);
        Long recipientId = parent == null ? post.getAuthorId() : parent.getAuthorId();
        if (!Objects.equals(recipientId, userId)) {
            createNotification(recipientId, parent == null ? "post_comment" : "comment_reply",
                Map.of("postId", postId, "commentId", comment.getId()));
        }
        return toComment(comment, commentUsers(List.of(comment), List.of()), List.of());
    }

    @Transactional(rollbackFor = Exception.class)
    public void deleteComment(String commentId) {
        Long userId = requireUserId();
        DalanComment comment = commentMapper.selectById(commentId);
        if (comment == null) {
            throw new DalanApiException(HttpStatus.NOT_FOUND, "COMMENT_NOT_FOUND", "评论不存在");
        }
        if (!Objects.equals(comment.getAuthorId(), userId)) {
            throw new DalanApiException(HttpStatus.FORBIDDEN, "COMMENT_DELETE_FORBIDDEN", "只能删除自己的评论");
        }
        if ("published".equals(comment.getStatus())) {
            int updated = commentMapper.update(null, new LambdaUpdateWrapper<DalanComment>()
                .eq(DalanComment::getId, commentId)
                .eq(DalanComment::getStatus, "published")
                .set(DalanComment::getStatus, "deleted")
                .set(DalanComment::getContent, "")
                .set(DalanComment::getUpdatedAt, Instant.now()));
            if (updated > 0) {
                statsMapper.changeComment(comment.getPostId(), -1);
            }
        }
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
            .in(DalanNotification::getType, MESSAGE_NOTIFICATION_TYPES)
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
        return ossService.getAccessUrl(ossId);
    }

    private FeedContext context(List<DalanPostV1> posts) {
        if (posts.isEmpty()) return emptyFeedContext();
        Set<String> circleIds = posts.stream().map(DalanPostV1::getCircleId).collect(Collectors.toSet());
        Set<Long> authorIds = posts.stream().map(DalanPostV1::getAuthorId).collect(Collectors.toSet());
        Set<String> postIds = posts.stream().map(DalanPostV1::getId).collect(Collectors.toSet());
        Set<String> videoAssetIds = posts.stream().map(DalanPostV1::getVideoAssetId)
            .filter(Objects::nonNull).filter(value -> !value.isBlank()).collect(Collectors.toSet());
        Map<String, DalanCircleV1> circles = circleMap(circleIds);
        Map<Long, DalanbookHomeFeedSnapshot.FeedAuthor> authors = userMapper.selectList(new LambdaQueryWrapper<SysUser>()
                .select(SysUser::getUserId, SysUser::getNickName, SysUser::getAvatar)
                .in(SysUser::getUserId, authorIds)).stream()
            .collect(Collectors.toMap(SysUser::getUserId, user -> new DalanbookHomeFeedSnapshot.FeedAuthor(
                user.getUserId(), user.getNickName(), user.getAvatar())));
        Map<String, DalanPostStats> stats = statsMapper.selectBatchIds(postIds).stream().collect(Collectors.toMap(DalanPostStats::getPostId, Function.identity()));
        Map<String, DalanVideoAsset> videos = videoAssetIds.isEmpty() ? Map.of() : videoAssetMapper.selectBatchIds(videoAssetIds).stream()
            .collect(Collectors.toMap(DalanVideoAsset::getId, Function.identity()));
        return personalizedContext(posts, circles, authors, stats, videos);
    }

    private FeedContext context(DalanbookHomeFeedSnapshot snapshot) {
        if (snapshot.getPosts().isEmpty()) {
            return emptyFeedContext();
        }
        return personalizedContext(snapshot.getPosts(), snapshot.getCircles(), snapshot.getAuthors(),
            snapshot.getStats(), snapshot.getVideos());
    }

    private FeedContext personalizedContext(List<DalanPostV1> posts, Map<String, DalanCircleV1> circles,
                                             Map<Long, DalanbookHomeFeedSnapshot.FeedAuthor> authors,
                                             Map<String, DalanPostStats> stats,
                                             Map<String, DalanVideoAsset> videos) {
        Set<String> postIds = posts.stream().map(DalanPostV1::getId).collect(Collectors.toSet());
        List<DalanPostReaction> reactions = currentUserId().map(userId -> reactionMapper.selectList(
            new LambdaQueryWrapper<DalanPostReaction>().in(DalanPostReaction::getPostId, postIds)
                .eq(DalanPostReaction::getUserId, userId))).orElse(List.of());
        Set<String> useful = reactionIds(reactions, "useful");
        Set<String> liked = reactionIds(reactions, "like");
        Set<String> favorited = reactionIds(reactions, "favorite");
        return new FeedContext(circles, authors, stats, videos, useful, liked, favorited);
    }

    private FeedContext emptyFeedContext() {
        return new FeedContext(Map.of(), Map.of(), Map.of(), Map.of(), Set.of(), Set.of(), Set.of());
    }

    private FeedResponse feedResponse(List<DalanPostV1> page, boolean hasMore, FeedContext context) {
        List<FeedItem> items = page.stream().map(post -> toFeedItem(post, context)).toList();
        String nextCursor = hasMore && !page.isEmpty() ? encodeCursor(page.get(page.size() - 1)) : null;
        return new FeedResponse(items, nextCursor, hasMore);
    }

    private FeedItem toFeedItem(DalanPostV1 post, FeedContext context) {
        DalanCircleV1 circle = context.circles().get(post.getCircleId());
        DalanbookHomeFeedSnapshot.FeedAuthor user = context.authors().get(post.getAuthorId());
        DalanPostStats stats = context.stats().get(post.getId());
        VideoBrief video = videoBrief(post, context.videos());
        return new FeedItem(post.getId(), new Cover(coverUrl(post, video), post.getRatio(), null), post.getTag(), post.getTitle(),
            new CircleBrief(post.getCircleId(), circle == null ? "" : circle.getName()), author(post.getAuthorId(), user),
            new Useful(stats == null ? 0 : nvl(stats.getUsefulCount()), context.useful().contains(post.getId())), post.getCreatedAt(),
            video);
    }

    private PostDto toPost(DalanPostV1 post, FeedContext context) {
        DalanCircleV1 circle = context.circles().get(post.getCircleId());
        DalanPostStats stats = context.stats().get(post.getId());
        boolean useful = context.useful().contains(post.getId());
        List<ImageDto> postImages = images(post.getImages(), OssImageStyle.POST_DETAIL_1440);
        String cover = postImages.isEmpty() ? post.getCover() : postImages.get(0).url();
        VideoBrief video = videoBrief(post, context.videos());
        if (video != null && video.posterUrl() != null && !video.posterUrl().isBlank()) {
            cover = video.posterUrl();
        }
        return new PostDto(post.getId(), post.getTitle(), post.getContent(), postImages, cover,
            post.getRatio(), post.getTag(), postTopics(post.getId()), new CircleBrief(post.getCircleId(), circle == null ? "" : circle.getName()),
            author(post.getAuthorId(), context.authors().get(post.getAuthorId())), stats == null ? 0 : nvl(stats.getUsefulCount()),
            stats == null ? 0 : nvl(stats.getLikeCount()), stats == null ? 0 : nvl(stats.getCommentCount()),
            stats == null ? 0 : nvl(stats.getFavoriteCount()), useful, context.liked().contains(post.getId()),
            context.favorited().contains(post.getId()), post.getCreatedAt(), video);
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

    private void savePostTopics(String postId, List<String> requestedTopics, Instant now, boolean countPost) {
        if (requestedTopics == null || requestedTopics.isEmpty()) return;
        Map<String, DalanTopicNameNormalizer.NormalizedTopicName> normalizedTopics = new LinkedHashMap<>();
        for (String requestedTopic : requestedTopics) {
            DalanTopicNameNormalizer.NormalizedTopicName normalizedTopic;
            try {
                normalizedTopic = DalanTopicNameNormalizer.normalize(requestedTopic);
            } catch (IllegalArgumentException exception) {
                throw new DalanApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_TOPIC_NAME", exception.getMessage());
            }
            normalizedTopics.putIfAbsent(normalizedTopic.normalizedName(), normalizedTopic);
        }
        if (normalizedTopics.size() > 5) {
            throw new DalanApiException(HttpStatus.UNPROCESSABLE_ENTITY, "TOO_MANY_TOPICS", "一篇帖子最多添加 5 个话题");
        }
        for (DalanTopicNameNormalizer.NormalizedTopicName normalizedTopic : normalizedTopics.values()) {
            DalanTopic topic = topicMapper.selectOne(new LambdaQueryWrapper<DalanTopic>()
                .eq(DalanTopic::getNormalizedName, normalizedTopic.normalizedName()).last("LIMIT 1"));
            if (topic == null) {
                topic = new DalanTopic();
                topic.setId("t_" + compactId());
                topic.setSlug(topicSlug(normalizedTopic));
                topic.setName(normalizedTopic.displayName());
                topic.setNormalizedName(normalizedTopic.normalizedName());
                topic.setDescription("关于 #" + normalizedTopic.displayName() + " 的真实经验与讨论");
                topic.setPostCount(0L);
                topic.setStatus("published");
                topic.setCreatedAt(now);
                topic.setUpdatedAt(now);
                try {
                    topicMapper.insert(topic);
                } catch (DuplicateKeyException ignored) {
                    topic = topicMapper.selectOne(new LambdaQueryWrapper<DalanTopic>()
                        .eq(DalanTopic::getNormalizedName, normalizedTopic.normalizedName()).last("LIMIT 1"));
                }
            }
            if (topic != null) {
                DalanPostTopic relation = new DalanPostTopic();
                relation.setPostId(postId);
                relation.setTopicId(topic.getId());
                relation.setCreatedAt(now);
                postTopicMapper.insert(relation);
                if (countPost) {
                    topicMapper.changePostCount(topic.getId(), 1);
                }
            }
        }
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

    private String topicSlug(DalanTopicNameNormalizer.NormalizedTopicName topicName) {
        String hash = DigestUtil.sha256Hex(topicName.normalizedName()).substring(0, 10);
        String ascii = topicName.normalizedName().replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        return ascii.isEmpty() ? "topic-" + hash : ascii + "-" + hash;
    }

    private CircleDto toCircle(DalanCircleV1 circle, Set<String> joined, Long userId) {
        return toCircle(circle, joined, userId, OssImageStyle.CIRCLE_CARD_720X405);
    }

    private CircleDto toCircle(DalanCircleV1 circle, Set<String> joined, Long userId, OssImageStyle imageStyle) {
        return new CircleDto(circle.getId(), circle.getName(), assetUrl(parseNullableOssId(circle.getCover()), circle.getCover(), imageStyle),
            circle.getDescription(), circle.getCategory(),
            strings(circle.getTags()), nvl(circle.getMemberCount()), nvl(circle.getPostCount()), joined.contains(circle.getId()),
            userId != null && Objects.equals(circle.getOwnerId(), userId), String.valueOf(circle.getOwnerId()), circle.getCreatedAt());
    }

    private CirclePinnedItemDto toPinnedItem(DalanCirclePinnedItem item, SysUser publisher) {
        List<PinnedImage> images = JsonUtils.parseArray(item.getImages(), String.class).stream()
            .map(ossId -> new PinnedImage(ossId, assetUrl(parseNullableOssId(ossId), null, OssImageStyle.POST_DETAIL_1440)))
            .toList();
        String publisherName = publisher == null || publisher.getNickName() == null
            ? "圈子管理员" : publisher.getNickName();
        return new CirclePinnedItemDto(item.getId(), item.getKind(), item.getTitle(), item.getContent(), images,
            new PinnedPublisher(String.valueOf(item.getPublisherId()), publisherName), nvl(item.getViewCount()),
            item.getActivityStatus(), item.getPublishedAt(), item.getPublishedAt());
    }

    private Author author(Long id, SysUser user) {
        return author(id, user == null ? null : new DalanbookHomeFeedSnapshot.FeedAuthor(
            user.getUserId(), user.getNickName(), user.getAvatar()));
    }

    private Author author(Long id, DalanbookHomeFeedSnapshot.FeedAuthor user) {
        String name = user == null || user.getNickname() == null ? "大蓝书用户" : user.getNickname();
        return new Author(String.valueOf(id), name,
            user == null ? null : avatarUrl(user.getAvatarOssId(), OssImageStyle.AVATAR_128), avatarColor(id));
    }

    private String avatarUrl(Long ossId) {
        return avatarUrl(ossId, OssImageStyle.AVATAR_256);
    }

    private String avatarUrl(Long ossId, OssImageStyle imageStyle) {
        if (ossId == null) return null;
        try {
            return ossService.getImageAccessUrl(ossId, imageStyle);
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

    private Set<Long> followedUserIds(Long followerId) {
        return followMapper.selectList(new LambdaQueryWrapper<DalanFollow>()
                .select(DalanFollow::getFolloweeId)
                .eq(DalanFollow::getFollowerId, followerId)).stream()
            .map(DalanFollow::getFolloweeId)
            .collect(Collectors.toSet());
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
        assertPostVisibility(post);
        return post;
    }

    private DalanPostV1 findPostForDetail(String id) {
        DalanPostV1 post = postMapper.selectById(id);
        if (post == null) {
            throw new DalanApiException(HttpStatus.NOT_FOUND, "POST_NOT_FOUND", "帖子不存在");
        }
        if (!"published".equals(post.getStatus())) {
            Long userId = currentUserId().orElse(null);
            if (!Objects.equals(post.getAuthorId(), userId)) {
                throw new DalanApiException(HttpStatus.NOT_FOUND, "POST_NOT_FOUND", "帖子不存在");
            }
            return post;
        }
        assertPostVisibility(post);
        return post;
    }

    private void assertPostVisibility(DalanPostV1 post) {
        if ("circle".equals(post.getVisibility())) {
            boolean member = currentUserId().map(userId -> isMember(post.getCircleId(), userId)).orElse(false);
            if (!member) {
                throw new DalanApiException(HttpStatus.FORBIDDEN, "CIRCLE_MEMBERSHIP_REQUIRED", "该帖子仅圈内成员可见");
            }
        }
    }

    private DalanVideoAsset findOwnedVideoAsset(String assetId, Long userId) {
        DalanVideoAsset asset = videoAssetMapper.selectById(assetId);
        return assertVideoAssetOwner(asset, userId);
    }

    private DalanVideoAsset findOwnedVideoAssetForUpdate(String assetId, Long userId) {
        DalanVideoAsset asset = videoAssetMapper.selectByIdForUpdate(assetId);
        return assertVideoAssetOwner(asset, userId);
    }

    private DalanVideoAsset assertVideoAssetOwner(DalanVideoAsset asset, Long userId) {
        if (asset == null) {
            throw new DalanApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VIDEO_NOT_FOUND", "上传视频不存在");
        }
        if (!Objects.equals(asset.getAuthorId(), userId)) {
            throw new DalanApiException(HttpStatus.FORBIDDEN, "VIDEO_NOT_OWNED", "不能使用其他用户上传的视频");
        }
        return asset;
    }

    private void publishVideoPosts(String assetId) {
        List<DalanPostV1> posts = postMapper.selectList(new LambdaQueryWrapper<DalanPostV1>()
            .eq(DalanPostV1::getVideoAssetId, assetId)
            .eq(DalanPostV1::getStatus, "media_processing"));
        boolean published = false;
        for (DalanPostV1 post : posts) {
            post.setStatus("published");
            post.setUpdatedAt(Instant.now());
            if (postMapper.updateById(post) > 0) {
                published = true;
                incrementPublishedPostCounts(post);
                postTopicMapper.selectList(new LambdaQueryWrapper<DalanPostTopic>()
                        .eq(DalanPostTopic::getPostId, post.getId()))
                    .forEach(topic -> topicMapper.changePostCount(topic.getTopicId(), 1));
            }
        }
        if (published) {
            homeFeedCacheService.evictAll();
        }
    }

    private void incrementPublishedPostCounts(DalanPostV1 post) {
        circleMapper.changePostCount(post.getCircleId(), 1);
        ensureProfile(post.getAuthorId());
        DalanUserProfile profile = profileMapper.selectById(post.getAuthorId());
        profile.setPostCount(nvl(profile.getPostCount()) + 1);
        profile.setUpdatedAt(Instant.now());
        profileMapper.updateById(profile);
    }

    private long unreadCount(Long userId) {
        return notificationMapper.selectCount(new LambdaQueryWrapper<DalanNotification>()
            .eq(DalanNotification::getUserId, userId)
            .in(DalanNotification::getType, MESSAGE_NOTIFICATION_TYPES)
            .isNull(DalanNotification::getReadAt));
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

    private CursorPage<UserDto> userRelations(Long userId, String cursor, int requestedLimit,
                                               boolean followers) {
        user(userId);
        int limit = normalizeLimit(requestedLimit, 50);
        CursorValue cv = decodeCursor(cursor);
        Long cursorUserId = null;
        if (cv != null) {
            try {
                cursorUserId = Long.valueOf(cv.id());
            } catch (NumberFormatException exception) {
                throw new DalanApiException(HttpStatus.BAD_REQUEST, "INVALID_CURSOR", "cursor 无效或已失效");
            }
        }

        LambdaQueryWrapper<DalanFollow> query = new LambdaQueryWrapper<>();
        if (followers) {
            query.eq(DalanFollow::getFolloweeId, userId);
            if (cv != null) {
                Long finalCursorUserId = cursorUserId;
                query.and(wrapper -> wrapper.lt(DalanFollow::getCreatedAt, cv.createdAt())
                    .or(nested -> nested.eq(DalanFollow::getCreatedAt, cv.createdAt())
                        .lt(DalanFollow::getFollowerId, finalCursorUserId)));
            }
            query.orderByDesc(DalanFollow::getCreatedAt).orderByDesc(DalanFollow::getFollowerId);
        } else {
            query.eq(DalanFollow::getFollowerId, userId);
            if (cv != null) {
                Long finalCursorUserId = cursorUserId;
                query.and(wrapper -> wrapper.lt(DalanFollow::getCreatedAt, cv.createdAt())
                    .or(nested -> nested.eq(DalanFollow::getCreatedAt, cv.createdAt())
                        .lt(DalanFollow::getFolloweeId, finalCursorUserId)));
            }
            query.orderByDesc(DalanFollow::getCreatedAt).orderByDesc(DalanFollow::getFolloweeId);
        }
        query.last("LIMIT " + (limit + 1));

        List<DalanFollow> rows = followMapper.selectList(query);
        boolean hasMore = rows.size() > limit;
        List<DalanFollow> page = hasMore ? rows.subList(0, limit) : rows;
        List<Long> relatedUserIds = page.stream()
            .map(row -> followers ? row.getFollowerId() : row.getFolloweeId())
            .toList();
        List<UserDto> items = relationUsers(relatedUserIds);
        DalanFollow last = page.isEmpty() ? null : page.get(page.size() - 1);
        String nextCursor = hasMore && last != null
            ? encodeCursor(last.getCreatedAt(), String.valueOf(followers ? last.getFollowerId() : last.getFolloweeId()))
            : null;
        return new CursorPage<>(items, nextCursor, hasMore);
    }

    private List<UserDto> relationUsers(List<Long> userIds) {
        if (userIds.isEmpty()) return List.of();
        Map<Long, SysUser> users = userMapper.selectBatchIds(userIds).stream()
            .filter(user -> !"1".equals(user.getDelFlag()))
            .collect(Collectors.toMap(SysUser::getUserId, Function.identity()));
        Map<Long, DalanUserProfile> profiles = profileMapper.selectBatchIds(userIds).stream()
            .collect(Collectors.toMap(DalanUserProfile::getUserId, Function.identity()));
        Set<Long> followedIds = currentUserId().map(currentId -> followMapper.selectList(
                new LambdaQueryWrapper<DalanFollow>()
                    .eq(DalanFollow::getFollowerId, currentId)
                    .in(DalanFollow::getFolloweeId, userIds)).stream()
            .map(DalanFollow::getFolloweeId)
            .collect(Collectors.toSet())).orElse(Set.of());
        return userIds.stream()
            .map(users::get)
            .filter(Objects::nonNull)
            .map(user -> toUserDto(user, profiles.get(user.getUserId()), followedIds.contains(user.getUserId())))
            .toList();
    }

    private UserDto toUserDto(SysUser user, DalanUserProfile profile, boolean following) {
        Instant createdAt = user.getCreateTime() == null ? null : user.getCreateTime().toInstant();
        return new UserDto(String.valueOf(user.getUserId()), user.getNickName(),
            avatarUrl(user.getAvatar(), OssImageStyle.AVATAR_256),
            profile == null ? "" : profile.getBio(), profile == null ? sex(user.getSex()) : profile.getGender(),
            profile == null ? "" : profile.getLocation(), profile == null ? 0 : nvl(profile.getFollowerCount()),
            profile == null ? 0 : nvl(profile.getFollowingCount()), profile == null ? 0 : nvl(profile.getPostCount()),
            following, createdAt);
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

    private List<ImageDto> images(String json, OssImageStyle imageStyle) {
        if (json == null || json.isBlank()) return List.of();
        return JsonUtils.parseArray(json, StoredImage.class).stream()
            .map(image -> new ImageDto(image.ossId(),
                assetUrl(parseNullableOssId(image.ossId()), image.url(), imageStyle), image.ratio()))
            .toList();
    }

    private String coverUrl(DalanPostV1 post, VideoBrief video) {
        if (video != null && video.posterUrl() != null && !video.posterUrl().isBlank()) {
            return video.posterUrl();
        }
        if (post.getImages() == null || post.getImages().isBlank()) return post.getCover();
        List<StoredImage> storedImages = JsonUtils.parseArray(post.getImages(), StoredImage.class);
        if (storedImages.isEmpty()) return post.getCover();
        StoredImage first = storedImages.get(0);
        return assetUrl(parseNullableOssId(first.ossId()), first.url() == null ? post.getCover() : first.url(),
            OssImageStyle.POST_FEED_720);
    }

    private String assetUrl(Long ossId, String legacyUrl) {
        return assetUrl(ossId, legacyUrl, null);
    }

    private String assetUrl(Long ossId, String legacyUrl, OssImageStyle imageStyle) {
        if (ossId == null) return legacyUrl;
        try {
            String url = imageStyle == null
                ? ossService.getAccessUrl(ossId)
                : ossService.getImageAccessUrl(ossId, imageStyle);
            return url == null ? legacyUrl : url;
        } catch (RuntimeException ignored) {
            return legacyUrl;
        }
    }

    private Long parseOssId(String value) {
        try {
            return Long.valueOf(value);
        } catch (NumberFormatException exception) {
            throw new DalanApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_OSS_ID", "图片标识无效");
        }
    }

    private Long parseNullableOssId(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Long.valueOf(value);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private VideoAssetDto toVideoAsset(DalanVideoAsset asset) {
        return new VideoAssetDto(asset.getId(), asset.getStatus(), emptyToNull(asset.getPosterUrl()), asset.getDurationMs(),
            asset.getWidth(), asset.getHeight(), emptyToNull(asset.getFailureReason()), asset.getCreatedAt(), asset.getUpdatedAt());
    }

    private VideoBrief videoBrief(DalanPostV1 post, Map<String, DalanVideoAsset> videos) {
        if (post.getVideoAssetId() == null || post.getVideoAssetId().isBlank()) {
            return null;
        }
        DalanVideoAsset asset = videos.get(post.getVideoAssetId());
        if (asset == null) {
            return null;
        }
        return new VideoBrief(asset.getId(), asset.getStatus(), emptyToNull(asset.getPosterUrl()), asset.getDurationMs(),
            asset.getWidth(), asset.getHeight());
    }

    private String normalizeVideoStatus(String value) {
        if (value == null) return null;
        return switch (value.toLowerCase(Locale.ROOT)) {
            case "uploading", "uploaded", "processing", "ready", "failed", "deleted" -> value.toLowerCase(Locale.ROOT);
            case "success", "completed", "publish" -> "ready";
            case "error", "rejected" -> "failed";
            default -> null;
        };
    }

    private List<String> strings(String json) {
        if (json == null || json.isBlank()) return List.of();
        return JsonUtils.parseArray(json, String.class);
    }

    private Set<String> reactionIds(List<DalanPostReaction> reactions, String type) {
        return reactions.stream().filter(reaction -> type.equals(reaction.getType()))
            .map(DalanPostReaction::getPostId).collect(Collectors.toSet());
    }

    private void changeReactionCount(String postId, String type, int delta) {
        switch (type) {
            case "useful" -> statsMapper.changeUseful(postId, delta);
            case "like" -> statsMapper.changeLike(postId, delta);
            case "favorite" -> statsMapper.changeFavorite(postId, delta);
            default -> throw new IllegalArgumentException("Unsupported reaction type: " + type);
        }
    }

    private long reactionCount(DalanPostStats stats, String type) {
        if (stats == null) return 0;
        return switch (type) {
            case "useful" -> nvl(stats.getUsefulCount());
            case "like" -> nvl(stats.getLikeCount());
            case "favorite" -> nvl(stats.getFavoriteCount());
            default -> 0;
        };
    }

    private Map<Long, SysUser> commentUsers(List<DalanComment> comments, List<DalanComment> replies) {
        Set<Long> userIds = new HashSet<>();
        comments.forEach(comment -> userIds.add(comment.getAuthorId()));
        replies.forEach(comment -> userIds.add(comment.getAuthorId()));
        if (userIds.isEmpty()) return Map.of();
        return userMapper.selectBatchIds(userIds).stream()
            .collect(Collectors.toMap(SysUser::getUserId, Function.identity()));
    }

    private CommentDto toComment(DalanComment comment, Map<Long, SysUser> users, List<CommentDto> replies) {
        Long currentUserId = currentUserId().orElse(null);
        boolean deleted = "deleted".equals(comment.getStatus());
        return new CommentDto(comment.getId(), comment.getParentId(), author(comment.getAuthorId(), users.get(comment.getAuthorId())),
            deleted ? "" : comment.getContent(), deleted, Objects.equals(comment.getAuthorId(), currentUserId),
            comment.getCreatedAt(), replies);
    }

    private void createNotification(Long userId, String type, Map<String, Object> payload) {
        DalanNotification notification = new DalanNotification();
        notification.setId("n_" + compactId());
        notification.setUserId(userId);
        notification.setType(type);
        notification.setPayload(JsonUtils.toJsonString(payload));
        notification.setCreatedAt(Instant.now());
        notificationMapper.insert(notification);
    }

    private void changeFollowCounts(Long followerId, Long followeeId, int delta) {
        profileMapper.update(null, new LambdaUpdateWrapper<DalanUserProfile>()
            .eq(DalanUserProfile::getUserId, followerId)
            .setSql("following_count = GREATEST(0, following_count + (" + delta + "))"));
        profileMapper.update(null, new LambdaUpdateWrapper<DalanUserProfile>()
            .eq(DalanUserProfile::getUserId, followeeId)
            .setSql("follower_count = GREATEST(0, follower_count + (" + delta + "))"));
    }

    private Map<String, Object> notificationActor(Long userId) {
        SysUser user = userMapper.selectById(userId);
        Author author = author(userId, user);
        Map<String, Object> actor = new HashMap<>();
        actor.put("id", author.id());
        actor.put("name", author.name());
        actor.put("avatarColor", author.avatarColor());
        if (author.avatarUrl() != null) {
            actor.put("avatarUrl", author.avatarUrl());
        }
        return actor;
    }

    private Map<String, Object> notificationPost(DalanPostV1 post) {
        Map<String, Object> notificationPost = new HashMap<>();
        notificationPost.put("id", post.getId());
        notificationPost.put("title", post.getTitle());
        String cover = coverUrl(post, null);
        if (cover != null && !cover.isBlank()) {
            notificationPost.put("cover", cover);
        }
        return notificationPost;
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
    private String searchQuery(String value) {
        String query = clean(value);
        if (query.isEmpty()) {
            throw new DalanApiException(HttpStatus.UNPROCESSABLE_ENTITY, "EMPTY_SEARCH_QUERY", "搜索关键词不能为空");
        }
        return query.replace("%", "\\%").replace("_", "\\_");
    }
    private String emptyToNull(String value) { return value == null || value.isBlank() ? null : value; }
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
    private String sex(String value) { return "0".equals(value) ? "male" : "1".equals(value) ? "female" : "3".equals(value) ? "other" : "unknown"; }
    private String sexCode(String value) { return "male".equals(value) ? "0" : "female".equals(value) ? "1" : "other".equals(value) ? "3" : "2"; }
    private String membersText(long count) {
        return count >= 10000 ? String.format(Locale.ROOT, "%.1f 万人正在讨论", count / 10000.0) : count + " 人正在讨论";
    }

    private record CursorValue(Instant createdAt, String id) {}
    private record StoredImage(String ossId, String url, String ratio) {}
    private record FeedContext(Map<String, DalanCircleV1> circles,
                               Map<Long, DalanbookHomeFeedSnapshot.FeedAuthor> authors,
                               Map<String, DalanPostStats> stats, Map<String, DalanVideoAsset> videos, Set<String> useful,
                               Set<String> liked, Set<String> favorited) {}
}
