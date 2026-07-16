package org.dromara.system.mapper.dalanbook.v1;

import com.baomidou.mybatisplus.annotation.InterceptorIgnore;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.dromara.system.domain.dalanbook.v1.DalanComment;

@InterceptorIgnore(tenantLine = "true")
public interface DalanCommentMapper extends BaseMapper<DalanComment> {
}
