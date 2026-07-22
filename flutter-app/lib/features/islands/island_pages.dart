part of '../../app/app.dart';

class IslandListPage extends StatefulWidget {
  const IslandListPage({
    super.key,
    required this.state,
    required this.onOpenSearch,
    required this.onOpenIsland,
  });

  final AppState state;
  final VoidCallback onOpenSearch;
  final ValueChanged<IslandData> onOpenIsland;

  @override
  State<IslandListPage> createState() => _IslandListPageState();
}

class _IslandListPageState extends State<IslandListPage> {
  String category = '全部';

  @override
  Widget build(BuildContext context) {
    final visible = category == '全部'
        ? islands
        : islands.where((island) => island.category == category).toList();
    return CustomScrollView(
      key: const PageStorageKey('islands-scroll'),
      physics: appScrollPhysics(context, alwaysScrollable: true),
      scrollCacheExtent: const ScrollCacheExtent.pixels(520),
      slivers: [
        SliverToBoxAdapter(
          child: Column(
            children: [
              Container(
                color: AppColors.skyPale,
                padding: const EdgeInsets.fromLTRB(
                  AppSpace.md,
                  AppSpace.sm,
                  AppSpace.md,
                  AppSpace.lg,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            '岛屿',
                            style: Theme.of(context).textTheme.headlineSmall,
                          ),
                        ),
                        IconButton(
                          tooltip: '搜索岛屿',
                          onPressed: widget.onOpenSearch,
                          icon: const Icon(Icons.search),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpace.compact),
                    const Text(
                      '总有一座岛，等你靠岸。',
                      style: TextStyle(
                        fontSize: 24,
                        height: 1.25,
                        fontWeight: FontWeight.w700,
                        color: AppColors.ink,
                      ),
                    ),
                    const SizedBox(height: AppSpace.xs),
                    Text(
                      '把共同的兴趣，变成长期的相遇。',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpace.compact),
              SizedBox(
                height: 40,
                child: ListView.separated(
                  physics: appScrollPhysics(context),
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
                  itemCount: 4,
                  separatorBuilder: (_, _) =>
                      const SizedBox(width: AppSpace.sm),
                  itemBuilder: (context, index) {
                    const labels = ['全部', '职场成长', 'AI 工具', '户外兴趣'];
                    final label = labels[index];
                    return AppFilterChip(
                      label: label,
                      selected: category == label,
                      onSelected: () => setState(() => category = label),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
        if (visible.isEmpty)
          const SliverFillRemaining(
            hasScrollBody: false,
            child: EmptyState(title: '这里还很安静', message: '换个分类看看其他岛屿。'),
          )
        else
          SliverList.builder(
            itemCount: visible.length,
            itemBuilder: (context, index) {
              final island = visible[index];
              return Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpace.md,
                  AppSpace.sm,
                  AppSpace.md,
                  0,
                ),
                child: _IslandCard(
                  island: island,
                  state: widget.state,
                  onTap: () => widget.onOpenIsland(island),
                ),
              );
            },
          ),
        const SliverToBoxAdapter(child: SizedBox(height: AppSpace.lg)),
      ],
    );
  }
}

class _IslandCard extends StatelessWidget {
  const _IslandCard({
    required this.island,
    required this.state,
    required this.onTap,
  });

  final IslandData island;
  final AppState state;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    void commitToggle() {
      appCommitFeedback(context);
      state.toggleIsland(island.name);
    }

    void toggle() {
      if (state.isLoggedIn) {
        commitToggle();
      } else {
        openLogin(context, state, pendingAction: commitToggle);
      }
    }

    return GlassCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          AppPressable(
            semanticLabel: '打开${island.name}',
            onTap: onTap,
            child: Row(
              children: [
                AppImage(asset: island.image, width: 104, height: 104),
                const SizedBox(width: AppSpace.compact),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(right: AppSpace.compact),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          island.name,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: AppSpace.xs),
                        Text(
                          island.subtitle,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        const SizedBox(height: AppSpace.xs),
                        Text(
                          island.members,
                          style: const TextStyle(
                            color: AppColors.coral,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpace.compact,
              AppSpace.xs,
              AppSpace.compact,
              AppSpace.compact,
            ),
            child: Row(
              children: [
                Text(
                  island.category,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const Spacer(),
                AnimatedBuilder(
                  animation: state,
                  builder: (context, _) {
                    final joined = state.joinedIslands.contains(island.name);
                    return OutlinedButton(
                      key: Key('join-${island.name}'),
                      onPressed: toggle,
                      child: Text(joined ? '已加入' : '加入'),
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class IslandDetailPage extends StatelessWidget {
  const IslandDetailPage({
    super.key,
    required this.state,
    required this.island,
  });

  final AppState state;
  final IslandData island;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: state,
      builder: (context, _) {
        final joined = state.joinedIslands.contains(island.name);
        return Scaffold(
          appBar: AppBar(
            actions: [
              IconButton(
                tooltip: '分享岛屿',
                onPressed: () => showMessage(context, '分享链接已复制'),
                icon: const Icon(Icons.ios_share_outlined),
              ),
            ],
          ),
          body: ListView(
            physics: appScrollPhysics(context, alwaysScrollable: true),
            padding: const EdgeInsets.only(bottom: 24),
            children: [
              AppImage(
                asset: island.image,
                width: double.infinity,
                height: 210,
                borderRadius: 0,
              ),
              Padding(
                padding: const EdgeInsets.all(AppSpace.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      island.category,
                      style: const TextStyle(
                        color: AppColors.coral,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: AppSpace.sm),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            island.name,
                            style: Theme.of(context).textTheme.headlineSmall,
                          ),
                        ),
                        FilledButton(
                          onPressed: () {
                            void commitToggle() {
                              appCommitFeedback(context);
                              state.toggleIsland(island.name);
                            }

                            if (state.isLoggedIn) {
                              commitToggle();
                            } else {
                              openLogin(
                                context,
                                state,
                                pendingAction: commitToggle,
                              );
                            }
                          },
                          child: Text(joined ? '已加入' : '加入岛屿'),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpace.sm),
                    Text(
                      island.subtitle,
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    const SizedBox(height: AppSpace.sm),
                    Text(
                      '${island.members} · 3,240 条讨论 · 本周 618 人靠岸',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    const Divider(height: 36),
                    Text(
                      '岛内推荐',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: AppSpace.sm),
                    ...posts
                        .take(2)
                        .map(
                          (post) => Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: PostCard(
                              post: post,
                              state: state,
                              onTap: () => Navigator.of(context).push(
                                appPageRoute(
                                  context,
                                  builder: (_) =>
                                      PostDetailPage(state: state, post: post),
                                ),
                              ),
                            ),
                          ),
                        ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
