package org.dromara.common.oss.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 大蓝树固定图片处理规格。
 *
 * <p>业务代码只能选择预定义规格，不能接收前端传入的任意 TOS 处理参数，
 * 避免产生无限尺寸组合以及不可控的数据处理费用。</p>
 */
@Getter
@AllArgsConstructor
public enum OssImageStyle {

    AVATAR_128("avatar_128", "image/resize,m_fill,w_128,h_128/format,webp/quality,Q_82"),
    AVATAR_256("avatar_256", "image/resize,m_fill,w_256,h_256/format,webp/quality,Q_85"),
    POST_FEED_720("post_feed_720", "image/resize,w_720/format,webp/quality,Q_80"),
    POST_DETAIL_1440("post_detail_1440", "image/resize,w_1440/format,webp/quality,Q_85"),
    CIRCLE_CARD_720X405("circle_card_720x405", "image/resize,m_fill,w_720,h_405/format,webp/quality,Q_82"),
    CIRCLE_BANNER_1600X700("circle_banner_1600x700", "image/resize,m_fill,w_1600,h_700/format,webp/quality,Q_85");

    private final String code;
    private final String process;
}
