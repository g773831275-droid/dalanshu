package org.dromara.system.domain.dalanbook.v1;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.Instant;

@Data
@TableName("dalan_post_v1")
public class DalanPostV1 {
    @TableId
    private String id;
    private Long authorId;
    private String circleId;
    private String title;
    private String content;
    private String images;
    private String videoAssetId;
    private String cover;
    private String ratio;
    private String tag;
    private String visibility;
    private String status;
    private Instant createdAt;
    private Instant updatedAt;
}
