package org.dromara.system.controller.dalanbook;

import cn.dev33.satoken.annotation.SaIgnore;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.dromara.common.core.domain.R;
import org.dromara.system.domain.dalanbook.DalanCircle;
import org.dromara.system.domain.dalanbook.DalanPost;
import org.dromara.system.mapper.DalanCircleMapper;
import org.dromara.system.mapper.DalanPostMapper;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@SaIgnore
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/dalanbook")
public class DalanbookController {

    private final DalanCircleMapper circleMapper;
    private final DalanPostMapper postMapper;

    @GetMapping("/circles")
    public R<List<CircleView>> circles(@RequestParam(required = false) String category) {
        LambdaQueryWrapper<DalanCircle> query = new LambdaQueryWrapper<DalanCircle>()
            .eq(DalanCircle::getStatus, "published")
            .eq(category != null && !category.isBlank() && !"全部".equals(category), DalanCircle::getCategory, category)
            .orderByAsc(DalanCircle::getSortOrder);
        return R.ok(circleMapper.selectList(query).stream().map(CircleView::from).toList());
    }

    @GetMapping("/circles/{id}")
    public R<CircleView> circle(@PathVariable String id) {
        DalanCircle circle = circleMapper.selectById(id);
        if (circle == null) {
            return R.fail(404, "圈子不存在");
        }
        return R.ok(CircleView.from(circle));
    }

    @GetMapping("/feed")
    public R<List<PostView>> feed(
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String circleId,
        @RequestParam(defaultValue = "recommend") String sort
    ) {
        List<DalanCircle> circles = circleMapper.selectList(new LambdaQueryWrapper<DalanCircle>()
            .eq(DalanCircle::getStatus, "published"));
        Map<String, DalanCircle> circleMap = circles.stream()
            .collect(Collectors.toMap(DalanCircle::getId, Function.identity()));
        Set<String> allowedCircleIds = circles.stream()
            .filter(c -> category == null || category.isBlank() || "推荐".equals(category) || category.equals(c.getCategory()))
            .map(DalanCircle::getId)
            .collect(Collectors.toSet());

        LambdaQueryWrapper<DalanPost> query = new LambdaQueryWrapper<DalanPost>()
            .eq(DalanPost::getStatus, "published")
            .eq(circleId != null && !circleId.isBlank(), DalanPost::getCircleId, circleId)
            .in(circleId == null && !allowedCircleIds.isEmpty(), DalanPost::getCircleId, allowedCircleIds);
        if ("latest".equals(sort)) {
            query.orderByDesc(DalanPost::getCreateTime);
        } else {
            query.orderByDesc(DalanPost::getUsefulCount).orderByDesc(DalanPost::getCreateTime);
        }
        List<PostView> result = postMapper.selectList(query.last("limit 60")).stream()
            .map(post -> PostView.from(post, circleMap.get(post.getCircleId())))
            .toList();
        return R.ok(result);
    }

    @GetMapping("/posts/{id}")
    public R<PostView> post(@PathVariable String id) {
        DalanPost post = postMapper.selectById(id);
        if (post == null || !"published".equals(post.getStatus())) {
            return R.fail(404, "帖子不存在");
        }
        return R.ok(PostView.from(post, circleMapper.selectById(post.getCircleId())));
    }

    @PostMapping("/posts")
    @Transactional(rollbackFor = Exception.class)
    public R<PostView> publish(@Valid @RequestBody PublishPostRequest request) {
        DalanCircle circle = circleMapper.selectById(request.circleId());
        if (circle == null || !"published".equals(circle.getStatus())) {
            return R.fail(400, "请选择有效圈子");
        }
        Date now = new Date();
        DalanPost post = new DalanPost();
        post.setId("p" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        post.setCircleId(circle.getId());
        post.setTitle(request.title().trim());
        post.setContent(request.content() == null ? "" : request.content().trim());
        post.setCoverKey(request.coverKey() == null || request.coverKey().isBlank() ? "cover-ai-desk" : request.coverKey());
        post.setImageRatio(request.imageRatio() == null ? "4/5" : request.imageRatio());
        post.setPostTag(request.postTag() == null ? "经验" : request.postTag());
        post.setTopics(String.join(",", request.topics() == null ? List.of() : request.topics()));
        post.setAuthorId(request.authorId() == null ? "prototype-user" : request.authorId());
        post.setAuthorName(request.authorName() == null || request.authorName().isBlank() ? "大蓝书用户" : request.authorName());
        post.setAvatarColor("#245BDB");
        post.setUsefulCount(0L);
        post.setLocation(request.location());
        post.setVisibility("circle".equals(request.visibility()) ? "circle" : "public");
        post.setStatus("published");
        post.setCreateTime(now);
        post.setUpdateTime(now);
        postMapper.insert(post);
        circle.setPostCount(Optional.ofNullable(circle.getPostCount()).orElse(0L) + 1);
        circleMapper.updateById(circle);
        return R.ok("发布成功", PostView.from(post, circle));
    }

    public record PublishPostRequest(
        @NotBlank @Size(max = 30) String title,
        @Size(max = 1000) String content,
        @NotBlank String circleId,
        String coverKey,
        String imageRatio,
        String postTag,
        List<String> topics,
        String authorId,
        String authorName,
        String location,
        String visibility
    ) {
    }

    public record CircleView(
        String id, String name, String coverKey, String desc, long memberCount,
        long postCount, String category, List<String> tags
    ) {
        static CircleView from(DalanCircle circle) {
            return new CircleView(circle.getId(), circle.getName(), circle.getCoverKey(), circle.getDescription(),
                Optional.ofNullable(circle.getMemberCount()).orElse(0L), Optional.ofNullable(circle.getPostCount()).orElse(0L),
                circle.getCategory(), split(circle.getTags()));
        }
    }

    public record PostView(
        String id, String circleId, String circle, String title, String content, String coverKey,
        String ratio, String tag, List<String> topics, String authorId, String author,
        String avatarColor, long useful, String location, String visibility, Date createTime
    ) {
        static PostView from(DalanPost post, DalanCircle circle) {
            return new PostView(post.getId(), post.getCircleId(), circle == null ? "" : circle.getName(), post.getTitle(),
                post.getContent(), post.getCoverKey(), post.getImageRatio(), post.getPostTag(), split(post.getTopics()),
                post.getAuthorId(), post.getAuthorName(), post.getAvatarColor(), Optional.ofNullable(post.getUsefulCount()).orElse(0L),
                post.getLocation(), post.getVisibility(), post.getCreateTime());
        }
    }

    private static List<String> split(String value) {
        return value == null || value.isBlank() ? List.of() : Arrays.stream(value.split(","))
            .map(String::trim).filter(s -> !s.isEmpty()).toList();
    }
}
