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
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.dromara.common.core.domain.R;
import org.dromara.common.json.utils.JsonUtils;
import org.dromara.common.log.annotation.Log;
import org.dromara.common.log.enums.BusinessType;
import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.system.domain.SysUser;
import org.dromara.system.domain.dalanbook.v1.DalanCircleMember;
import org.dromara.system.domain.dalanbook.v1.DalanCircleV1;
import org.dromara.system.domain.dalanbook.v1.DalanPostV1;
import org.dromara.system.domain.dalanbook.v1.DalanTopic;
import org.dromara.system.mapper.SysUserMapper;
import org.dromara.system.mapper.dalanbook.v1.DalanCircleMemberMapper;
import org.dromara.system.mapper.dalanbook.v1.DalanCircleV1Mapper;
import org.dromara.system.mapper.dalanbook.v1.DalanPostV1Mapper;
import org.dromara.system.mapper.dalanbook.v1.DalanTopicMapper;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/dalanbook/admin")
public class DalanbookAdminController {
    private static final Set<String> STATUSES = Set.of("published", "hidden", "deleted");
    private static final Set<String> CIRCLE_STATUSES = Set.of("published", "hidden", "frozen", "deleted");

    private final DalanPostV1Mapper postMapper;
    private final DalanCircleV1Mapper circleMapper;
    private final DalanCircleMemberMapper circleMemberMapper;
    private final DalanTopicMapper topicMapper;
    private final SysUserMapper userMapper;

    @SaCheckPermission("dalanbook:post:list")
    @GetMapping("/posts")
    public TableDataInfo<DalanPostV1> posts(String keyword, String status, PageQuery pageQuery) {
        Page<DalanPostV1> page = postMapper.selectPage(pageQuery.build(), new LambdaQueryWrapper<DalanPostV1>()
            .and(keyword != null && !keyword.isBlank(), w -> w.like(DalanPostV1::getTitle, keyword.trim())
                .or().like(DalanPostV1::getContent, keyword.trim()))
            .eq(status != null && !status.isBlank(), DalanPostV1::getStatus, status)
            .orderByDesc(DalanPostV1::getCreatedAt));
        return TableDataInfo.build(page);
    }

    @SaCheckPermission("dalanbook:circle:list")
    @GetMapping("/circles")
    public TableDataInfo<DalanCircleV1> circles(String keyword, String status, PageQuery pageQuery) {
        Page<DalanCircleV1> page = circleMapper.selectPage(pageQuery.build(), new LambdaQueryWrapper<DalanCircleV1>()
            .and(keyword != null && !keyword.isBlank(), w -> w.like(DalanCircleV1::getName, keyword.trim())
                .or().like(DalanCircleV1::getDescription, keyword.trim()))
            .eq(status != null && !status.isBlank(), DalanCircleV1::getStatus, status)
            .orderByDesc(DalanCircleV1::getCreatedAt));
        return TableDataInfo.build(page);
    }

    @SaCheckPermission("dalanbook:circle:list")
    @GetMapping("/circles/{id}")
    public R<CircleDetail> circle(@PathVariable String id) {
        DalanCircleV1 row = circleMapper.selectById(id);
        if (row == null) return R.fail("圈子不存在");
        List<Long> adminIds = circleMemberMapper.selectList(new LambdaQueryWrapper<DalanCircleMember>()
                .eq(DalanCircleMember::getCircleId, id).eq(DalanCircleMember::getRole, "admin"))
            .stream().map(DalanCircleMember::getUserId).toList();
        return R.ok(CircleDetail.from(row, adminIds));
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
        row.setName(request.name().trim());
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
    public record CircleDetail(String id, Long ownerId, String name, String cover, String description,
                               String category, List<String> tags, List<Long> adminIds, Long memberCount,
                               Long postCount, Integer recommendWeight, Boolean homeVisible, Integer sortOrder,
                               String status, Instant createdAt, Instant updatedAt) {
        static CircleDetail from(DalanCircleV1 row, List<Long> adminIds) {
            return new CircleDetail(row.getId(), row.getOwnerId(), row.getName(), row.getCover(), row.getDescription(),
                row.getCategory(), JsonUtils.parseArray(row.getTags(), String.class), adminIds, row.getMemberCount(),
                row.getPostCount(), row.getRecommendWeight(), row.getHomeVisible(), row.getSortOrder(), row.getStatus(),
                row.getCreatedAt(), row.getUpdatedAt());
        }
    }
}
