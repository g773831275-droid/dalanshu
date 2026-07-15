package org.dromara.system.mapper.dalanbook.v1;

import com.baomidou.mybatisplus.annotation.InterceptorIgnore;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.dromara.system.domain.dalanbook.v1.DalanNotification;

@InterceptorIgnore(tenantLine = "true")
public interface DalanNotificationMapper extends BaseMapper<DalanNotification> {
}
