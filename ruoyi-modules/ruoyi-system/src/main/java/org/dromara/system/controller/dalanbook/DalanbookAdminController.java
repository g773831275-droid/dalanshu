package org.dromara.system.controller.dalanbook;

import cn.dev33.satoken.annotation.SaCheckPermission;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.dromara.common.core.domain.R;
import org.dromara.common.json.utils.JsonUtils;
import org.dromara.common.log.annotation.Log;
import org.dromara.common.log.enums.BusinessType;
import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.common.oss.enums.OssImageStyle;
import org.dromara.common.satoken.utils.LoginHelper;
import org.dromara.system.domain.SysUser;
import org.dromara.system.domain.dalanbook.v1.DalanCirclePinnedItem;
import org.dromara.system.domain.dalanbook.v1.DalanCircleMember;
import org.dromara.system.domain.dalanbook.v1.DalanCircleV1;
import org.dromara.system.domain.dalanbook.v1.DalanPostV1;
import org.dromara.system.domain.dalanbook.v1.DalanPostStats;
import org.dromara.system.domain.dalanbook.v1.DalanPostTopic;
import org.dromara.system.domain.dalanbook.v1.DalanTopic;
import org.dromara.system.domain.dalanbook.v1.DalanVideoAsset;
import org.dromara.system.mapper.SysUserMapper;
import org.dromara.system.mapper.dalanbook.v1.DalanCircleMemberMapper;
import org.dromara.system.mapper.dalanbook.v1.DalanCirclePinnedItemMapper;
import org.dromara.system.mapper.dalanbook.v1.DalanCircleV1Mapper;
import org.dromara.system.mapper.dalanbook.v1.DalanPostV1Mapper;
import org.dromara.system.mapper.dalanbook.v1.DalanPostStatsMapper;
import org.dromara.system.mapper.dalanbook.v1.DalanPostTopicMapper;
import org.dromara.system.mapper.dalanbook.v1.DalanTopicMapper;
import org.dromara.system.mapper.dalanbook.v1.DalanVideoAssetMapper;
import org.dromara.system.service.ISysOssService;
import org.dromara.system.service.dalanbook.DalanTopicNameNormalizer;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/dalanbook/admin")
public class DalanbookAdminController {
    private static final Set<String> STATUSES = Set.of("published", "hidden", "deleted");
    private static final Set<String> CIRCLE_STATUSES = Set.of("published", "hidden", "frozen", "deleted");
    private static final Set<String> PINNED_KINDS = Set.of("rules", "announcement", "activity");
    private static final Set<String> ACTIVITY_STATUSES = Set.of("active", "ended");
    private static final Set<String> PINNED_PUBLISH_STATUSES = Set.of("published", "hidden");

    private final DalanPostV1Mapper postMapper;
    private final DalanPostStatsMapper postStatsMapper;
    private final DalanPostTopicMapper postTopicMapper;
    private final DalanCircleV1Mapper circleMapper;
    private final DalanCircleMemberMapper circleMemberMapper;
    private final DalanCirclePinnedItemMapper pinnedItemMapper;
    private final DalanTopicMapper topicMapper;
    private final DalanVideoAssetMapper videoAssetMapper;
    private final SysUserMapper userMapper;
    private final ISysOssService ossService;

    @SaCheckPermission("dalanbook:post:list")
    @GetMapping("/posts")
    public TableDataInfo<PostListItem> posts(String keyword, String status, PageQuery pageQuery) {
        Page<DalanPostV1> page = postMapper.selectPage(pageQuery.build(), new LambdaQueryWrapper<DalanPostV1>()
            .and(keyword != null && !keyword.isBlank(), w -> w.like(DalanPostV1::getTitle, keyword.trim())
                .or().like(DalanPostV1::getContent, keyword.trim()))
            .eq(status != null && !status.isBlank(), DalanPostV1::getStatus, status)
            .orderByDesc(DalanPostV1::getCreatedAt));
        List<DalanPostV1> posts = page.getRecords();
        if (posts.isEmpty()) return new TableDataInfo<>(List.of(), page.getTotal());

        List<String> postIds = posts.stream().map(DalanPostV1::getId).toList();
        Map<Long, SysUser> authors = userMapper.selectBatchIds(posts.stream().map(DalanPostV1::getAuthorId)
                .filter(Objects::nonNull).collect(Collectors.toSet())).stream()
            .collect(Collectors.toMap(SysUser::getUserId, Function.identity()));
        Map<String, DalanCircleV1> circles = circleMapper.selectBatchIds(posts.stream().map(DalanPostV1::getCircleId)
                .filter(Objects::nonNull).collect(Collectors.toSet())).stream()
            .collect(Collectors.toMap(DalanCircleV1::getId, Function.identity()));
        Map<String, DalanPostStats> stats = postStatsMapper.selectBatchIds(postIds).stream()
            .collect(Collectors.toMap(DalanPostStats::getPostId, Function.identity()));
        Set<String> videoIds = posts.stream().map(DalanPostV1::getVideoAssetId)
            .filter(id -> id != null && !id.isBlank()).collect(Collectors.toSet());
        Map<String, DalanVideoAsset> videos = videoIds.isEmpty() ? Map.of() : videoAssetMapper.selectBatchIds(videoIds).stream()
            .collect(Collectors.toMap(DalanVideoAsset::getId, Function.identity()));

        List<DalanPostTopic> relations = postTopicMapper.selectList(new LambdaQueryWrapper<DalanPostTopic>()
            .in(DalanPostTopic::getPostId, postIds).orderByAsc(DalanPostTopic::getCreatedAt));
        Map<String, DalanTopic> topics = relations.isEmpty() ? Map.of() : topicMapper.selectBatchIds(relations.stream()
                .map(DalanPostTopic::getTopicId).collect(Collectors.toSet())).stream()
            .collect(Collectors.toMap(DalanTopic::getId, Function.identity()));
        Map<String, List<String>> topicNames = relations.stream()
            .filter(relation -> topics.containsKey(relation.getTopicId()))
            .collect(Collectors.groupingBy(DalanPostTopic::getPostId, Collectors.mapping(
                relation -> topics.get(relation.getTopicId()).getName(), Collectors.toList())));

        List<PostListItem> rows = posts.stream().map(post -> PostListItem.from(post,
            displayName(authors.get(post.getAuthorId()), post.getAuthorId()),
            circleName(circles.get(post.getCircleId()), post.getCircleId()),
            postCoverUrl(post, post.getVideoAssetId() == null ? null : videos.get(post.getVideoAssetId())),
            topicNames.getOrDefault(post.getId(), List.of()), stats.get(post.getId()))).toList();
        return new TableDataInfo<>(rows, page.getTotal());
    }

    @SaCheckPermission("dalanbook:circle:list")
    @GetMapping("/circles")
    public TableDataInfo<CircleListItem> circles(String keyword, String status, PageQuery pageQuery) {
        Page<DalanCircleV1> page = circleMapper.selectPage(pageQuery.build(), new LambdaQueryWrapper<DalanCircleV1>()
            .and(keyword != null && !keyword.isBlank(), w -> w.like(DalanCircleV1::getName, keyword.trim())
                .or().like(DalanCircleV1::getDescription, keyword.trim()))
            .eq(status != null && !status.isBlank(), DalanCircleV1::getStatus, status)
            .orderByDesc(DalanCircleV1::getCreatedAt));
        return new TableDataInfo<>(page.getRecords().stream()
            .map(row -> CircleListItem.from(row, coverUrl(row.getCover())))
            .toList(), page.getTotal());
    }

    @SaCheckPermission("dalanbook:circle:list")
    @GetMapping("/circles/{id}")
    public R<CircleDetail> circle(@PathVariable String id) {
        DalanCircleV1 row = circleMapper.selectById(id);
        if (row == null) return R.fail("圈子不存在");
        List<Long> adminIds = circleMemberMapper.selectList(new LambdaQueryWrapper<DalanCircleMember>()
                .eq(DalanCircleMember::getCircleId, id).eq(DalanCircleMember::getRole, "admin"))
            .stream().map(DalanCircleMember::getUserId).toList();
        return R.ok(CircleDetail.from(row, adminIds, coverUrl(row.getCover())));
    }

    @SaCheckPermission("dalanbook:circle:list")
    @GetMapping("/circle-user-options")
    public R<List<UserOption>> circleUserOptions(@RequestParam(required = false) String keyword) {
        List<SysUser> users = userMapper.selectList(new LambdaQueryWrapper<SysUser>()
            .select(SysUser::getUserId, SysUser::getUserName, SysUser::getNickName)
            .eq(SysUser::getStatus, "0")
            .and(keyword != null && !keyword.isBlank(), w -> w.like(SysUser::getUserName, keyword.trim())
                .or().like(SysUser::getNickName, keyword.trim()))
            .orderByAsc(SysUser::getUserId).last("LIMIT 30"));
        return R.ok(users.stream().map(u -> new UserOption(u.getUserId(), u.getUserName(), u.getNickName())).toList());
    }

    @SaCheckPermission("dalanbook:circle:list")
    @GetMapping("/circles/{circleId}/pinned-items")
    public R<List<PinnedItemView>> pinnedItems(@PathVariable String circleId) {
        requireCircle(circleId);
        List<DalanCirclePinnedItem> rows = pinnedItemMapper.selectList(
            new LambdaQueryWrapper<DalanCirclePinnedItem>()
                .eq(DalanCirclePinnedItem::getCircleId, circleId)
                .ne(DalanCirclePinnedItem::getStatus, "deleted")
                .orderByAsc(DalanCirclePinnedItem::getSortOrder)
                .orderByDesc(DalanCirclePinnedItem::getPublishedAt));
        return R.ok(rows.stream().map(this::toPinnedItemView).toList());
    }

    @SaCheckPermission("dalanbook:circle:edit")
    @Log(title = "圈子置顶消息新增", businessType = BusinessType.INSERT)
    @PostMapping("/circles/{circleId}/pinned-items")
    public R<String> createPinnedItem(@PathVariable String circleId,
                                      @Valid @RequestBody PinnedItemRequest request) {
        requireCircle(circleId);
        Instant now = Instant.now();
        DalanCirclePinnedItem row = new DalanCirclePinnedItem();
        row.setId("pin_" + UUID.randomUUID().toString().replace("-", "").substring(0, 20));
        row.setCircleId(circleId);
        row.setViewCount(0L);
        row.setCreatedAt(now);
        applyPinnedItem(row, request, now);
        pinnedItemMapper.insert(row);
        return R.ok(row.getId());
    }

    @SaCheckPermission("dalanbook:circle:edit")
    @Log(title = "圈子置顶消息维护", businessType = BusinessType.UPDATE)
    @PutMapping("/circles/{circleId}/pinned-items/{itemId}")
    public R<Void> updatePinnedItem(@PathVariable String circleId, @PathVariable String itemId,
                                    @Valid @RequestBody PinnedItemRequest request) {
        requireCircle(circleId);
        DalanCirclePinnedItem row = pinnedItemMapper.selectById(itemId);
        if (row == null || !circleId.equals(row.getCircleId()) || "deleted".equals(row.getStatus())) {
            return R.fail("置顶消息不存在");
        }
        applyPinnedItem(row, request, Instant.now());
        return pinnedItemMapper.updateById(row) > 0 ? R.ok() : R.fail();
    }

    @SaCheckPermission("dalanbook:circle:edit")
    @Log(title = "圈子置顶消息删除", businessType = BusinessType.DELETE)
    @DeleteMapping("/circles/{circleId}/pinned-items/{itemId}")
    public R<Void> deletePinnedItem(@PathVariable String circleId, @PathVariable String itemId) {
        DalanCirclePinnedItem row = pinnedItemMapper.selectById(itemId);
        if (row == null || !circleId.equals(row.getCircleId()) || "deleted".equals(row.getStatus())) {
            return R.fail("置顶消息不存在");
        }
        row.setStatus("deleted");
        row.setUpdatedAt(Instant.now());
        return pinnedItemMapper.updateById(row) > 0 ? R.ok() : R.fail();
    }

    @SaCheckPermission("dalanbook:topic:list")
    @GetMapping("/topics")
    public TableDataInfo<DalanTopic> topics(String keyword, String status, PageQuery pageQuery) {
        Page<DalanTopic> page = topicMapper.selectPage(pageQuery.build(), new LambdaQueryWrapper<DalanTopic>()
            .and(keyword != null && !keyword.isBlank(), w -> w.like(DalanTopic::getName, keyword.trim())
                .or().like(DalanTopic::getDescription, keyword.trim()))
            .eq(status != null && !status.isBlank(), DalanTopic::getStatus, status)
            .orderByDesc(DalanTopic::getPostCount).orderByDesc(DalanTopic::getCreatedAt));
        return TableDataInfo.build(page);
    }

    @SaCheckPermission("dalanbook:post:edit")
    @Log(title = "大蓝书帖子审核", businessType = BusinessType.UPDATE)
    @PutMapping("/posts/{id}/status")
    public R<Void> postStatus(@PathVariable String id, @Valid @RequestBody StatusRequest request) {
        DalanPostV1 row = postMapper.selectById(id);
        if (row == null) return R.fail("帖子不存在");
        row.setStatus(status(request.status()));
        row.setUpdatedAt(Instant.now());
        return postMapper.updateById(row) > 0 ? R.ok() : R.fail();
    }

    @SaCheckPermission("dalanbook:circle:edit")
    @Log(title = "大蓝书圈子审核", businessType = BusinessType.UPDATE)
    @PutMapping("/circles/{id}/status")
    public R<Void> circleStatus(@PathVariable String id, @Valid @RequestBody StatusRequest request) {
        DalanCircleV1 row = circleMapper.selectById(id);
        if (row == null) return R.fail("圈子不存在");
        row.setStatus(circleStatus(request.status()));
        row.setUpdatedAt(Instant.now());
        return circleMapper.updateById(row) > 0 ? R.ok() : R.fail();
    }

    @Transactional(rollbackFor = Exception.class)
    @SaCheckPermission("dalanbook:circle:add")
    @Log(title = "大蓝书圈子新增", businessType = BusinessType.INSERT)
    @PostMapping("/circles")
    public R<String> createCircle(@Valid @RequestBody CircleRequest request) {
        if (circleMapper.selectCount(new LambdaQueryWrapper<DalanCircleV1>().eq(DalanCircleV1::getName, request.name().trim())) > 0) {
            return R.fail("圈子名称已存在");
        }
        validateManagers(request.ownerId(), request.adminIds());
        Instant now = Instant.now();
        DalanCircleV1 row = new DalanCircleV1();
        row.setId("c_" + UUID.randomUUID().toString().replace("-", "").substring(0, 20));
        applyCircle(row, request);
        row.setMemberCount(0L);
        row.setPostCount(0L);
        row.setCreatedAt(now);
        row.setUpdatedAt(now);
        circleMapper.insert(row);
        syncManagers(row, request.ownerId(), request.adminIds());
        circleMapper.updateById(row);
        return R.ok(row.getId());
    }

    @Transactional(rollbackFor = Exception.class)
    @SaCheckPermission("dalanbook:circle:edit")
    @Log(title = "大蓝书圈子维护", businessType = BusinessType.UPDATE)
    @PutMapping("/circles/{id}")
    public R<Void> updateCircle(@PathVariable String id, @Valid @RequestBody CircleRequest request) {
        DalanCircleV1 row = circleMapper.selectById(id);
        if (row == null) return R.fail("圈子不存在");
        if (circleMapper.selectCount(new LambdaQueryWrapper<DalanCircleV1>()
            .eq(DalanCircleV1::getName, request.name().trim()).ne(DalanCircleV1::getId, id)) > 0) {
            return R.fail("圈子名称已存在");
        }
        validateManagers(request.ownerId(), request.adminIds());
        applyCircle(row, request);
        row.setUpdatedAt(Instant.now());
        syncManagers(row, request.ownerId(), request.adminIds());
        return circleMapper.updateById(row) > 0 ? R.ok() : R.fail();
    }

    @SaCheckPermission("dalanbook:circle:remove")
    @Log(title = "大蓝书圈子删除", businessType = BusinessType.DELETE)
    @DeleteMapping("/circles/{id}")
    public R<Void> deleteCircle(@PathVariable String id) {
        DalanCircleV1 row = circleMapper.selectById(id);
        if (row == null) return R.fail("圈子不存在");
        row.setStatus("deleted");
        row.setUpdatedAt(Instant.now());
        return circleMapper.updateById(row) > 0 ? R.ok() : R.fail();
    }

    @SaCheckPermission("dalanbook:topic:edit")
    @Log(title = "大蓝书话题管理", businessType = BusinessType.UPDATE)
    @PutMapping("/topics/{id}")
    public R<Void> updateTopic(@PathVariable String id, @Valid @RequestBody TopicRequest request) {
        DalanTopic row = topicMapper.selectById(id);
        if (row == null) return R.fail("话题不存在");
        DalanTopicNameNormalizer.NormalizedTopicName topicName;
        try {
            topicName = DalanTopicNameNormalizer.normalize(request.name());
        } catch (IllegalArgumentException exception) {
            return R.fail(exception.getMessage());
        }
        if (topicMapper.selectCount(new LambdaQueryWrapper<DalanTopic>()
            .eq(DalanTopic::getNormalizedName, topicName.normalizedName())
            .ne(DalanTopic::getId, id)) > 0) {
            return R.fail("已存在同名话题");
        }
        row.setName(topicName.displayName());
        row.setNormalizedName(topicName.normalizedName());
        row.setDescription(request.description() == null ? "" : request.description().trim());
        row.setStatus(status(request.status()));
        row.setUpdatedAt(Instant.now());
        return topicMapper.updateById(row) > 0 ? R.ok() : R.fail();
    }

    private String status(String value) {
        if (!STATUSES.contains(value)) throw new IllegalArgumentException("状态无效");
        return value;
    }

    private String circleStatus(String value) {
        if (!CIRCLE_STATUSES.contains(value)) throw new IllegalArgumentException("圈子状态无效");
        return value;
    }

    private void applyCircle(DalanCircleV1 row, CircleRequest request) {
        row.setOwnerId(request.ownerId());
        row.setName(request.name().trim());
        row.setCover(request.cover() == null ? "" : request.cover().trim());
        row.setDescription(request.description().trim());
        row.setCategory(request.category().trim());
        row.setTags(JsonUtils.toJsonString(normalizeTags(request.tags())));
        row.setRecommendWeight(request.recommendWeight());
        row.setHomeVisible(request.homeVisible());
        row.setSortOrder(request.sortOrder());
        row.setStatus(circleStatus(request.status()));
    }

    private void applyPinnedItem(DalanCirclePinnedItem row, PinnedItemRequest request, Instant now) {
        if (!PINNED_KINDS.contains(request.kind())) {
            throw new IllegalArgumentException("置顶消息类型无效");
        }
        if (request.activityStatus() != null && !ACTIVITY_STATUSES.contains(request.activityStatus())) {
            throw new IllegalArgumentException("活动状态无效");
        }
        if (!"activity".equals(request.kind()) && request.activityStatus() != null) {
            throw new IllegalArgumentException("仅活动类型可设置活动状态");
        }
        if (!PINNED_PUBLISH_STATUSES.contains(request.publishStatus())) {
            throw new IllegalArgumentException("发布状态无效");
        }
        List<String> imageOssIds = request.imageOssIds() == null ? List.of()
            : request.imageOssIds().stream().distinct().toList();
        imageOssIds.forEach(this::validateOssImage);
        row.setKind(request.kind());
        row.setTitle(request.title().trim());
        row.setContent(request.content().trim());
        row.setImages(JsonUtils.toJsonString(imageOssIds));
        row.setPublisherId(LoginHelper.getUserId());
        row.setActivityStatus(request.activityStatus());
        row.setSortOrder(request.sortOrder());
        String previousStatus = row.getStatus();
        row.setStatus(request.publishStatus());
        if (row.getPublishedAt() == null
            || "published".equals(request.publishStatus()) && !"published".equals(previousStatus)) {
            row.setPublishedAt(now);
        }
        row.setUpdatedAt(now);
    }

    private void validateOssImage(String ossId) {
        try {
            if (ossService.getById(Long.valueOf(ossId)) == null) {
                throw new IllegalArgumentException("置顶消息图片不存在");
            }
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("置顶消息图片标识无效");
        }
    }

    private DalanCircleV1 requireCircle(String circleId) {
        DalanCircleV1 circle = circleMapper.selectById(circleId);
        if (circle == null || "deleted".equals(circle.getStatus())) {
            throw new IllegalArgumentException("圈子不存在");
        }
        return circle;
    }

    private PinnedItemView toPinnedItemView(DalanCirclePinnedItem row) {
        List<String> imageOssIds = JsonUtils.parseArray(row.getImages(), String.class);
        List<PinnedImageView> images = imageOssIds.stream()
            .map(ossId -> new PinnedImageView(ossId, coverUrl(ossId)))
            .toList();
        return new PinnedItemView(row.getId(), row.getCircleId(), row.getKind(), row.getTitle(), row.getContent(),
            images, row.getPublisherId(), row.getViewCount(), row.getActivityStatus(), row.getSortOrder(),
            row.getStatus(), row.getPublishedAt(), row.getCreatedAt(), row.getUpdatedAt());
    }

    private String coverUrl(String cover) {
        if (cover == null || cover.isBlank()) return cover;
        try {
            String url = ossService.getAccessUrl(Long.valueOf(cover));
            return url == null || url.isBlank() ? cover : url;
        } catch (NumberFormatException ignored) {
            return cover;
        } catch (RuntimeException ignored) {
            return cover;
        }
    }

    private String postCoverUrl(DalanPostV1 post, DalanVideoAsset video) {
        if (video != null && video.getPosterUrl() != null && !video.getPosterUrl().isBlank()) {
            return video.getPosterUrl();
        }
        if (post.getImages() != null && !post.getImages().isBlank()) {
            try {
                List<PostImageRef> images = JsonUtils.parseArray(post.getImages(), PostImageRef.class);
                if (!images.isEmpty()) {
                    PostImageRef first = images.get(0);
                    try {
                        String url = ossService.getImageAccessUrl(Long.valueOf(first.ossId()), OssImageStyle.POST_FEED_720);
                        if (url != null && !url.isBlank()) return url;
                    } catch (RuntimeException ignored) {
                        // 兼容历史 URL 记录，继续使用记录内地址或 cover。
                    }
                    if (first.url() != null && !first.url().isBlank()) return first.url();
                }
            } catch (RuntimeException ignored) {
                // 历史异常数据不影响管理列表加载。
            }
        }
        return coverUrl(post.getCover());
    }

    private String displayName(SysUser user, Long userId) {
        if (user == null) return userId == null ? "未知用户" : "用户 " + userId;
        if (user.getNickName() != null && !user.getNickName().isBlank()) return user.getNickName();
        if (user.getUserName() != null && !user.getUserName().isBlank()) return user.getUserName();
        return "用户 " + userId;
    }

    private String circleName(DalanCircleV1 circle, String circleId) {
        return circle == null || circle.getName() == null || circle.getName().isBlank() ? circleId : circle.getName();
    }

    private List<String> normalizeTags(List<String> tags) {
        if (tags == null) return List.of();
        return tags.stream().map(String::trim).filter(tag -> !tag.isEmpty()).distinct().toList();
    }

    private void validateManagers(Long ownerId, List<Long> adminIds) {
        Set<Long> ids = new LinkedHashSet<>();
        ids.add(ownerId);
        if (adminIds != null) ids.addAll(adminIds);
        long count = userMapper.selectCount(new LambdaQueryWrapper<SysUser>()
            .in(SysUser::getUserId, ids).eq(SysUser::getStatus, "0"));
        if (count != ids.size()) throw new IllegalArgumentException("圈主或管理员用户不存在/已停用");
    }

    private void syncManagers(DalanCircleV1 circle, Long ownerId, List<Long> adminIds) {
        Set<Long> admins = new LinkedHashSet<>(adminIds == null ? List.of() : adminIds);
        admins.remove(ownerId);
        circleMemberMapper.update(null, new LambdaUpdateWrapper<DalanCircleMember>()
            .set(DalanCircleMember::getRole, "member").eq(DalanCircleMember::getCircleId, circle.getId())
            .in(DalanCircleMember::getRole, List.of("owner", "admin")));
        upsertManager(circle.getId(), ownerId, "owner");
        admins.forEach(userId -> upsertManager(circle.getId(), userId, "admin"));
        circle.setOwnerId(ownerId);
        circle.setMemberCount(circleMemberMapper.selectCount(new LambdaQueryWrapper<DalanCircleMember>()
            .eq(DalanCircleMember::getCircleId, circle.getId())));
    }

    private void upsertManager(String circleId, Long userId, String role) {
        long exists = circleMemberMapper.selectCount(new LambdaQueryWrapper<DalanCircleMember>()
            .eq(DalanCircleMember::getCircleId, circleId).eq(DalanCircleMember::getUserId, userId));
        if (exists == 0) {
            DalanCircleMember member = new DalanCircleMember();
            member.setCircleId(circleId);
            member.setUserId(userId);
            member.setRole(role);
            member.setJoinedAt(Instant.now());
            circleMemberMapper.insert(member);
        } else {
            circleMemberMapper.update(null, new LambdaUpdateWrapper<DalanCircleMember>()
                .set(DalanCircleMember::getRole, role).eq(DalanCircleMember::getCircleId, circleId)
                .eq(DalanCircleMember::getUserId, userId));
        }
    }

    public record StatusRequest(@NotBlank String status) {}
    public record TopicRequest(@NotBlank @Size(max = 40) String name,
                               @Size(max = 300) String description,
                               @NotBlank String status) {}
    public record CircleRequest(@NotNull Long ownerId,
                                @NotBlank @Size(max = 80) String name,
                                @Size(max = 500) String cover,
                                @NotBlank @Size(max = 300) String description,
                                @NotBlank @Size(max = 40) String category,
                                @Size(max = 5) List<@NotBlank @Size(max = 20) String> tags,
                                @Size(max = 10) List<@NotNull Long> adminIds,
                                @NotNull @Min(0) @Max(9999) Integer recommendWeight,
                                @NotNull Boolean homeVisible,
                                @NotNull @Min(0) @Max(9999) Integer sortOrder,
                                @NotBlank String status) {}
    public record UserOption(Long userId, String userName, String nickName) {}
    public record PinnedItemRequest(@NotBlank String kind,
                                    @NotBlank @Size(max = 120) String title,
                                    @NotBlank @Size(max = 10000) String content,
                                    @Size(max = 9) List<@NotBlank @Pattern(regexp = "^[0-9]+$") String> imageOssIds,
                                    String activityStatus,
                                    @NotNull @Min(0) @Max(9999) Integer sortOrder,
                                    @NotBlank String publishStatus) {}
    public record PinnedImageView(String ossId, String url) {}
    public record PinnedItemView(String id, String circleId, String kind, String title, String content,
                                 List<PinnedImageView> images, Long publisherId, Long viewCount,
                                 String activityStatus, Integer sortOrder, String publishStatus,
                                 Instant publishedAt, Instant createdAt, Instant updatedAt) {}
    private record PostImageRef(String ossId, String url, String ratio) {}
    public record PostListItem(String id, Long authorId, String authorName, String circleId, String circleName,
                               String title, String content, String cover, String tag, List<String> topics,
                               String visibility, String status, long usefulCount, long likeCount,
                               long commentCount, long favoriteCount, Instant createdAt, Instant updatedAt) {
        static PostListItem from(DalanPostV1 post, String authorName, String circleName, String cover,
                                 List<String> topics, DalanPostStats stats) {
            return new PostListItem(post.getId(), post.getAuthorId(), authorName, post.getCircleId(), circleName,
                post.getTitle(), post.getContent(), cover, post.getTag(), topics, post.getVisibility(), post.getStatus(),
                stats == null || stats.getUsefulCount() == null ? 0L : stats.getUsefulCount(),
                stats == null || stats.getLikeCount() == null ? 0L : stats.getLikeCount(),
                stats == null || stats.getCommentCount() == null ? 0L : stats.getCommentCount(),
                stats == null || stats.getFavoriteCount() == null ? 0L : stats.getFavoriteCount(),
                post.getCreatedAt(), post.getUpdatedAt());
        }
    }
    public record CircleListItem(String id, Long ownerId, String name, String cover, String coverUrl,
                                 String description, String category, String tags, Long memberCount,
                                 Long postCount, Integer recommendWeight, Boolean homeVisible,
                                 Integer sortOrder, String status, Instant createdAt, Instant updatedAt) {
        static CircleListItem from(DalanCircleV1 row, String coverUrl) {
            return new CircleListItem(row.getId(), row.getOwnerId(), row.getName(), row.getCover(), coverUrl,
                row.getDescription(), row.getCategory(), row.getTags(), row.getMemberCount(), row.getPostCount(),
                row.getRecommendWeight(), row.getHomeVisible(), row.getSortOrder(), row.getStatus(),
                row.getCreatedAt(), row.getUpdatedAt());
        }
    }
    public record CircleDetail(String id, Long ownerId, String name, String cover, String description,
                               String category, List<String> tags, List<Long> adminIds, Long memberCount,
                               Long postCount, Integer recommendWeight, Boolean homeVisible, Integer sortOrder,
                               String status, Instant createdAt, Instant updatedAt, String coverUrl) {
        static CircleDetail from(DalanCircleV1 row, List<Long> adminIds, String coverUrl) {
            return new CircleDetail(row.getId(), row.getOwnerId(), row.getName(), row.getCover(), row.getDescription(),
                row.getCategory(), JsonUtils.parseArray(row.getTags(), String.class), adminIds, row.getMemberCount(),
                row.getPostCount(), row.getRecommendWeight(), row.getHomeVisible(), row.getSortOrder(), row.getStatus(),
                row.getCreatedAt(), row.getUpdatedAt(), coverUrl);
        }
    }
}
