package org.dromara.web.service;

import cn.dev33.satoken.stp.StpUtil;
import cn.dev33.satoken.stp.parameter.SaLoginParameter;
import cn.hutool.core.convert.Convert;
import cn.hutool.jwt.JWT;
import lombok.RequiredArgsConstructor;
import org.dromara.common.core.constant.SystemConstants;
import org.dromara.common.core.domain.model.LoginUser;
import org.dromara.common.redis.utils.RedisUtils;
import org.dromara.common.satoken.utils.LoginHelper;
import org.dromara.system.domain.vo.SysClientVo;
import org.dromara.system.domain.vo.SysUserVo;
import org.dromara.system.mapper.SysUserMapper;
import org.dromara.system.service.ISysClientService;
import org.dromara.web.domain.vo.LoginVo;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DalanRefreshTokenService {
    private static final Duration REFRESH_TTL = Duration.ofDays(30);
    private static final String TOKEN_TYPE = "refresh";
    private static final String REFRESH_KEY = "dalanbook:refresh:";

    private final SysUserMapper userMapper;
    private final ISysClientService clientService;
    private final SysLoginService loginService;

    @Value("${sa-token.jwt-secret-key}")
    private String secret;

    public LoginVo complete(LoginVo loginVo) {
        LoginUser loginUser = LoginHelper.getLoginUser();
        if (loginUser == null) {
            return loginVo;
        }
        String clientId = loginVo.getClientId();
        loginVo.setRefreshToken(issue(loginUser.getUserId(), clientId));
        loginVo.setRefreshExpireIn(REFRESH_TTL.toSeconds());
        return loginVo;
    }

    public LoginVo refresh(String refreshToken) {
        JWT jwt;
        try {
            jwt = JWT.of(refreshToken).setKey(secret.getBytes(StandardCharsets.UTF_8));
            if (!jwt.verify() || !jwt.validate(0) || !TOKEN_TYPE.equals(jwt.getPayload("type"))) {
                throw new IllegalArgumentException("invalid refresh token");
            }
        } catch (RuntimeException exception) {
            throw new IllegalArgumentException("refreshToken 无效或已过期", exception);
        }

        Long userId = Convert.toLong(jwt.getPayload("userId"));
        String clientId = Convert.toStr(jwt.getPayload("clientId"));
        String jwtId = Convert.toStr(jwt.getPayload("jti"));
        String tokenOwner = RedisUtils.getCacheObject(REFRESH_KEY + jwtId);
        if (!String.valueOf(userId).equals(tokenOwner)) {
            throw new IllegalArgumentException("refreshToken 已使用或已撤销");
        }
        RedisUtils.deleteObject(REFRESH_KEY + jwtId);
        SysUserVo user = userMapper.selectVoById(userId);
        if (user == null || !SystemConstants.NORMAL.equals(user.getStatus())) {
            throw new IllegalArgumentException("用户不存在或已停用");
        }
        SysClientVo client = clientService.queryByClientId(clientId);
        if (client == null || !SystemConstants.NORMAL.equals(client.getStatus())) {
            throw new IllegalArgumentException("客户端不可用");
        }

        LoginUser loginUser = loginService.buildLoginUser(user);
        loginUser.setClientKey(client.getClientKey());
        loginUser.setDeviceType(client.getDeviceType());
        SaLoginParameter model = new SaLoginParameter()
            .setDeviceType(client.getDeviceType())
            .setTimeout(client.getTimeout())
            .setActiveTimeout(client.getActiveTimeout())
            .setExtra(LoginHelper.CLIENT_KEY, client.getClientId());
        LoginHelper.login(loginUser, model);

        LoginVo result = new LoginVo();
        result.setAccessToken(StpUtil.getTokenValue());
        result.setExpireIn(StpUtil.getTokenTimeout());
        result.setClientId(clientId);
        return complete(result);
    }

    private String issue(Long userId, String clientId) {
        Instant now = Instant.now();
        String jwtId = UUID.randomUUID().toString();
        String token = JWT.create()
            .setSubject(String.valueOf(userId))
            .setIssuedAt(Date.from(now))
            .setExpiresAt(Date.from(now.plus(REFRESH_TTL)))
            .setJWTId(jwtId)
            .setPayload("type", TOKEN_TYPE)
            .setPayload("userId", userId)
            .setPayload("clientId", clientId)
            .setKey(secret.getBytes(StandardCharsets.UTF_8))
            .sign();
        RedisUtils.setCacheObject(REFRESH_KEY + jwtId, String.valueOf(userId), REFRESH_TTL);
        return token;
    }
}
