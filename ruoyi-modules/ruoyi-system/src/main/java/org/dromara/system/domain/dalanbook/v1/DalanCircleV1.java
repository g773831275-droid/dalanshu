package org.dromara.system.domain.dalanbook.v1;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.Instant;

@Data
@TableName("dalan_circle_v1")
public class DalanCircleV1 {
    @TableId
    private String id;
    private Long ownerId;
    private String name;
    private String cover;
    private String description;
    private String category;
    private String tags;
    private Long memberCount;
    private Long postCount;
    private Integer recommendWeight;
    private Boolean homeVisible;
    private Integer sortOrder;
    private String status;
    private Instant createdAt;
    private Instant updatedAt;
}
