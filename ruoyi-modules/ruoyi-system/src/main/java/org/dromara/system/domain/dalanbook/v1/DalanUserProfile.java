package org.dromara.system.domain.dalanbook.v1;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.Instant;

@Data
@TableName("dalan_user_profile")
public class DalanUserProfile {
    @TableId
    private Long userId;
    private String bio;
    private String gender;
    private String location;
    private String ageRange;
    private String provinceCode;
    private String provinceName;
    private String cityCode;
    private String cityName;
    private Long followerCount;
    private Long followingCount;
    private Long postCount;
    private Instant createdAt;
    private Instant updatedAt;
}
