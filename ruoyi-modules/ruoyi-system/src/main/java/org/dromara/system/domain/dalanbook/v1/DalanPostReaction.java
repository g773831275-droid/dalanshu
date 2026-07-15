package org.dromara.system.domain.dalanbook.v1;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.Instant;

@Data
@TableName("dalan_post_reaction")
public class DalanPostReaction {
    private String postId;
    private Long userId;
    private String type;
    private Instant createdAt;
}
