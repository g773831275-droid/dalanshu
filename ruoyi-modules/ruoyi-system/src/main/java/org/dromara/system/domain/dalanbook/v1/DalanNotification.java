package org.dromara.system.domain.dalanbook.v1;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.Instant;

@Data
@TableName("dalan_notification")
public class DalanNotification {
    @TableId
    private String id;
    private Long userId;
    private String type;
    private String payload;
    private Instant readAt;
    private Instant createdAt;
}
