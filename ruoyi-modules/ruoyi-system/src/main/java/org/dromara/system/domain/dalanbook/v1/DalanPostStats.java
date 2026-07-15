package org.dromara.system.domain.dalanbook.v1;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.Instant;

@Data
@TableName("dalan_post_stats")
public class DalanPostStats {
    @TableId
    private String postId;
    private Long usefulCount;
    private Long likeCount;
    private Long commentCount;
    private Long favoriteCount;
    private Instant updatedAt;
}
