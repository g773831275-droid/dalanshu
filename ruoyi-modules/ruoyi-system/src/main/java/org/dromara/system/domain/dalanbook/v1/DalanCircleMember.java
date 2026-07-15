package org.dromara.system.domain.dalanbook.v1;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.Instant;

@Data
@TableName("dalan_circle_member")
public class DalanCircleMember {
    private String circleId;
    private Long userId;
    private String role;
    private Instant joinedAt;
}
