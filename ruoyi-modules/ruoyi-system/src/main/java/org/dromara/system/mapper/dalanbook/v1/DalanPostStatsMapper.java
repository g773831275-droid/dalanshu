package org.dromara.system.mapper.dalanbook.v1;

import com.baomidou.mybatisplus.annotation.InterceptorIgnore;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.dromara.system.domain.dalanbook.v1.DalanPostStats;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

@InterceptorIgnore(tenantLine = "true")
public interface DalanPostStatsMapper extends BaseMapper<DalanPostStats> {
    @Update("UPDATE dalan_post_stats SET useful_count = GREATEST(0, useful_count + #{delta}) WHERE post_id = #{postId}")
    int changeUseful(@Param("postId") String postId, @Param("delta") int delta);
}
