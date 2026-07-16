-- 帖子图片永久保存 OSS ID，访问时由后端生成当前有效的私有桶签名 URL。
-- 可重复执行；兼容历史 images JSON 中保存临时 URL 的数据，最多迁移每帖 9 张图片。

DELIMITER $$

DROP PROCEDURE IF EXISTS migrate_dalan_post_image_oss_ids$$
CREATE PROCEDURE migrate_dalan_post_image_oss_ids()
BEGIN
  DECLARE image_index int DEFAULT 0;
  DECLARE url_path varchar(32);
  DECLARE oss_id_path varchar(32);

  WHILE image_index < 9 DO
    SET url_path = CONCAT('$[', image_index, '].url');
    SET oss_id_path = CONCAT('$[', image_index, '].ossId');

    UPDATE dalan_post_v1 p
    JOIN sys_oss o
      ON JSON_UNQUOTE(JSON_EXTRACT(p.images, url_path)) = o.url
      OR LOCATE(CONCAT('/', o.file_name), JSON_UNQUOTE(JSON_EXTRACT(p.images, url_path))) > 0
    SET p.images = JSON_REMOVE(
      JSON_SET(p.images, oss_id_path, CAST(o.oss_id AS CHAR)),
      url_path
    )
    WHERE JSON_EXTRACT(p.images, oss_id_path) IS NULL
      AND JSON_EXTRACT(p.images, url_path) IS NOT NULL;

    SET image_index = image_index + 1;
  END WHILE;

  -- 封面由 images 第一张派生，不再持久化临时签名 URL。
  UPDATE dalan_post_v1
  SET cover = ''
  WHERE JSON_EXTRACT(images, '$[0].ossId') IS NOT NULL;
END$$

CALL migrate_dalan_post_image_oss_ids()$$
DROP PROCEDURE migrate_dalan_post_image_oss_ids$$

DELIMITER ;
