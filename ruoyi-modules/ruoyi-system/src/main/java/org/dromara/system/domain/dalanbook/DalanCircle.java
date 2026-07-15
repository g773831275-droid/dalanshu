package org.dromara.system.domain.dalanbook;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("dalan_circle")
public class DalanCircle {

    @TableId
    private String id;
    private String name;
    private String coverKey;
    private String description;
    private Long memberCount;
    private Long postCount;
    private String category;
    private String tags;
    private Integer sortOrder;
    private String status;
}
