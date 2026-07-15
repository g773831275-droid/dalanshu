package org.dromara.system.mapper.dalanbook.v1;

import com.baomidou.mybatisplus.annotation.InterceptorIgnore;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.dromara.system.domain.dalanbook.v1.DalanImpression;

@InterceptorIgnore(tenantLine = "true")
public interface DalanImpressionMapper extends BaseMapper<DalanImpression> {
}
