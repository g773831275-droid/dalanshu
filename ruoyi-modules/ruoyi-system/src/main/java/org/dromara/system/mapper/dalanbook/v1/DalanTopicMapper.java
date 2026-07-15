package org.dromara.system.mapper.dalanbook.v1;

import com.baomidou.mybatisplus.annotation.InterceptorIgnore;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;
import org.dromara.system.domain.dalanbook.v1.DalanTopic;

@InterceptorIgnore(tenantLine = "true")
public interface DalanTopicMapper extends BaseMapper<DalanTopic> {
    @Update("UPDATE dalan_topic SET post_count = GREATEST(0, post_count + #{delta}) WHERE id = #{topicId}")
    int changePostCount(@Param("topicId") String topicId, @Param("delta") int delta);
}
