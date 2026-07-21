package org.dromara.system.controller.dalanbook;

import cn.dev33.satoken.annotation.SaCheckPermission;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.dromara.common.core.domain.R;
import org.dromara.common.log.annotation.Log;
import org.dromara.common.log.enums.BusinessType;
import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.system.service.dalanbook.DalanHomePlacementService;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Arrays;

@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/dalanbook/admin/home-placements")
public class DalanHomePlacementAdminController {
    private final DalanHomePlacementService service;

    @SaCheckPermission("dalanbook:home-placement:list")
    @GetMapping
    public TableDataInfo<DalanHomePlacementService.AdminView> list(
        @RequestParam(required = false) String placementType,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String keyword,
        PageQuery pageQuery) {
        return service.page(placementType, status, keyword, pageQuery);
    }

    @SaCheckPermission("dalanbook:home-placement:list")
    @GetMapping("/{id}")
    public R<DalanHomePlacementService.AdminView> detail(@PathVariable String id) {
        return R.ok(service.detail(id));
    }

    @SaCheckPermission("dalanbook:home-placement:add")
    @Log(title = "首页运营位", businessType = BusinessType.INSERT)
    @PostMapping
    public R<String> add(@Valid @RequestBody PlacementRequest request) {
        return R.ok(service.create(request.command()));
    }

    @SaCheckPermission("dalanbook:home-placement:edit")
    @Log(title = "首页运营位", businessType = BusinessType.UPDATE)
    @PutMapping("/{id}")
    public R<Void> edit(@PathVariable String id, @Valid @RequestBody PlacementRequest request) {
        service.update(id, request.command());
        return R.ok();
    }

    @SaCheckPermission("dalanbook:home-placement:remove")
    @Log(title = "首页运营位", businessType = BusinessType.DELETE)
    @DeleteMapping("/{ids}")
    public R<Void> remove(@PathVariable String ids) {
        Arrays.stream(ids.split(","))
            .map(String::trim)
            .filter(value -> !value.isEmpty())
            .forEach(service::remove);
        return R.ok();
    }

    public record PlacementRequest(
        @NotBlank @Size(max = 20) String placementType,
        @NotBlank @Size(max = 120) String title,
        @Size(max = 500) String summary,
        @Size(max = 20000) String content,
        Long imageOssId,
        @Size(max = 40) String ctaText,
        @Size(max = 500) String targetUrl,
        @NotNull @Min(-100000) @Max(100000) Integer priority,
        @NotBlank @Size(max = 20) String status,
        Instant startsAt,
        Instant endsAt
    ) {
        DalanHomePlacementService.Command command() {
            return new DalanHomePlacementService.Command(placementType, title, summary, content, imageOssId,
                ctaText, targetUrl, priority, status, startsAt, endsAt);
        }
    }
}
