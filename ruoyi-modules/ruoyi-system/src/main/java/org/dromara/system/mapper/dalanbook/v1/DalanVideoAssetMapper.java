package org.dromara.system.mapper.dalanbook.v1;

import com.baomidou.mybatisplus.annotation.InterceptorIgnore;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.dromara.system.domain.dalanbook.v1.DalanVideoAsset;

@InterceptorIgnore(tenantLine = "true")
public interface DalanVideoAssetMapper extends BaseMapper<DalanVideoAsset> {

    /**
     * Serializes completion of one browser upload, so retrying clients cannot
     * bind competing VOD Vids to the same asset.
     */
    @Select("SELECT * FROM dalan_video_asset WHERE id = #{id} FOR UPDATE")
    DalanVideoAsset selectByIdForUpdate(@Param("id") String id);
}
