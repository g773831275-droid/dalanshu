package org.dromara.system.domain.dalanbook.v1;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.Instant;

@Data
@TableName("dalan_post_topic")
public class DalanPostTopic {
    private String postId;
    private String topicId;
    private Instant createdAt;
}
