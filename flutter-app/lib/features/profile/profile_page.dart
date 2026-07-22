part of '../../app/app.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key, required this.state, required this.onLogout});

  final AppState state;
  final VoidCallback onLogout;

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  bool compactMode = false;
  bool wifiOnly = true;

  @override
  Widget build(BuildContext context) {
    return ListView(
      key: const PageStorageKey('profile-scroll'),
      physics: appScrollPhysics(context, alwaysScrollable: true),
      padding: const EdgeInsets.fromLTRB(
        AppSpace.md,
        AppSpace.sm,
        AppSpace.md,
        AppSpace.xl,
      ),
      children: [
        Row(
          children: [
            const Avatar(label: '航', size: 64),
            const SizedBox(width: AppSpace.compact),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('航海中的人', style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: AppSpace.xs),
                  Text(
                    '记录每一条走过的路',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpace.lg),
        const GlassCard(
          color: AppColors.skyPale,
          child: Row(
            children: [
              Icon(Icons.auto_awesome_outlined, color: AppColors.primary),
              SizedBox(width: AppSpace.compact),
              Expanded(child: Text('你的航线本周收获了 24 次回应')),
              Icon(Icons.chevron_right),
            ],
          ),
        ),
        const SizedBox(height: AppSpace.lg),
        Text('我的内容', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: AppSpace.sm),
        AnimatedBuilder(
          animation: widget.state,
          builder: (context, _) => Row(
            children: [
              const Expanded(
                child: _ProfileMetric(label: '发布', value: '12'),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _ProfileMetric(
                  label: '收藏',
                  value: '${widget.state.savedPosts.length}',
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _ProfileMetric(
                  label: '加入岛屿',
                  value: '${widget.state.joinedIslands.length}',
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpace.lg),
        Text('设置', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: AppSpace.sm),
        GlassCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              _SettingsSwitchTile(
                title: '紧凑阅读',
                subtitle: '减少信息流卡片间距',
                value: compactMode,
                onChanged: (value) => setState(() => compactMode = value),
              ),
              const Divider(height: 1),
              _SettingsSwitchTile(
                title: '仅 Wi-Fi 自动播放',
                subtitle: '视频播放更省流量',
                value: wifiOnly,
                onChanged: (value) => setState(() => wifiOnly = value),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.help_outline),
                title: const Text('帮助与反馈'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => showMessage(context, '反馈入口将在正式版提供'),
              ),
              const Divider(height: 1),
              const ListTile(
                leading: Icon(Icons.info_outline),
                title: Text('关于大蓝书'),
                trailing: Text(
                  'v0.1 原型',
                  style: TextStyle(color: AppColors.inkSoft),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpace.lg),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: () {
              widget.state.logout();
              widget.onLogout();
              showMessage(context, '已退出登录');
            },
            icon: const Icon(Icons.logout),
            label: const Text('退出登录'),
          ),
        ),
      ],
    );
  }
}

class _SettingsSwitchTile extends StatelessWidget {
  const _SettingsSwitchTile({
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      toggled: value,
      label: title,
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpace.md,
          vertical: AppSpace.compact,
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: Theme.of(context).textTheme.bodyLarge),
                  const SizedBox(height: AppSpace.xs),
                  Text(subtitle, style: Theme.of(context).textTheme.bodyMedium),
                ],
              ),
            ),
            const SizedBox(width: AppSpace.compact),
            AppAdaptiveSwitch(value: value, onChanged: onChanged),
          ],
        ),
      ),
    );
  }
}

class _ProfileMetric extends StatelessWidget {
  const _ProfileMetric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 4),
      child: Column(
        children: [
          Text(value, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: AppSpace.xs),
          FittedBox(
            child: Text(label, style: Theme.of(context).textTheme.bodyMedium),
          ),
        ],
      ),
    );
  }
}
