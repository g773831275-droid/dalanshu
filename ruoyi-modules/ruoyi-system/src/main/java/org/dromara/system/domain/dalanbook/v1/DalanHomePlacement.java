package org.dromara.system.domain.dalanbook.v1;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.Instant;

/**
 * 首页运营位。
 */
@Data
@TableName("dalan_home_placement")
public class DalanHomePlacement {

    @TableId
    private String id;
    private String placementType;
    private String title;
    private String summary;
    private String content;
    private Long imageOssId;
    private String ctaText;
    private String targetUrl;
    private Integer priority;
    private String status;
    private Instant startsAt;
    private Instant endsAt;
    private Integer displayVersion;
    private Long operatorId;
    private Instant publishedAt;
    private Instant createdAt;
    private Instant updatedAt;
}
