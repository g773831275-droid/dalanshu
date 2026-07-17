package org.dromara.system.domain.vo;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.dromara.common.sensitive.annotation.Sensitive;
import org.dromara.common.sensitive.core.SensitiveStrategy;
import org.dromara.common.translation.annotation.Translation;
import org.dromara.common.translation.constant.TransConstant;
import org.dromara.system.domain.SysUser;
import io.github.linpeilie.annotations.AutoMapper;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Date;
import java.util.List;


/**
 * 用户信息视图对象 sys_user
 *
 * @author Michelle.Chung
 */
@Data
@AutoMapper(target = SysUser.class)
public class SysUserVo implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 用户ID
     */
    private Long userId;

    /**
     * 租户ID
     */
    private String tenantId;

    /**
     * 部门ID
     */
    private Long deptId;

    /**
     * 用户账号
     */
    private String userName;

    /**
     * 用户昵称
     */
    private String nickName;

    /**
     * 用户类型（sys_user系统用户）
     */
    private String userType;

    /**
     * 用户邮箱
     */
    @Sensitive(strategy = SensitiveStrategy.EMAIL, perms = "system:user:edit")
    private String email;

    /**
     * 手机号码
     */
    @Sensitive(strategy = SensitiveStrategy.PHONE, perms = "system:user:edit")
    private String phonenumber;

    /**
     * 用户性别（0男 1女 2未知）
     */
    private String sex;

    /**
     * 头像地址
     */
    @Translation(type = TransConstant.OSS_ID_TO_URL)
    private Long avatar;

    /**
     * 密码
     */
    @JsonIgnore
    @JsonProperty
    private String password;

    /**
     * 账号状态（0正常 1停用）
     */
    private String status;

    /**
     * 最后登录IP
     */
    private String loginIp;

    /**
     * 最后登录时间
     */
    private Date loginDate;

    /**
     * 备注
     */
    private String remark;

    /**
     * 创建时间
     */
    private Date createTime;

    /**
     * 部门名
     */
    @Translation(type = TransConstant.DEPT_ID_TO_NAME, mapper = "deptId")
    private String deptName;

    /** 用户年龄段 */
    private String ageRange;

    /** 用户个人简介 */
    private String bio;

    /** 用户常住地域 */
    private String location;

    /** 用户省份编码 */
    private String provinceCode;

    /** 用户省份名称 */
    private String provinceName;

    /** 用户城市编码 */
    private String cityCode;

    /** 用户城市名称 */
    private String cityName;

    /** 粉丝数 */
    private Long followerCount;

    /** 关注数 */
    private Long followingCount;

    /** 发帖数 */
    private Long postCount;

    /** 最近活跃设备类型 */
    private String deviceType;

    /** 最近活跃设备来源 */
    private String deviceSource;

    /** 最近活跃设备品牌 */
    private String deviceBrand;

    /** 最近活跃设备型号 */
    private String deviceModel;

    /** 最近活跃设备系统 */
    private String deviceOs;

    /** 最近活跃设备系统版本 */
    private String deviceOsVersion;

    /** 最近活跃浏览器 */
    private String deviceBrowser;

    /** 最近活跃浏览器版本 */
    private String deviceBrowserVersion;

    /** 最近活跃设备屏幕宽度 */
    private Integer deviceScreenWidth;

    /** 最近活跃设备屏幕高度 */
    private Integer deviceScreenHeight;

    /** 最近活跃设备像素比 */
    private BigDecimal devicePixelRatio;

    /** 最近活跃设备语言 */
    private String deviceLanguage;

    /** 最近活跃设备时区 */
    private String deviceTimezone;

    /** 设备首次访问时间 */
    private Instant deviceFirstSeenAt;

    /** 设备最后访问时间 */
    private Instant deviceLastSeenAt;

    /** 更新时间 */
    private Date updateTime;

    /**
     * 角色对象
     */
    private List<SysRoleVo> roles;

    /**
     * 角色组
     */
    private Long[] roleIds;

    /**
     * 岗位组
     */
    private Long[] postIds;

    /**
     * 数据权限 当前角色ID
     */
    private Long roleId;

}
