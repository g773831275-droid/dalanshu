package org.dromara.system.domain.dalanbook.v1;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.Instant;

@Data
@TableName("dalan_topic")
public class DalanTopic {
    @TableId
    private String id;
    private String slug;
    private String name;
    private String normalizedName;
    private String description;
    private Long postCount;
    private String status;
    private Instant createdAt;
    private Instant updatedAt;
}
