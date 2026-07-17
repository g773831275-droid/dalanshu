package org.dromara.system.domain.dalanbook.v1;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.Instant;

@Data
@TableName("dalan_video_asset")
public class DalanVideoAsset {
    @TableId
    private String id;
    private Long authorId;
    private String vodVid;
    private String fileName;
    private String contentType;
    private Long fileSize;
    private String status;
    private String posterUrl;
    private Long durationMs;
    private Integer width;
    private Integer height;
    private String failureReason;
    private String callbackEventId;
    private Instant uploadExpiresAt;
    private Instant createdAt;
    private Instant updatedAt;
}
