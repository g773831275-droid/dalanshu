package org.dromara.system.service.dalanbook;

import cn.dev33.satoken.annotation.SaIgnore;
import org.dromara.common.core.exception.ServiceException;
import org.dromara.system.controller.dalanbook.v1.DalanbookV1Controller;
import org.dromara.system.domain.dalanbook.v1.DalanHomePlacement;
import org.dromara.system.domain.vo.SysOssVo;
import org.dromara.system.mapper.dalanbook.v1.DalanHomePlacementMapper;
import org.dromara.system.service.ISysOssService;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Proxy;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("dev")
class DalanHomePlacementServiceTest {

    @Test
    void publicPlacementEndpointAllowsAnonymousRequests() throws Exception {
        assertTrue(DalanbookV1Controller.class.getDeclaredMethod("homePlacements")
            .isAnnotationPresent(SaIgnore.class));
    }

    @Test
    void selectsOnlyActiveHighestPriorityAndLatestPublishedPlacement() {
        Instant now = Instant.parse("2026-07-21T08:00:00Z");
        DalanHomePlacement lowerPriority = placement("ad_low", 10, "2026-07-21T07:00:00Z");
        DalanHomePlacement olderTie = placement("ad_old", 20, "2026-07-21T06:00:00Z");
        DalanHomePlacement winner = placement("ad_winner", 20, "2026-07-21T07:30:00Z");
        DalanHomePlacement future = placement("ad_future", 100, "2026-07-21T07:50:00Z");
        future.setStartsAt(Instant.parse("2026-07-21T09:00:00Z"));
        DalanHomePlacement expired = placement("ad_expired", 100, "2026-07-21T07:50:00Z");
        expired.setEndsAt(now);
        DalanHomePlacement hidden = placement("ad_hidden", 100, "2026-07-21T07:50:00Z");
        hidden.setStatus(DalanHomePlacementService.HIDDEN);

        DalanHomePlacement result = DalanHomePlacementService.selectWinner(
            List.of(lowerPriority, olderTie, winner, future, expired, hidden),
            DalanHomePlacementService.POPUP_AD, now);

        assertNotNull(result);
        assertEquals("ad_winner", result.getId());
    }

    @Test
    void validatesRequiredFieldsScheduleAndLinkPairing() {
        DalanHomePlacementService.Command popup = popupCommand("/topics/example");
        assertDoesNotThrow(() -> DalanHomePlacementService.validateCommand(popup));

        assertThrows(ServiceException.class, () -> DalanHomePlacementService.validateCommand(
            command(DalanHomePlacementService.POPUP_AD, "", null, 1L, "查看", "/topics/example", null, null)));
        assertThrows(ServiceException.class, () -> DalanHomePlacementService.validateCommand(
            command(DalanHomePlacementService.PINNED_NOTICE, "公告", "", null, null, null, null, null)));
        assertThrows(ServiceException.class, () -> DalanHomePlacementService.validateCommand(
            command(DalanHomePlacementService.POPUP_AD, "广告", null, 1L, "查看", null, null, null)));
        assertThrows(ServiceException.class, () -> DalanHomePlacementService.validateCommand(
            command(DalanHomePlacementService.POPUP_AD, "广告", null, 1L, null, null,
                Instant.parse("2026-07-21T09:00:00Z"), Instant.parse("2026-07-21T08:00:00Z"))));
    }

    @Test
    void acceptsInternalAndHttpsTargetsAndRejectsUnsafeUrls() {
        assertDoesNotThrow(() -> DalanHomePlacementService.validateTargetUrl("/topics/example?from=ad"));
        assertDoesNotThrow(() -> DalanHomePlacementService.validateTargetUrl("https://example.com/campaign"));

        for (String invalid : List.of("//example.com", "http://example.com", "javascript:alert(1)",
            "https://user@example.com/path", "https://example.com/a path", "/\\evil")) {
            assertThrows(ServiceException.class, () -> DalanHomePlacementService.validateTargetUrl(invalid), invalid);
        }
    }

    @Test
    void rejectsMissingOrUnsupportedPopupImage() {
        State state = new State();
        DalanHomePlacementService missingService = service(state, null);
        assertThrows(ServiceException.class, () -> missingService.create(popupCommand("/topics/example")));

        SysOssVo gif = new SysOssVo();
        gif.setOssId(1L);
        gif.setFileSuffix("gif");
        DalanHomePlacementService gifService = service(state, gif);
        assertThrows(ServiceException.class, () -> gifService.create(popupCommand("/topics/example")));

        SysOssVo oversized = new SysOssVo();
        oversized.setOssId(1L);
        oversized.setFileSuffix("jpg");
        oversized.setExt1("{\"fileSize\":5242881}");
        DalanHomePlacementService oversizedService = service(state, oversized);
        assertThrows(ServiceException.class, () -> oversizedService.create(popupCommand("/topics/example")));
    }

    @Test
    void popupEditIncrementsVersionAndRemoveUsesSoftDelete() {
        State state = new State();
        DalanHomePlacement row = placement("ad_existing", 1, "2026-07-21T07:00:00Z");
        row.setDisplayVersion(2);
        state.rows.put(row.getId(), row);
        SysOssVo image = new SysOssVo();
        image.setOssId(1L);
        image.setFileSuffix(".webp");
        DalanHomePlacementService service = service(state, image);

        service.update(row.getId(), popupCommand("https://example.com/campaign"));

        assertEquals(3, state.rows.get(row.getId()).getDisplayVersion());
        assertEquals("https://example.com/campaign", state.rows.get(row.getId()).getTargetUrl());

        service.remove(row.getId());
        assertEquals(DalanHomePlacementService.DELETED, state.rows.get(row.getId()).getStatus());
    }

    private static DalanHomePlacement placement(String id, int priority, String publishedAt) {
        DalanHomePlacement row = new DalanHomePlacement();
        row.setId(id);
        row.setPlacementType(DalanHomePlacementService.POPUP_AD);
        row.setTitle("广告");
        row.setImageOssId(1L);
        row.setPriority(priority);
        row.setStatus(DalanHomePlacementService.PUBLISHED);
        row.setPublishedAt(Instant.parse(publishedAt));
        return row;
    }

    private static DalanHomePlacementService.Command popupCommand(String targetUrl) {
        return command(DalanHomePlacementService.POPUP_AD, "广告", null, 1L, "立即查看", targetUrl, null, null);
    }

    private static DalanHomePlacementService.Command command(String type, String title, String content, Long imageOssId,
                                                              String ctaText, String targetUrl, Instant startsAt,
                                                              Instant endsAt) {
        return new DalanHomePlacementService.Command(type, title, "摘要", content, imageOssId, ctaText, targetUrl,
            10, DalanHomePlacementService.PUBLISHED, startsAt, endsAt);
    }

    private static DalanHomePlacementService service(State state, SysOssVo oss) {
        DalanHomePlacementMapper mapper = (DalanHomePlacementMapper) Proxy.newProxyInstance(
            DalanHomePlacementMapper.class.getClassLoader(), new Class<?>[]{DalanHomePlacementMapper.class},
            (proxy, method, args) -> switch (method.getName()) {
                case "selectById" -> state.rows.get(String.valueOf(args[0]));
                case "insert" -> {
                    DalanHomePlacement row = (DalanHomePlacement) args[0];
                    state.rows.put(row.getId(), row);
                    yield 1;
                }
                case "updateById" -> {
                    DalanHomePlacement row = (DalanHomePlacement) args[0];
                    state.rows.put(row.getId(), row);
                    yield 1;
                }
                default -> throw new UnsupportedOperationException(method.getName());
            });
        ISysOssService ossService = (ISysOssService) Proxy.newProxyInstance(
            ISysOssService.class.getClassLoader(), new Class<?>[]{ISysOssService.class},
            (proxy, method, args) -> switch (method.getName()) {
                case "getById" -> oss;
                case "getImageAccessUrl", "getAccessUrl" -> "https://cdn.example.com/ad.webp";
                default -> throw new UnsupportedOperationException(method.getName());
            });
        return new DalanHomePlacementService(mapper, ossService);
    }

    private static final class State {
        private final Map<String, DalanHomePlacement> rows = new HashMap<>();
    }
}
