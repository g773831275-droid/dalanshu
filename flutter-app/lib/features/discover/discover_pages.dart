part of '../../app/app.dart';

class DiscoverPage extends StatelessWidget {
  const DiscoverPage({
    super.key,
    required this.state,
    required this.onOpenSearch,
    required this.onOpenPost,
    required this.onOpenIsland,
  });

  final AppState state;
  final VoidCallback onOpenSearch;
  final ValueChanged<PostData> onOpenPost;
  final VoidCallback onOpenIsland;

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      key: const PageStorageKey('discover-scroll'),
      physics: appScrollPhysics(context, alwaysScrollable: true),
      scrollCacheExtent: const ScrollCacheExtent.pixels(640),
      slivers: [
        SliverToBoxAdapter(
          child: Column(
            children: [
              TopBar(
                title: '发现',
                subtitle: '今天也有值得记录的航线',
                action: IconButton(
                  tooltip: '查看通知',
                  onPressed: () => showMessage(context, '请从底部通知进入'),
                  icon: const Icon(Icons.notifications_none),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
                child: AppPressable(
                  semanticLabel: '搜索帖子、岛屿和话题',
                  onTap: onOpenSearch,
                  child: const GlassCard(
                    padding: EdgeInsets.symmetric(
                      horizontal: AppSpace.md,
                      vertical: AppSpace.compact,
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.search, color: AppColors.inkSoft, size: 21),
                        SizedBox(width: AppSpace.compact),
                        Expanded(
                          child: Text(
                            '搜索帖子、岛屿和话题',
                            style: TextStyle(color: AppColors.inkSoft),
                          ),
                        ),
                        Icon(Icons.tune, color: AppColors.primary, size: 20),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: AppSpace.md),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        '今日精选',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ),
                    TextButton(
                      onPressed: () => showMessage(context, '更多精选正在靠岸'),
                      child: const Text('换一批'),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
                child: AppPressable(
                  semanticLabel: '打开今日精选',
                  onTap: () => onOpenPost(posts.first),
                  child: SizedBox(
                    height: 190,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        AppImage(asset: posts.first.image),
                        const DecoratedBox(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.all(
                              Radius.circular(AppRadius.content),
                            ),
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [Colors.transparent, Color(0xCC172A3A)],
                            ),
                          ),
                        ),
                        const Positioned(
                          left: AppSpace.md,
                          right: AppSpace.md,
                          bottom: AppSpace.compact,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '正在发生',
                                style: TextStyle(
                                  color: AppColors.sky,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              SizedBox(height: AppSpace.xs),
                              Text(
                                '把灵感变成真正有用的工作流',
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 20,
                                  height: 1.25,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              SizedBox(height: AppSpace.xs),
                              Text(
                                'AI 工具岛 · 2 小时前',
                                style: TextStyle(
                                  color: Colors.white70,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: AppSpace.compact),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        '正在发生',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ),
                    TextButton(
                      onPressed: onOpenIsland,
                      child: const Text('去看岛屿'),
                    ),
                  ],
                ),
              ),
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
                    const labels = ['全部', 'AI 工具', '职场成长', '户外兴趣'];
                    return AppFilterChip(
                      label: labels[index],
                      selected: index == 0,
                      onSelected: () {},
                    );
                  },
                ),
              ),
            ],
          ),
        ),
        SliverList.builder(
          itemCount: posts.length,
          itemBuilder: (context, index) {
            final post = posts[index];
            return Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpace.md,
                AppSpace.sm,
                AppSpace.md,
                0,
              ),
              child: PostCard(
                post: post,
                state: state,
                onTap: () => onOpenPost(post),
              ),
            );
          },
        ),
        const SliverToBoxAdapter(child: SizedBox(height: AppSpace.lg)),
      ],
    );
  }
}

class PostCard extends StatelessWidget {
  const PostCard({
    super.key,
    required this.post,
    required this.state,
    required this.onTap,
  });

  final PostData post;
  final AppState state;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return AppPressable(
      semanticLabel: '打开帖子 ${post.title}',
      onTap: onTap,
      child: GlassCard(
        padding: EdgeInsets.zero,
        child: SizedBox(
          height: 126,
          child: Row(
            children: [
              AppImage(asset: post.image, width: 108, height: 126),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpace.compact),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        post.tag,
                        style: const TextStyle(
                          color: AppColors.coral,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: AppSpace.xs),
                      Expanded(
                        child: Text(
                          post.title,
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                      ),
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              post.author,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                          ),
                          AnimatedBuilder(
                            animation: state,
                            builder: (context, _) {
                              final liked = state.likedPosts.contains(
                                post.title,
                              );
                              return Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    liked
                                        ? Icons.favorite
                                        : Icons.favorite_border,
                                    size: 15,
                                    color: liked
                                        ? AppColors.coral
                                        : AppColors.inkSoft,
                                  ),
                                  const SizedBox(width: AppSpace.xs),
                                  Text(
                                    '${post.likes + (liked ? 1 : 0)}',
                                    style: Theme.of(
                                      context,
                                    ).textTheme.bodyMedium,
                                  ),
                                ],
                              );
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class SearchPage extends StatefulWidget {
  const SearchPage({super.key, required this.state});

  final AppState state;

  @override
  State<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends State<SearchPage> {
  int tab = 0;
  final query = TextEditingController(text: 'AI');

  @override
  void dispose() {
    query.dispose();
    super.dispose();
  }

  Widget _results(BuildContext context) {
    if (tab == 0) {
      return Column(
        key: const ValueKey(0),
        children: posts
            .take(3)
            .map(
              (post) => Padding(
                padding: const EdgeInsets.only(bottom: AppSpace.sm),
                child: PostCard(
                  post: post,
                  state: widget.state,
                  onTap: () => Navigator.of(context).push(
                    appPageRoute(
                      context,
                      builder: (_) =>
                          PostDetailPage(state: widget.state, post: post),
                    ),
                  ),
                ),
              ),
            )
            .toList(growable: false),
      );
    }
    if (tab == 1) {
      return Column(
        key: const ValueKey(1),
        children: islands
            .map(
              (island) => ListTile(
                contentPadding: const EdgeInsets.symmetric(vertical: 4),
                leading: AppImage(asset: island.image, width: 64, height: 64),
                title: Text(island.name),
                subtitle: Text(
                  '${island.subtitle}\n${island.members}',
                  maxLines: 2,
                ),
                isThreeLine: true,
                onTap: () => Navigator.of(context).push(
                  appPageRoute(
                    context,
                    builder: (_) =>
                        IslandDetailPage(state: widget.state, island: island),
                  ),
                ),
              ),
            )
            .toList(growable: false),
      );
    }
    return const EmptyState(
      key: ValueKey(2),
      title: '找到 3 个相关话题',
      message: '#AI 工作流  #效率工具  #独立开发',
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('探索海图')),
      body: ListView(
        physics: appScrollPhysics(context, alwaysScrollable: true),
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        padding: const EdgeInsets.fromLTRB(
          AppSpace.md,
          0,
          AppSpace.md,
          AppSpace.lg,
        ),
        children: [
          TextField(
            controller: query,
            textInputAction: TextInputAction.search,
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.search),
              suffixIcon: IconButton(
                tooltip: '开始搜索',
                onPressed: () => setState(() {}),
                icon: const Icon(Icons.arrow_forward),
              ),
              hintText: '搜索帖子、岛屿和话题',
            ),
          ),
          const SizedBox(height: AppSpace.md),
          AppSegmentedControl<int>(
            segments: const [
              AppSegment(value: 0, label: '内容'),
              AppSegment(value: 1, label: '岛屿'),
              AppSegment(value: 2, label: '话题'),
            ],
            selected: tab,
            onChanged: (value) => setState(() => tab = value),
          ),
          const SizedBox(height: AppSpace.lg),
          AnimatedSwitcher(
            duration: appMotionDuration(
              context,
              const Duration(milliseconds: 180),
            ),
            switchInCurve: Curves.easeOutCubic,
            switchOutCurve: Curves.easeOutCubic,
            transitionBuilder: (child, animation) =>
                FadeTransition(opacity: animation, child: child),
            child: _results(context),
          ),
        ],
      ),
    );
  }
}
