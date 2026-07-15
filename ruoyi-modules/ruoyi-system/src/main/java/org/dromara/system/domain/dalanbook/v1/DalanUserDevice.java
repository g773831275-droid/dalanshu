package org.dromara.system.domain.dalanbook.v1;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@TableName("dalan_user_device")
public class DalanUserDevice {
    @TableId
    private String id;
    private Long userId;
    private String deviceIdHash;
    private String source;
    private String deviceType;
    private String brand;
    private String model;
    private String os;
    private String osVersion;
    private String browser;
    private String browserVersion;
    private Integer screenWidth;
    private Integer screenHeight;
    private BigDecimal pixelRatio;
    private String language;
    private String timezone;
    private Instant firstSeenAt;
    private Instant lastSeenAt;
}
