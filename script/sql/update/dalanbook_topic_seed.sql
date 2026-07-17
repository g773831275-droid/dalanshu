-- 大蓝书话题基础数据
-- 可重复执行：按话题名称更新描述与状态，不覆盖真实帖子数量。

INSERT INTO `dalan_topic`
(`id`, `slug`, `name`, `description`, `post_count`, `status`, `created_at`, `updated_at`)
VALUES
('t_seed_001', 'workplace-review', '职场复盘', '记录项目得失、沟通经验和关键决策，把踩过的坑变成下一次做事的方法。', 0, 'published', NOW(3), NOW(3)),
('t_seed_002', 'resume-polish', '简历优化', '分享真实简历修改思路、项目描述写法和不同岗位的投递经验。', 0, 'published', NOW(3), NOW(3)),
('t_seed_003', 'interview-review', '面试复盘', '复盘真实面试问题、回答思路、岗位匹配度和谈薪过程，帮助后来者少走弯路。', 0, 'published', NOW(3), NOW(3)),
('t_seed_004', 'career-change', '转行经验', '聊聊转行前的准备、能力迁移、试错成本，以及真正入行后的落差与收获。', 0, 'published', NOW(3), NOW(3)),
('t_seed_005', 'workplace-communication', '职场沟通', '讨论向上汇报、跨部门协作、需求确认和冲突处理中的实用表达方式。', 0, 'published', NOW(3), NOW(3)),
('t_seed_006', 'side-project', '副业探索', '分享副业选择、时间投入、收入验证和风险控制，不贩卖焦虑，只谈真实过程。', 0, 'published', NOW(3), NOW(3)),
('t_seed_007', 'ai-office', 'AI办公实战', '交流 AI 在写作、表格、汇报、会议纪要和资料整理中的实际用法与效果。', 0, 'published', NOW(3), NOW(3)),
('t_seed_008', 'prompt-practice', '提示词实践', '沉淀经过验证的提示词结构、迭代过程和适用边界，让 AI 输出更稳定。', 0, 'published', NOW(3), NOW(3)),
('t_seed_009', 'ai-coding', 'AI编程', '分享 AI 辅助编码、代码审查、调试和自动化开发的真实案例与避坑经验。', 0, 'published', NOW(3), NOW(3)),
('t_seed_010', 'automation-workflow', '自动化工作流', '展示从重复劳动中提炼出的自动化流程，包括工具组合、搭建成本和维护经验。', 0, 'published', NOW(3), NOW(3)),
('t_seed_011', 'productivity-tools', '效率工具', '推荐真正长期使用的效率工具，也欢迎分享弃用原因和迁移体验。', 0, 'published', NOW(3), NOW(3)),
('t_seed_012', 'digital-review', '数码评测', '基于长期使用体验聊手机、电脑、耳机和配件，关注优缺点而不是参数堆砌。', 0, 'published', NOW(3), NOW(3)),
('t_seed_013', 'desk-setup', '桌搭改造', '分享桌面布局、灯光、收纳和人体工学调整，让工作空间更舒服、更顺手。', 0, 'published', NOW(3), NOW(3)),
('t_seed_014', 'commute-gear', '通勤好物', '交流背包、耳机、鞋服和随身装备的真实通勤体验，重点关注耐用与便利。', 0, 'published', NOW(3), NOW(3)),
('t_seed_015', 'mobile-photography', '手机摄影', '分享日常取景、构图、光线和后期技巧，用手边设备记录普通生活。', 0, 'published', NOW(3), NOW(3)),
('t_seed_016', 'smart-home', '智能家居', '讨论智能设备选购、自动化联动、网络稳定性，以及实际使用中的隐私和维护成本。', 0, 'published', NOW(3), NOW(3)),
('t_seed_017', 'beginner-fitness', '新手健身', '面向刚开始训练的人，分享动作学习、训练安排和循序渐进的真实体会。', 0, 'published', NOW(3), NOW(3)),
('t_seed_018', 'fat-loss-diet', '减脂饮食', '记录可持续的饮食调整、热量管理和外食选择，拒绝极端节食。', 0, 'published', NOW(3), NOW(3)),
('t_seed_019', 'running-log', '跑步打卡', '记录配速、里程、状态和恢复，让每一次训练都能看到长期变化。', 0, 'published', NOW(3), NOW(3)),
('t_seed_020', 'strength-training', '力量训练', '交流训练计划、动作细节、渐进超负荷和伤病预防，重视长期进步。', 0, 'published', NOW(3), NOW(3)),
('t_seed_021', 'sleep-improvement', '睡眠改善', '分享作息调整、睡眠环境和压力管理的亲身实践，寻找更可持续的恢复方式。', 0, 'published', NOW(3), NOW(3)),
('t_seed_022', 'weekend-hiking', '周末徒步', '分享城市周边路线、交通、补给、难度和天气经验，适合周末轻量出发。', 0, 'published', NOW(3), NOW(3)),
('t_seed_023', 'camping-gear', '露营装备', '交流帐篷、睡眠系统、炊具和照明装备的选择，关注场景适配和收纳重量。', 0, 'published', NOW(3), NOW(3)),
('t_seed_024', 'city-cycling', '城市骑行', '记录通勤与休闲骑行路线，讨论车辆配置、安全习惯和城市道路体验。', 0, 'published', NOW(3), NOW(3)),
('t_seed_025', 'outdoor-safety', '户外安全', '整理天气判断、路线规划、应急装备和风险处置经验，对每一次出发负责。', 0, 'published', NOW(3), NOW(3)),
('t_seed_026', 'mens-style', '男士穿搭', '分享适合通勤和日常生活的搭配思路，关注版型、质感和重复利用率。', 0, 'published', NOW(3), NOW(3)),
('t_seed_027', 'grooming-routine', '理容护肤', '讨论清洁、剃须、护肤和发型打理，用简单稳定的习惯改善状态。', 0, 'published', NOW(3), NOW(3)),
('t_seed_028', 'coffee-daily', '咖啡日常', '记录豆子、器具、冲煮参数和城市咖啡店，也分享一杯咖啡背后的日常。', 0, 'published', NOW(3), NOW(3)),
('t_seed_029', 'home-cooking', '一人食', '分享适合一个人的简单菜谱、备餐方法和食材管理，让做饭不再麻烦。', 0, 'published', NOW(3), NOW(3)),
('t_seed_030', 'reading-list', '阅读书单', '推荐真正读完且有收获的书，写清适合谁、讲了什么，以及为什么值得读。', 0, 'published', NOW(3), NOW(3)),
('t_seed_031', 'writing-practice', '写作练习', '记录选题、结构、修改和持续输出的方法，用作品检验每一次练习。', 0, 'published', NOW(3), NOW(3)),
('t_seed_032', 'weekly-review', '本周复盘', '回看一周完成的事、遇到的问题和下周重点，用小步迭代代替空泛计划。', 0, 'published', NOW(3), NOW(3)),
('t_seed_033', 'note-taking', '知识管理', '分享笔记结构、信息筛选和知识复用方法，避免收藏很多却从不使用。', 0, 'published', NOW(3), NOW(3)),
('t_seed_034', 'long-termism', '长期主义', '讨论那些短期看不到回报、却值得持续投入的习惯、技能和关系。', 0, 'published', NOW(3), NOW(3))
AS new
ON DUPLICATE KEY UPDATE
  `description` = new.`description`,
  `status` = new.`status`,
  `updated_at` = NOW(3);

-- 与应用侧规则保持一致：英文不区分大小写，普通/全角空格不参与唯一匹配。
UPDATE `dalan_topic`
SET `normalized_name` = LOWER(REPLACE(REPLACE(TRIM(`name`), ' ', ''), '　', ''))
WHERE `normalized_name` IS NULL OR `normalized_name` = '';

-- 按真实关联数据校准帖子数，不写虚假的热度。
UPDATE `dalan_topic` topic
LEFT JOIN (
  SELECT `topic_id`, COUNT(*) AS `actual_count`
  FROM `dalan_post_topic`
  GROUP BY `topic_id`
) relation_count ON relation_count.`topic_id` = topic.`id`
SET topic.`post_count` = COALESCE(relation_count.`actual_count`, 0)
WHERE topic.`id` LIKE 't_seed_%';
