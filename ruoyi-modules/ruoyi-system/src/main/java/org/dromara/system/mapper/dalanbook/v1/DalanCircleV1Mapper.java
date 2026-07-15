package org.dromara.system.mapper.dalanbook.v1;

import com.baomidou.mybatisplus.annotation.InterceptorIgnore;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.dromara.system.domain.dalanbook.v1.DalanCircleV1;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

@InterceptorIgnore(tenantLine = "true")
public interface DalanCircleV1Mapper extends BaseMapper<DalanCircleV1> {
    @Update("UPDATE dalan_circle_v1 SET member_count = GREATEST(0, member_count + #{delta}) WHERE id = #{circleId}")
    int changeMemberCount(@Param("circleId") String circleId, @Param("delta") int delta);

    @Update("UPDATE dalan_circle_v1 SET post_count = GREATEST(0, post_count + #{delta}) WHERE id = #{circleId}")
    int changePostCount(@Param("circleId") String circleId, @Param("delta") int delta);
}
