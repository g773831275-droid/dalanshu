package org.dromara.system.service.dalanbook;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.dromara.common.core.exception.ServiceException;
import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.common.oss.enums.OssImageStyle;
import org.dromara.common.satoken.utils.LoginHelper;
import org.dromara.system.controller.dalanbook.v1.DalanbookDtos.HomePlacementsResponse;
import org.dromara.system.controller.dalanbook.v1.DalanbookDtos.PinnedNoticeDto;
import org.dromara.system.controller.dalanbook.v1.DalanbookDtos.PopupAdDto;
import org.dromara.system.domain.dalanbook.v1.DalanHomePlacement;
import org.dromara.system.domain.SysOssExt;
import org.dromara.system.domain.vo.SysOssVo;
import org.dromara.system.mapper.dalanbook.v1.DalanHomePlacementMapper;
import org.dromara.system.service.ISysOssService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.URISyntaxException;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/** 首页广告弹窗与置顶公告的业务规则和持久化。 */
@Service
@RequiredArgsConstructor
public class DalanHomePlacementService {
    public static final String POPUP_AD = "popup_ad";
    public static final String PINNED_NOTICE = "pinned_notice";
    public static final String PUBLISHED = "published";
    public static final String HIDDEN = "hidden";
    public static final String DELETED = "deleted";

    private static final Set<String> TYPES = Set.of(POPUP_AD, PINNED_NOTICE);
    private static final Set<String> MUTABLE_STATUSES = Set.of(PUBLISHED, HIDDEN);
    private static final Set<String> IMAGE_SUFFIXES = Set.of("jpg", "jpeg", "png", "webp");
    private static final long MAX_IMAGE_SIZE = 5L * 1024 * 1024;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final Comparator<DalanHomePlacement> WINNER_ORDER =
        Comparator.comparing(DalanHomePlacement::getPriority, Comparator.nullsFirst(Comparator.naturalOrder()))
            .thenComparing(DalanHomePlacement::getPublishedAt, Comparator.nullsFirst(Comparator.naturalOrder()))
            .thenComparing(DalanHomePlacement::getId, Comparator.nullsFirst(Comparator.naturalOrder()));

    private final DalanHomePlacementMapper mapper;
    private final ISysOssService ossService;

    public HomePlacementsResponse activePlacements() {
        Instant now = Instant.now();
        List<DalanHomePlacement> rows = mapper.selectList(new LambdaQueryWrapper<DalanHomePlacement>()
            .in(DalanHomePlacement::getPlacementType, TYPES)
            .eq(DalanHomePlacement::getStatus, PUBLISHED));
        DalanHomePlacement popup = selectWinner(rows, POPUP_AD, now);
        DalanHomePlacement notice = selectWinner(rows, PINNED_NOTICE, now);
        return new HomePlacementsResponse(toPopup(popup), toNotice(notice));
    }

    public TableDataInfo<AdminView> page(String placementType, String status, String keyword, PageQuery pageQuery) {
        Page<DalanHomePlacement> page = mapper.selectPage(pageQuery.build(), new LambdaQueryWrapper<DalanHomePlacement>()
            .eq(StringUtils.hasText(placementType), DalanHomePlacement::getPlacementType, placementType)
            .eq(StringUtils.hasText(status), DalanHomePlacement::getStatus, status)
            .ne(DalanHomePlacement::getStatus, DELETED)
            .and(StringUtils.hasText(keyword), wrapper -> wrapper.like(DalanHomePlacement::getTitle, keyword.trim())
                .or().like(DalanHomePlacement::getSummary, keyword.trim()))
            .orderByDesc(DalanHomePlacement::getUpdatedAt)
            .orderByDesc(DalanHomePlacement::getPublishedAt));
        return new TableDataInfo<>(page.getRecords().stream().map(this::toAdmin).toList(), page.getTotal());
    }

    public AdminView detail(String id) {
        DalanHomePlacement row = mapper.selectById(id);
        if (row == null || DELETED.equals(row.getStatus())) {
            throw new ServiceException("首页运营位不存在");
        }
        return toAdmin(row);
    }

    @Transactional
    public String create(Command command) {
        validate(command);
        SysOssVo oss = validateImage(command);
        Instant now = Instant.now();
        DalanHomePlacement row = new DalanHomePlacement();
        row.setId(newId(command.placementType()));
        apply(row, command, oss, now, true);
        row.setCreatedAt(now);
        row.setUpdatedAt(now);
        mapper.insert(row);
        return row.getId();
    }

    @Transactional
    public void update(String id, Command command) {
        validate(command);
        DalanHomePlacement row = mapper.selectById(id);
        if (row == null || DELETED.equals(row.getStatus())) {
            throw new ServiceException("首页运营位不存在");
        }
        if (!row.getPlacementType().equals(command.placementType())) {
            throw new ServiceException("运营位类型不能修改");
        }
        SysOssVo oss = validateImage(command);
        Instant now = Instant.now();
        String previousStatus = row.getStatus();
        apply(row, command, oss, now, false);
        if (POPUP_AD.equals(command.placementType())) {
            row.setDisplayVersion(Math.max(1, Objects.requireNonNullElse(row.getDisplayVersion(), 0)) + 1);
        }
        if (PUBLISHED.equals(command.status()) && !PUBLISHED.equals(previousStatus)) {
            row.setPublishedAt(now);
        }
        row.setUpdatedAt(now);
        mapper.updateById(row);
    }

    @Transactional
    public void remove(String id) {
        DalanHomePlacement row = mapper.selectById(id);
        if (row == null || DELETED.equals(row.getStatus())) {
            return;
        }
        row.setStatus(DELETED);
        row.setOperatorId(currentOperatorId());
        row.setUpdatedAt(Instant.now());
        mapper.updateById(row);
    }

    static DalanHomePlacement selectWinner(List<DalanHomePlacement> rows, String type, Instant now) {
        return rows.stream()
            .filter(row -> type.equals(row.getPlacementType()))
            .filter(row -> isActive(row, now))
            .max(WINNER_ORDER)
            .orElse(null);
    }

    static boolean isActive(DalanHomePlacement row, Instant now) {
        return row != null && PUBLISHED.equals(row.getStatus())
            && (row.getStartsAt() == null || !row.getStartsAt().isAfter(now))
            && (row.getEndsAt() == null || row.getEndsAt().isAfter(now));
    }

    static void validateCommand(Command command) {
        if (command == null || !TYPES.contains(command.placementType())) {
            throw new ServiceException("运营位类型不正确");
        }
        if (!MUTABLE_STATUSES.contains(command.status())) {
            throw new ServiceException("运营位状态不正确");
        }
        requireText(command.title(), "标题不能为空");
        if (command.title().trim().length() > 120) throw new ServiceException("标题不能超过120个字符");
        if (command.summary() != null && command.summary().length() > 500) throw new ServiceException("摘要不能超过500个字符");
        if (command.content() != null && command.content().length() > 20000) throw new ServiceException("正文不能超过20000个字符");
        if (command.ctaText() != null && command.ctaText().length() > 40) throw new ServiceException("按钮文案不能超过40个字符");
        if (command.targetUrl() != null && command.targetUrl().length() > 500) throw new ServiceException("目标链接不能超过500个字符");
        boolean hasCta = StringUtils.hasText(command.ctaText());
        boolean hasTarget = StringUtils.hasText(command.targetUrl());
        if (hasCta != hasTarget) throw new ServiceException("按钮文案与目标链接必须同时填写");
        if (POPUP_AD.equals(command.placementType())) {
            if (command.imageOssId() == null) throw new ServiceException("广告必须上传图片");
        } else if (!StringUtils.hasText(command.content())) {
            throw new ServiceException("公告正文不能为空");
        }
        if (command.priority() == null || command.priority() < -100000 || command.priority() > 100000) {
            throw new ServiceException("优先级必须在-100000至100000之间");
        }
        if (command.startsAt() != null && command.endsAt() != null && !command.endsAt().isAfter(command.startsAt())) {
            throw new ServiceException("结束时间必须晚于开始时间");
        }
        if (hasTarget) validateTargetUrl(command.targetUrl());
    }

    static void validateTargetUrl(String targetUrl) {
        if (targetUrl == null || targetUrl.indexOf('\\') >= 0 || targetUrl.chars().anyMatch(Character::isISOControl)
            || targetUrl.chars().anyMatch(Character::isWhitespace)) {
            throw new ServiceException("目标链接格式不正确");
        }
        if (targetUrl.startsWith("/") && !targetUrl.startsWith("//")) {
            return;
        }
        try {
            URI uri = new URI(targetUrl);
            if (!"https".equalsIgnoreCase(uri.getScheme()) || !StringUtils.hasText(uri.getHost())
                || uri.getUserInfo() != null || uri.getRawAuthority() == null) {
                throw new ServiceException("目标链接仅支持站内路径或HTTPS地址");
            }
        } catch (URISyntaxException ex) {
            throw new ServiceException("目标链接格式不正确");
        }
    }

    private void validate(Command command) {
        validateCommand(command);
        if (command.imageOssId() != null && !POPUP_AD.equals(command.placementType())) {
            throw new ServiceException("公告不能上传广告图片");
        }
    }

    private SysOssVo validateImage(Command command) {
        if (!POPUP_AD.equals(command.placementType())) return null;
        SysOssVo oss = ossService.getById(command.imageOssId());
        if (oss == null) throw new ServiceException("广告图片不存在");
        String suffix = oss.getFileSuffix();
        if (suffix == null) throw new ServiceException("广告图片格式不支持");
        suffix = suffix.toLowerCase(Locale.ROOT).replaceFirst("^\\.", "");
        if (!IMAGE_SUFFIXES.contains(suffix)) throw new ServiceException("广告图片仅支持JPEG、PNG或WebP");
        if (StringUtils.hasText(oss.getExt1())) {
            SysOssExt metadata;
            try {
                metadata = OBJECT_MAPPER.readValue(oss.getExt1(), SysOssExt.class);
            } catch (JsonProcessingException ex) {
                throw new ServiceException("广告图片元数据无效");
            }
            if (metadata != null && metadata.getFileSize() != null && metadata.getFileSize() > MAX_IMAGE_SIZE) {
                throw new ServiceException("广告图片不能超过5MB");
            }
        }
        return oss;
    }

    private void apply(DalanHomePlacement row, Command command, SysOssVo oss, Instant now, boolean creating) {
        row.setPlacementType(command.placementType());
        row.setTitle(command.title().trim());
        row.setSummary(blankToNull(command.summary()));
        row.setContent(blankToNull(command.content()));
        row.setImageOssId(oss == null ? null : command.imageOssId());
        row.setCtaText(blankToNull(command.ctaText()));
        row.setTargetUrl(blankToNull(command.targetUrl()));
        row.setPriority(command.priority());
        row.setStatus(command.status());
        row.setStartsAt(command.startsAt());
        row.setEndsAt(command.endsAt());
        row.setOperatorId(currentOperatorId());
        if (creating) {
            row.setDisplayVersion(1);
            row.setPublishedAt(PUBLISHED.equals(command.status()) ? now : null);
        }
    }

    private AdminView toAdmin(DalanHomePlacement row) {
        String imageUrl = row.getImageOssId() == null ? null : ossService.getImageAccessUrl(row.getImageOssId(), OssImageStyle.POST_FEED_720);
        return new AdminView(row.getId(), row.getPlacementType(), row.getTitle(), row.getSummary(), row.getContent(),
            row.getImageOssId(), imageUrl, row.getCtaText(), row.getTargetUrl(), row.getPriority(), row.getStatus(),
            row.getStartsAt(), row.getEndsAt(), row.getDisplayVersion(), row.getPublishedAt(), row.getOperatorId(),
            row.getCreatedAt(), row.getUpdatedAt());
    }

    private PopupAdDto toPopup(DalanHomePlacement row) {
        if (row == null) return null;
        String imageUrl = row.getImageOssId() == null ? null : ossService.getImageAccessUrl(row.getImageOssId(), OssImageStyle.POST_FEED_720);
        return new PopupAdDto(row.getId(), row.getDisplayVersion(), row.getTitle(), row.getSummary(), imageUrl, row.getCtaText(), row.getTargetUrl());
    }

    private PinnedNoticeDto toNotice(DalanHomePlacement row) {
        if (row == null) return null;
        return new PinnedNoticeDto(row.getId(), row.getTitle(), row.getSummary(), row.getContent(), row.getCtaText(), row.getTargetUrl(), row.getPublishedAt());
    }

    private static String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private static void requireText(String value, String message) {
        if (!StringUtils.hasText(value)) throw new ServiceException(message);
    }

    private static String newId(String type) {
        String prefix = POPUP_AD.equals(type) ? "ad_" : "notice_";
        return prefix + UUID.randomUUID().toString().replace("-", "").substring(0, 20);
    }

    private static Long currentOperatorId() {
        return LoginHelper.isLogin() ? LoginHelper.getUserId() : null;
    }

    public record Command(String placementType, String title, String summary, String content, Long imageOssId,
                          String ctaText, String targetUrl, Integer priority, String status,
                          Instant startsAt, Instant endsAt) {}

    public record AdminView(String id, String placementType, String title, String summary, String content,
                            Long imageOssId, String imageUrl, String ctaText, String targetUrl, Integer priority,
                            String status, Instant startsAt, Instant endsAt, Integer version, Instant publishedAt,
                            Long operatorId, Instant createdAt, Instant updatedAt) {}
}
