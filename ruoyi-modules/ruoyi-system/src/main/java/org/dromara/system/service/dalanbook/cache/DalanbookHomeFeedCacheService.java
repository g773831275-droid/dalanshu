package org.dromara.system.service.dalanbook.cache;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.dromara.common.core.constant.CacheNames;
import org.dromara.system.domain.SysUser;
import org.dromara.system.domain.dalanbook.v1.DalanCircleV1;
import org.dromara.system.domain.dalanbook.v1.DalanPostStats;
import org.dromara.system.domain.dalanbook.v1.DalanPostV1;
import org.dromara.system.domain.dalanbook.v1.DalanVideoAsset;
import org.dromara.system.mapper.SysUserMapper;
import org.dromara.system.mapper.dalanbook.v1.DalanCircleV1Mapper;
import org.dromara.system.mapper.dalanbook.v1.DalanPostStatsMapper;
import org.dromara.system.mapper.dalanbook.v1.DalanPostV1Mapper;
import org.dromara.system.mapper.dalanbook.v1.DalanVideoAssetMapper;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 大蓝书首页首屏公共数据缓存。
 */
@Service
@RequiredArgsConstructor
public class DalanbookHomeFeedCacheService {

    private static final Map<String, String> CATEGORY_NAMES = Map.of(
        "career", "职场成长", "ai", "AI 工具", "fitness", "健身运动", "digital", "数码装备",
        "lifestyle", "男士生活", "outdoor", "户外兴趣", "reading", "阅读写作"
    );

    private final DalanCircleV1Mapper circleMapper;
    private final DalanPostV1Mapper postMapper;
    private final DalanPostStatsMapper statsMapper;
    private final DalanVideoAssetMapper videoAssetMapper;
    private final SysUserMapper userMapper;

    /**
     * 缓存推荐/最新频道第一页。sync 可避免单实例内同一缓存键并发回源。
     */
    @Cacheable(cacheNames = CacheNames.DALANBOOK_HOME_FEED,
        key = "#channel + ':' + #categoryId + ':' + #limit", sync = true)
    public DalanbookHomeFeedSnapshot loadFirstPage(String categoryId, String channel, int limit) {
        Set<String> circleIds = categoryCircleIds(categoryId);
        if (circleIds.isEmpty() && !isSystemCategory(categoryId)) {
            return emptySnapshot();
        }

        List<DalanPostV1> rows = postMapper.selectList(new LambdaQueryWrapper<DalanPostV1>()
            .eq(DalanPostV1::getStatus, "published")
            .eq(DalanPostV1::getVisibility, "public")
            .in(!circleIds.isEmpty(), DalanPostV1::getCircleId, circleIds)
            .orderByDesc(DalanPostV1::getCreatedAt)
            .orderByDesc(DalanPostV1::getId)
            .last("LIMIT " + (limit + 1)));
        boolean hasMore = rows.size() > limit;
        List<DalanPostV1> posts = new ArrayList<>(hasMore ? rows.subList(0, limit) : rows);
        if (posts.isEmpty()) {
            return emptySnapshot();
        }

        Set<String> postIds = posts.stream().map(DalanPostV1::getId).collect(Collectors.toSet());
        Set<String> usedCircleIds = posts.stream().map(DalanPostV1::getCircleId).collect(Collectors.toSet());
        Set<Long> authorIds = posts.stream().map(DalanPostV1::getAuthorId).collect(Collectors.toSet());
        Set<String> videoIds = posts.stream().map(DalanPostV1::getVideoAssetId)
            .filter(value -> value != null && !value.isBlank()).collect(Collectors.toSet());

        Map<String, DalanCircleV1> circles = index(circleMapper.selectBatchIds(usedCircleIds), DalanCircleV1::getId);
        Map<String, DalanPostStats> stats = index(statsMapper.selectBatchIds(postIds), DalanPostStats::getPostId);
        Map<String, DalanVideoAsset> videos = videoIds.isEmpty()
            ? new HashMap<>() : index(videoAssetMapper.selectBatchIds(videoIds), DalanVideoAsset::getId);
        Map<Long, DalanbookHomeFeedSnapshot.FeedAuthor> authors = new LinkedHashMap<>();
        userMapper.selectList(new LambdaQueryWrapper<SysUser>()
                .select(SysUser::getUserId, SysUser::getNickName, SysUser::getAvatar)
                .in(SysUser::getUserId, authorIds))
            .forEach(user -> authors.put(user.getUserId(), new DalanbookHomeFeedSnapshot.FeedAuthor(
                user.getUserId(), user.getNickName(), user.getAvatar())));

        return new DalanbookHomeFeedSnapshot(posts, circles, authors, stats, videos, hasMore);
    }

    /**
     * 新内容发布后清空数量很小的首页首屏缓存组。
     */
    @CacheEvict(cacheNames = CacheNames.DALANBOOK_HOME_FEED, allEntries = true)
    public void evictAll() {
        // 缓存清理由 Spring Cache 切面完成。
    }

    private Set<String> categoryCircleIds(String categoryId) {
        String category = CATEGORY_NAMES.get(categoryId);
        if (category == null) {
            return Set.of();
        }
        return circleMapper.selectList(new LambdaQueryWrapper<DalanCircleV1>()
                .select(DalanCircleV1::getId)
                .eq(DalanCircleV1::getStatus, "published")
                .eq(DalanCircleV1::getCategory, category))
            .stream().map(DalanCircleV1::getId).collect(Collectors.toSet());
    }

    private boolean isSystemCategory(String id) {
        return id == null || id.isBlank() || "recommend".equals(id) || "more".equals(id);
    }

    private DalanbookHomeFeedSnapshot emptySnapshot() {
        return new DalanbookHomeFeedSnapshot(new ArrayList<>(), new HashMap<>(), new HashMap<>(),
            new HashMap<>(), new HashMap<>(), false);
    }

    private <K, V> Map<K, V> index(Collection<V> values, Function<V, K> keyMapper) {
        return values.stream().collect(Collectors.toMap(keyMapper, Function.identity(), (left, right) -> left,
            LinkedHashMap::new));
    }
}
