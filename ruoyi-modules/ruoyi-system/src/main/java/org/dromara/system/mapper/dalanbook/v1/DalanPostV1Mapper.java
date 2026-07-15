package org.dromara.system.mapper.dalanbook.v1;

import com.baomidou.mybatisplus.annotation.InterceptorIgnore;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.dromara.system.domain.dalanbook.v1.DalanPostV1;

@InterceptorIgnore(tenantLine = "true")
public interface DalanPostV1Mapper extends BaseMapper<DalanPostV1> {
}
