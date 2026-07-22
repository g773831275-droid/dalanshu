part of '../../app/app.dart';

class PostDetailPage extends StatefulWidget {
  const PostDetailPage({super.key, required this.state, required this.post});

  final AppState state;
  final PostData post;

  @override
  State<PostDetailPage> createState() => _PostDetailPageState();
}

class _PostDetailPageState extends State<PostDetailPage> {
  final comment = TextEditingController();

  @override
  void dispose() {
    comment.dispose();
    super.dispose();
  }

  void _guard(VoidCallback action) {
    if (widget.state.isLoggedIn) {
      action();
    } else {
      openLogin(context, widget.state, pendingAction: action);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: widget.state,
      builder: (_, _) {
        final liked = widget.state.likedPosts.contains(widget.post.title);
        final saved = widget.state.savedPosts.contains(widget.post.title);
        final followed = widget.state.followedAuthors.contains(
          widget.post.author,
        );
        return Scaffold(
          appBar: AppBar(
            actions: [
              IconButton(
                tooltip: '更多',
                onPressed: () => showMessage(context, '举报和分享将在正式版提供'),
                icon: const Icon(Icons.more_horiz),
              ),
            ],
          ),
          body: ListView(
            physics: appScrollPhysics(context, alwaysScrollable: true),
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: const EdgeInsets.only(bottom: 88),
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    Avatar(label: widget.post.author),
                    const SizedBox(width: AppSpace.compact),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.post.author,
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          Text(
                            'AI 工具岛 · 2 小时前',
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        ],
                      ),
                    ),
                    OutlinedButton(
                      onPressed: () => _guard(() {
                        appCommitFeedback(context);
                        widget.state.toggleFollow(widget.post.author);
                      }),
                      child: Text(followed ? '已关注' : '关注'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpace.compact),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  widget.post.title,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              ),
              const SizedBox(height: AppSpace.md),
              AppImage(
                asset: widget.post.image,
                width: double.infinity,
                height: 300,
                borderRadius: 0,
              ),
              Padding(
                padding: const EdgeInsets.all(AppSpace.md),
                child: Text(
                  widget.post.body,
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                child: Wrap(
                  spacing: 8,
                  children: [
                    Chip(label: Text('#AI 工作流')),
                    Chip(label: Text('#效率工具')),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Row(
                  children: [
                    IconButton(
                      key: const Key('post-like-button'),
                      tooltip: liked ? '取消点赞' : '点赞',
                      onPressed: () => _guard(() {
                        appCommitFeedback(context);
                        widget.state.toggleLike(widget.post.title);
                      }),
                      icon: _ToggleIcon(
                        liked ? Icons.favorite : Icons.favorite_border,
                        active: liked,
                        color: liked ? AppColors.coral : AppColors.inkSoft,
                      ),
                    ),
                    Text('${widget.post.likes + (liked ? 1 : 0)}'),
                    const SizedBox(width: 8),
                    IconButton(
                      tooltip: saved ? '取消收藏' : '收藏',
                      onPressed: () => _guard(() {
                        appCommitFeedback(context);
                        widget.state.toggleSaved(widget.post.title);
                      }),
                      icon: _ToggleIcon(
                        saved ? Icons.bookmark : Icons.bookmark_border,
                        active: saved,
                        color: saved ? AppColors.primary : AppColors.inkSoft,
                      ),
                    ),
                    Text(saved ? '已收藏' : '收藏'),
                    const Spacer(),
                    Text(
                      '${widget.post.comments} 条评论',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
              const Divider(height: 28),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  '评论区',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
              ...['很有启发，尤其是把工具放回真实工作流。', '收藏了，周末试着搭一遍。'].map(
                (text) => ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                  leading: const Avatar(label: '岛民', size: 34),
                  title: const Text('路过的岛民'),
                  subtitle: Text(text),
                ),
              ),
            ],
          ),
          bottomSheet: SafeArea(
            child: Container(
              decoration: const BoxDecoration(
                color: AppColors.white,
                border: Border(top: BorderSide(color: AppColors.line)),
              ),
              padding: const EdgeInsets.fromLTRB(
                AppSpace.compact,
                AppSpace.sm,
                AppSpace.compact,
                AppSpace.sm,
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: comment,
                      onTap: () {
                        if (!widget.state.isLoggedIn) {
                          FocusScope.of(context).unfocus();
                          openLogin(context, widget.state);
                        }
                      },
                      decoration: const InputDecoration(
                        isDense: true,
                        hintText: '写下你的想法…',
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: '发表评论',
                    onPressed: () => _guard(() {
                      if (comment.text.trim().isEmpty) {
                        showMessage(context, '先写点内容吧');
                      } else {
                        showMessage(context, '评论已发布');
                        comment.clear();
                      }
                    }),
                    icon: const Icon(Icons.send_outlined),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _ToggleIcon extends StatelessWidget {
  const _ToggleIcon(this.icon, {required this.active, required this.color});

  final IconData icon;
  final bool active;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: appMotionDuration(context, const Duration(milliseconds: 160)),
      switchInCurve: Curves.easeOutCubic,
      switchOutCurve: Curves.easeOutCubic,
      transitionBuilder: (child, animation) {
        if (appReduceMotion(context)) {
          return FadeTransition(opacity: animation, child: child);
        }
        return FadeTransition(
          opacity: animation,
          child: ScaleTransition(
            scale: Tween(begin: 0.94, end: 1.0).animate(animation),
            child: child,
          ),
        );
      },
      child: Icon(icon, key: ValueKey(active), color: color),
    );
  }
}
