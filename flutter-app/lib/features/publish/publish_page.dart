part of '../../app/app.dart';

class PublishPage extends StatefulWidget {
  const PublishPage({super.key, required this.state});

  final AppState state;

  @override
  State<PublishPage> createState() => _PublishPageState();
}

class _PublishPageState extends State<PublishPage> {
  final ImagePicker picker = ImagePicker();
  final List<XFile> selectedImages = [];
  XFile? selectedVideo;
  bool pickingMedia = false;
  bool video = false;
  IslandData? selectedIsland;
  final title = TextEditingController();
  final body = TextEditingController();

  @override
  void dispose() {
    title.dispose();
    body.dispose();
    super.dispose();
  }

  Future<void> _chooseIsland() async {
    final result = await showAppBottomSheet<IslandData>(
      context: context,
      builder: (_) => SafeArea(
        child: ListView(
          physics: appScrollPhysics(context),
          shrinkWrap: true,
          padding: const EdgeInsets.all(AppSpace.md),
          children: [
            const Text(
              '选择发布岛屿',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: AppSpace.sm),
            ...islands.map(
              (island) => ListTile(
                leading: AppImage(asset: island.image, width: 44, height: 44),
                title: Text(island.name),
                subtitle: Text(island.category),
                onTap: () => Navigator.of(context).pop(island),
              ),
            ),
          ],
        ),
      ),
    );
    if (result != null) setState(() => selectedIsland = result);
  }

  void _submit() {
    if (title.text.trim().isEmpty ||
        body.text.trim().isEmpty ||
        selectedIsland == null) {
      showMessage(context, '请补全标题、正文并选择发布岛屿');
      return;
    }
    appCommitFeedback(context);
    showMessage(context, '内容已提交审核，稍后会在岛内发布');
  }

  Future<void> _pickMedia() async {
    if (pickingMedia) return;
    setState(() => pickingMedia = true);
    try {
      if (video) {
        final result = await picker.pickVideo(source: ImageSource.gallery);
        if (result != null && mounted) {
          setState(() => selectedVideo = result);
        }
      } else {
        final result = await picker.pickMultiImage(imageQuality: 88);
        if (result.isNotEmpty && mounted) {
          setState(() {
            selectedImages
              ..clear()
              ..addAll(result.take(9));
          });
          if (result.length > 9) {
            showMessage(context, '最多选择 9 张图片');
          }
        }
      }
    } on PlatformException catch (error) {
      if (mounted) {
        showMessage(context, '无法打开相册：${error.message ?? error.code}');
      }
    } finally {
      if (mounted) setState(() => pickingMedia = false);
    }
  }

  void _removeMedia() {
    setState(() {
      if (video) {
        selectedVideo = null;
      } else {
        selectedImages.clear();
      }
    });
  }

  Widget _mediaPreview() {
    if (video && selectedVideo != null) {
      return Container(
        height: 190,
        color: AppColors.primary.withValues(alpha: 0.08),
        alignment: Alignment.center,
        padding: const EdgeInsets.all(AppSpace.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.video_file_outlined,
              size: 44,
              color: AppColors.primary,
            ),
            const SizedBox(height: AppSpace.compact),
            Text(
              selectedVideo!.name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ],
        ),
      );
    }
    if (!video && selectedImages.isNotEmpty) {
      return Image.file(
        File(selectedImages.first.path),
        width: double.infinity,
        height: 190,
        fit: BoxFit.cover,
        cacheWidth:
            (MediaQuery.sizeOf(context).width *
                    MediaQuery.devicePixelRatioOf(context))
                .round(),
        cacheHeight: (190 * MediaQuery.devicePixelRatioOf(context)).round(),
        gaplessPlayback: true,
        errorBuilder: (_, _, _) => const SizedBox(
          height: 190,
          child: Center(child: Icon(Icons.broken_image_outlined, size: 40)),
        ),
      );
    }
    return AppImage(
      asset: video
          ? 'assets/images/cover-outdoor.jpg'
          : 'assets/images/cover-ai-desk.jpg',
      width: double.infinity,
      height: 190,
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      key: const PageStorageKey('publish-scroll'),
      physics: appScrollPhysics(context, alwaysScrollable: true),
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      padding: const EdgeInsets.fromLTRB(
        AppSpace.md,
        AppSpace.sm,
        AppSpace.md,
        AppSpace.xl,
      ),
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                '写一条新的航线',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
            ),
            TextButton(
              onPressed: () => showMessage(context, '草稿已保存'),
              child: const Text('存草稿'),
            ),
          ],
        ),
        const SizedBox(height: AppSpace.compact),
        AppSegmentedControl<bool>(
          segments: const [
            AppSegment(value: false, label: '图文', icon: Icons.image_outlined),
            AppSegment(
              value: true,
              label: '短视频',
              icon: Icons.videocam_outlined,
            ),
          ],
          selected: video,
          onChanged: (value) => setState(() => video = value),
        ),
        const SizedBox(height: AppSpace.md),
        GlassCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              Stack(
                children: [
                  AnimatedSwitcher(
                    duration: appMotionDuration(
                      context,
                      const Duration(milliseconds: 180),
                    ),
                    switchInCurve: Curves.easeOutCubic,
                    switchOutCurve: Curves.easeOutCubic,
                    transitionBuilder: (child, animation) =>
                        FadeTransition(opacity: animation, child: child),
                    child: KeyedSubtree(
                      key: ValueKey(
                        video
                            ? selectedVideo?.path ?? 'video-placeholder'
                            : selectedImages.isEmpty
                            ? 'image-placeholder'
                            : selectedImages.first.path,
                      ),
                      child: _mediaPreview(),
                    ),
                  ),
                  Positioned(
                    right: 8,
                    top: 8,
                    child: IconButton.filledTonal(
                      tooltip: '移除媒体',
                      onPressed: _removeMedia,
                      icon: const Icon(Icons.close),
                    ),
                  ),
                  if (!video && selectedImages.length > 1)
                    Positioned(
                      left: 12,
                      bottom: 12,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: Colors.black54,
                          borderRadius: BorderRadius.circular(
                            AppRadius.content,
                          ),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 9,
                            vertical: 5,
                          ),
                          child: Text(
                            '共 ${selectedImages.length} 张',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                    ),
                  if (video)
                    const Positioned(
                      left: 12,
                      bottom: 12,
                      child: Text(
                        '00:37',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                ],
              ),
              TextButton.icon(
                onPressed: pickingMedia ? null : _pickMedia,
                icon: pickingMedia
                    ? const SizedBox(
                        width: 22,
                        height: 18,
                        child: FittedBox(
                          fit: BoxFit.scaleDown,
                          child: AppLoadingIndicator(label: '正在打开相册'),
                        ),
                      )
                    : const Icon(Icons.add_photo_alternate_outlined),
                label: Text(
                  pickingMedia
                      ? '正在打开相册'
                      : video
                      ? '重新选择视频'
                      : '添加图片',
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpace.md),
        TextField(
          controller: title,
          maxLength: 32,
          decoration: const InputDecoration(
            labelText: '标题',
            hintText: '给这条航线一个清晰的名字',
          ),
        ),
        const SizedBox(height: AppSpace.sm),
        TextField(
          controller: body,
          minLines: 5,
          maxLines: 8,
          maxLength: 1000,
          decoration: const InputDecoration(
            labelText: '正文',
            hintText: '分享真实经验，也留下可复用的细节…',
            alignLabelWithHint: true,
          ),
        ),
        const SizedBox(height: AppSpace.sm),
        AppPressable(
          semanticLabel: '选择发布岛屿',
          onTap: _chooseIsland,
          child: GlassCard(
            child: Row(
              children: [
                const Icon(Icons.map_outlined, color: AppColors.primary),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    selectedIsland?.name ?? '选择发布岛屿',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
                const Icon(Icons.chevron_right),
              ],
            ),
          ),
        ),
        const SizedBox(height: AppSpace.lg),
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: _submit,
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
            icon: const Icon(Icons.sailing_outlined),
            label: const Text('发布航线'),
          ),
        ),
      ],
    );
  }
}
