package org.dromara.system.domain.dalanbook;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.util.Date;

@Data
@TableName("dalan_post")
public class DalanPost {

    @TableId
    private String id;
    private String circleId;
    private String title;
    private String content;
    private String coverKey;
    private String imageRatio;
    private String postTag;
    private String topics;
    private String authorId;
    private String authorName;
    private String avatarColor;
    private Long usefulCount;
    private String location;
    private String visibility;
    private String status;
    private Date createTime;
    private Date updateTime;
}
