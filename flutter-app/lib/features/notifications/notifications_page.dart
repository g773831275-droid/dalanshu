part of '../../app/app.dart';

class NotificationsPage extends StatelessWidget {
  const NotificationsPage({super.key, required this.state});

  final AppState state;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: state,
      builder: (_, _) => ListView(
        key: const PageStorageKey('notifications-scroll'),
        physics: appScrollPhysics(context, alwaysScrollable: true),
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          TopBar(
            title: '通知',
            subtitle: state.notificationsRead ? '都看过了，继续去探索吧' : '有 3 条新的动态',
            action: TextButton(
              onPressed: () {
                appCommitFeedback(context);
                state.markNotificationsRead();
                showMessage(context, '已全部标记为已读');
              },
              child: const Text('全部已读'),
            ),
          ),
          AnimatedSwitcher(
            duration: appMotionDuration(
              context,
              const Duration(milliseconds: 180),
            ),
            switchInCurve: Curves.easeOutCubic,
            switchOutCurve: Curves.easeOutCubic,
            child: state.notificationsRead
                ? const EmptyState(
                    key: ValueKey('empty'),
                    title: '暂时没有未读通知',
                    message: '关注的人有新动态时，会在这里提醒你。',
                  )
                : const Column(
                    key: ValueKey('notices'),
                    children: [
                      _Notice(
                        icon: Icons.favorite,
                        color: AppColors.coral,
                        title: '林深赞了你的评论',
                        subtitle: '2 分钟前 · AI 工具岛',
                      ),
                      _Notice(
                        icon: Icons.person_add_alt_1,
                        color: AppColors.primary,
                        title: '小满开始关注你',
                        subtitle: '1 小时前',
                      ),
                      _Notice(
                        icon: Icons.map_outlined,
                        color: AppColors.mint,
                        title: '你加入的户外兴趣岛有新讨论',
                        subtitle: '昨天',
                      ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}

class _Notice extends StatelessWidget {
  const _Notice({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpace.md,
        0,
        AppSpace.md,
        AppSpace.sm,
      ),
      child: GlassCard(
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: color.withValues(alpha: .14),
              foregroundColor: color,
              child: Icon(icon, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: AppSpace.xs),
                  Text(subtitle, style: Theme.of(context).textTheme.bodyMedium),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.inkSoft),
          ],
        ),
      ),
    );
  }
}
