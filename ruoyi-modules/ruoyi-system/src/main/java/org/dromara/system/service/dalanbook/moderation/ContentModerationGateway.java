package org.dromara.system.service.dalanbook.moderation;

/**
 * Content moderation boundary for user-generated text and images.
 */
public interface ContentModerationGateway {

    void checkText(String content, String dataId);

    void checkImage(String imageUrl, String dataId);
}
