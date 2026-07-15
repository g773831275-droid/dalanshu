package org.dromara.system.domain.dalanbook.v1;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.Instant;

@Data
@TableName("dalan_follow")
public class DalanFollow {
    private Long followerId;
    private Long followeeId;
    private Instant createdAt;
}
