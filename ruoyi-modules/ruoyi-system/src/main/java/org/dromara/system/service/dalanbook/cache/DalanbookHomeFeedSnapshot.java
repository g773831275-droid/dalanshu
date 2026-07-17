package org.dromara.system.service.dalanbook.cache;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.dromara.system.domain.dalanbook.v1.DalanCircleV1;
import org.dromara.system.domain.dalanbook.v1.DalanPostStats;
import org.dromara.system.domain.dalanbook.v1.DalanPostV1;
import org.dromara.system.domain.dalanbook.v1.DalanVideoAsset;

import java.util.List;
import java.util.Map;

/**
 * 首页信息流可共享的公共快照。
 *
 * <p>这里只保存生成信息流所需的公共字段，不保存用户互动状态、TOS 临时签名地址，
 * 也不保存 {@code SysUser} 中的密码、手机号等敏感字段。</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DalanbookHomeFeedSnapshot {

    private List<DalanPostV1> posts;
    private Map<String, DalanCircleV1> circles;
    private Map<Long, FeedAuthor> authors;
    private Map<String, DalanPostStats> stats;
    private Map<String, DalanVideoAsset> videos;
    private boolean hasMore;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FeedAuthor {
        private Long userId;
        private String nickname;
        private Long avatarOssId;
    }
}
