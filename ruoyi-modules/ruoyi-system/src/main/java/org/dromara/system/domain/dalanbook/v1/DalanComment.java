package org.dromara.system.domain.dalanbook.v1;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.Instant;

@Data
@TableName("dalan_comment")
public class DalanComment {
    @TableId
    private String id;
    private String postId;
    private String parentId;
    private Long authorId;
    private String content;
    private String status;
    private Instant createdAt;
    private Instant updatedAt;
}
