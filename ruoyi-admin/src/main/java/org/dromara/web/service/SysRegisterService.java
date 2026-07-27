package org.dromara.web.service;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.IdUtil;
import cn.hutool.crypto.digest.BCrypt;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.dromara.common.core.constant.Constants;
import org.dromara.common.core.constant.GlobalConstants;
import org.dromara.common.core.domain.model.RegisterBody;
import org.dromara.common.core.domain.model.RecoverPasswordBody;
import org.dromara.common.core.enums.UserType;
import org.dromara.common.core.exception.user.CaptchaException;
import org.dromara.common.core.exception.user.CaptchaExpireException;
import org.dromara.common.core.exception.user.UserException;
import org.dromara.common.core.exception.ServiceException;
import org.dromara.common.core.utils.MessageUtils;
import org.dromara.common.core.utils.ServletUtils;
import org.dromara.common.core.utils.SpringUtils;
import org.dromara.common.core.utils.StringUtils;
import org.dromara.common.log.event.LogininforEvent;
import org.dromara.common.redis.utils.RedisUtils;
import org.dromara.common.sms.service.SmsSender;
import org.dromara.common.tenant.helper.TenantHelper;
import org.dromara.system.domain.SysUser;
import org.dromara.system.domain.bo.SysUserBo;
import org.dromara.system.domain.vo.SysUserVo;
import org.dromara.system.mapper.SysUserMapper;
import org.dromara.system.service.ISysUserService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * 注册校验方法
 *
 * @author Lion Li
 */
@RequiredArgsConstructor
@Service
public class SysRegisterService {

    private final ISysUserService userService;
    private final SysUserMapper userMapper;
    private final SmsSender smsSender;

    @Value("${dalanbook.auth.default-user-dept-id:108}")
    private Long defaultUserDeptId;

    /**
     * 注册
     */
    public String register(RegisterBody registerBody) {
        String tenantId = registerBody.getTenantId();
        String phonenumber = registerBody.getPhonenumber().trim();
        String username = "u_" + IdUtil.getSnowflakeNextIdStr();
        String password = registerBody.getPassword();
        if (!isPhoneAvailable(phonenumber, tenantId)) {
            throw new ServiceException("该手机号已被注册");
        }
        validateSmsCode(phonenumber, registerBody.getSmsCode());
        SysUserBo sysUser = new SysUserBo();
        sysUser.setUserName(username);
        sysUser.setNickName("蓝书用户" + phonenumber.substring(phonenumber.length() - 4));
        sysUser.setPhonenumber(phonenumber);
        sysUser.setPassword(BCrypt.hashpw(password));
        sysUser.setUserType(UserType.SYS_USER.getUserType());
        sysUser.setDeptId(defaultUserDeptId);

        boolean regFlag = userService.registerUser(sysUser, tenantId);
        if (!regFlag) {
            throw new UserException("user.register.error");
        }
        recordLogininfor(tenantId, username, Constants.REGISTER, MessageUtils.message("user.register.success"));
        return username;
    }

    public boolean isEmailAvailable(String email, String tenantId) {
        String normalizedEmail = email.trim().toLowerCase();
        return TenantHelper.dynamic(tenantId, () -> !userMapper.exists(
            new LambdaQueryWrapper<SysUser>().eq(SysUser::getEmail, normalizedEmail)));
    }

    private boolean isPhoneAvailable(String phonenumber, String tenantId) {
        return TenantHelper.dynamic(tenantId, () -> !userMapper.exists(
            new LambdaQueryWrapper<SysUser>().eq(SysUser::getPhonenumber, phonenumber)));
    }

    private void validateSmsCode(String phonenumber, String submittedCode) {
        if (StringUtils.isBlank(submittedCode)) {
            throw new CaptchaException();
        }
        if (!smsSender.checkRegisterCode(phonenumber, submittedCode)) {
            throw new CaptchaException();
        }
    }

    public void recoverPassword(RecoverPasswordBody body, String tenantId) {
        String email = body.getEmail().trim().toLowerCase();
        validateEmailCode(email, "recover", body.getEmailCode());
        SysUserVo user = TenantHelper.dynamic(tenantId, () -> userMapper.selectVoOne(
            new LambdaQueryWrapper<SysUser>().eq(SysUser::getEmail, email)));
        if (user == null) {
            throw new UserException("user.not.exists", email);
        }
        TenantHelper.dynamic(tenantId,
            () -> userService.resetUserPwd(user.getUserId(), BCrypt.hashpw(body.getNewPassword())));
        StpUtil.logout(user.getUserType() + ":" + user.getUserId());
    }

    private void validateEmailCode(String email, String purpose, String submittedCode) {
        String key = GlobalConstants.CAPTCHA_CODE_KEY + "email:" + purpose + ":" + email;
        String cachedCode = RedisUtils.getCacheObject(key);
        if (StringUtils.isBlank(cachedCode)) {
            throw new CaptchaExpireException();
        }
        if (!StringUtils.equals(cachedCode, submittedCode)) {
            throw new CaptchaException();
        }
        RedisUtils.deleteObject(key);
    }

    /**
     * 校验验证码
     *
     * @param username 用户名
     * @param code     验证码
     * @param uuid     唯一标识
     */
    public void validateCaptcha(String tenantId, String username, String code, String uuid) {
        String verifyKey = GlobalConstants.CAPTCHA_CODE_KEY + StringUtils.blankToDefault(uuid, "");
        String captcha = RedisUtils.getCacheObject(verifyKey);
        RedisUtils.deleteObject(verifyKey);
        if (captcha == null) {
            recordLogininfor(tenantId, username, Constants.LOGIN_FAIL, MessageUtils.message("user.jcaptcha.expire"));
            throw new CaptchaExpireException();
        }
        if (!StringUtils.equalsIgnoreCase(code, captcha)) {
            recordLogininfor(tenantId, username, Constants.LOGIN_FAIL, MessageUtils.message("user.jcaptcha.error"));
            throw new CaptchaException();
        }
    }

    /**
     * 记录登录信息
     *
     * @param tenantId 租户ID
     * @param username 用户名
     * @param status   状态
     * @param message  消息内容
     * @return
     */
    private void recordLogininfor(String tenantId, String username, String status, String message) {
        LogininforEvent logininforEvent = new LogininforEvent();
        logininforEvent.setTenantId(tenantId);
        logininforEvent.setUsername(username);
        logininforEvent.setStatus(status);
        logininforEvent.setMessage(message);
        logininforEvent.setRequest(ServletUtils.getRequest());
        SpringUtils.context().publishEvent(logininforEvent);
    }

}
