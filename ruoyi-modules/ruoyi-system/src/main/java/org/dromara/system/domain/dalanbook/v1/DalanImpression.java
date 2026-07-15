package org.dromara.system.domain.dalanbook.v1;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.Instant;

@Data
@TableName("dalan_event_impression")
public class DalanImpression {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String anonymousId;
    private String postId;
    private String categoryId;
    private Instant occurredAt;
    private Instant createdAt;
}
