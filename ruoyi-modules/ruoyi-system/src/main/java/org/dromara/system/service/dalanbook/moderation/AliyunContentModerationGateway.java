package org.dromara.system.service.dalanbook.moderation;

import com.aliyun.green20220302.Client;
import com.aliyun.green20220302.models.ImageModerationRequest;
import com.aliyun.green20220302.models.ImageModerationResponse;
import com.aliyun.green20220302.models.ImageModerationResponseBody;
import com.aliyun.green20220302.models.TextModerationRequest;
import com.aliyun.green20220302.models.TextModerationResponse;
import com.aliyun.green20220302.models.TextModerationResponseBody;
import com.aliyun.teaopenapi.models.Config;
import org.dromara.common.json.utils.JsonUtils;
import org.dromara.system.config.dalanbook.ContentModerationProperties;
import org.dromara.system.controller.dalanbook.v1.DalanApiException;
import org.springframework.http.HttpStatus;

import java.util.Map;

/**
 * Synchronous Alibaba Cloud Content Moderation implementation for published user content.
 */
public class AliyunContentModerationGateway implements ContentModerationGateway {
    private final Client client;
    private final ContentModerationProperties properties;

    public AliyunContentModerationGateway(ContentModerationProperties properties) {
        this.properties = properties;
        try {
            Config config = new Config()
                .setAccessKeyId(properties.getAccessKeyId())
                .setAccessKeySecret(properties.getAccessKeySecret())
                .setRegionId(properties.getRegion())
                .setEndpoint(properties.getEndpoint());
            this.client = new Client(config);
        } catch (Exception exception) {
            throw unavailable(exception);
        }
    }

    @Override
    public void checkText(String content, String dataId) {
        if (content == null || content.isBlank()) return;
        try {
            TextModerationResponse response = client.textModeration(new TextModerationRequest()
                .setService(properties.getTextService())
                .setServiceParameters(JsonUtils.toJsonString(Map.of("content", content, "dataId", dataId))));
            TextModerationResponseBody body = response.getBody();
            if (body == null || !Integer.valueOf(200).equals(body.getCode()) || body.getData() == null) {
                throw unavailable(null);
            }
            if (hasText(body.getData().getLabels())) {
                throw rejected("文本");
            }
        } catch (DalanApiException exception) {
            throw exception;
        } catch (Exception exception) {
            throw unavailable(exception);
        }
    }

    @Override
    public void checkImage(String imageUrl, String dataId) {
        try {
            ImageModerationResponse response = client.imageModeration(new ImageModerationRequest()
                .setService(properties.getImageService())
                .setServiceParameters(JsonUtils.toJsonString(Map.of("imageUrl", imageUrl, "dataId", dataId))));
            ImageModerationResponseBody body = response.getBody();
            if (body == null || !Integer.valueOf(200).equals(body.getCode()) || body.getData() == null) {
                throw unavailable(null);
            }
            String riskLevel = body.getData().getRiskLevel();
            if (riskLevel == null || (!"none".equalsIgnoreCase(riskLevel) && !"normal".equalsIgnoreCase(riskLevel))) {
                throw rejected("图片");
            }
        } catch (DalanApiException exception) {
            throw exception;
        } catch (Exception exception) {
            throw unavailable(exception);
        }
    }

    private DalanApiException rejected(String type) {
        return new DalanApiException(HttpStatus.UNPROCESSABLE_ENTITY, "CONTENT_MODERATION_REJECTED",
            type + "未通过内容安全审核，请调整后重试");
    }

    private DalanApiException unavailable(Exception cause) {
        return new DalanApiException(HttpStatus.SERVICE_UNAVAILABLE, "CONTENT_MODERATION_UNAVAILABLE",
            "内容安全服务暂时不可用，请稍后重试");
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
