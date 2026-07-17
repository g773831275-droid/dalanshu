package org.dromara.system.domain.dalanbook.v1;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.Instant;

@Data
@TableName("dalan_circle_pinned_item")
public class DalanCirclePinnedItem {
    @TableId
    private String id;
    private String circleId;
    private String kind;
    private String title;
    private String content;
    private String images;
    private Long publisherId;
    private Long viewCount;
    private String activityStatus;
    private Integer sortOrder;
    private String status;
    private Instant publishedAt;
    private Instant createdAt;
    private Instant updatedAt;
}
