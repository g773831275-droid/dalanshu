import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart' show ScrollCacheExtent;
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';

import '../core/design_system/app_theme.dart';
import '../core/design_system/app_experience.dart';
import '../core/mock/mock_data.dart';

part '../features/auth/auth_pages.dart';
part '../features/discover/discover_pages.dart';
part '../features/islands/island_pages.dart';
part '../features/post/post_detail_page.dart';
part '../features/publish/publish_page.dart';
part '../features/notifications/notifications_page.dart';
part '../features/profile/profile_page.dart';

class DalanBookApp extends StatelessWidget {
  const DalanBookApp({super.key, required this.state});

  final AppState state;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '大蓝书',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      scrollBehavior: const AppScrollBehavior(),
      home: WelcomePage(state: state),
    );
  }
}

Future<bool?> openLogin(
  BuildContext context,
  AppState state, {
  VoidCallback? pendingAction,
}) {
  return Navigator.of(context).push<bool>(
    appPageRoute<bool>(
      context,
      builder: (_) => LoginPage(state: state, pendingAction: pendingAction),
    ),
  );
}

void showMessage(BuildContext context, String message) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        duration: const Duration(seconds: 2),
        content: Row(
          children: [
            const Icon(Icons.info_outline, color: AppColors.sky),
            const SizedBox(width: AppSpace.sm),
            Expanded(child: Text(message)),
          ],
        ),
      ),
    );
}

class AppShell extends StatefulWidget {
  const AppShell({super.key, required this.state});

  final AppState state;

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int tab = 0;

  late final List<Widget> _pages = [
    DiscoverPage(
      key: const PageStorageKey('discover'),
      state: widget.state,
      onOpenSearch: () => Navigator.of(context).push(
        appPageRoute(context, builder: (_) => SearchPage(state: widget.state)),
      ),
      onOpenPost: (post) => Navigator.of(context).push(
        appPageRoute(
          context,
          builder: (_) => PostDetailPage(state: widget.state, post: post),
        ),
      ),
      onOpenIsland: () => Navigator.of(context).push(
        appPageRoute(
          context,
          builder: (_) =>
              IslandDetailPage(state: widget.state, island: islands.first),
        ),
      ),
    ),
    IslandListPage(
      key: const PageStorageKey('islands'),
      state: widget.state,
      onOpenSearch: () => Navigator.of(context).push(
        appPageRoute(context, builder: (_) => SearchPage(state: widget.state)),
      ),
      onOpenIsland: (island) => Navigator.of(context).push(
        appPageRoute(
          context,
          builder: (_) => IslandDetailPage(state: widget.state, island: island),
        ),
      ),
    ),
    PublishPage(key: const PageStorageKey('publish'), state: widget.state),
    NotificationsPage(
      key: const PageStorageKey('notifications'),
      state: widget.state,
    ),
    ProfilePage(
      key: const PageStorageKey('profile'),
      state: widget.state,
      onLogout: () => setState(() => tab = 0),
    ),
  ];

  Future<void> _selectTab(int index) async {
    if (index == tab) return;
    if (index > 1 && !widget.state.isLoggedIn) {
      final loggedIn = await openLogin(context, widget.state);
      if (loggedIn != true || !mounted) return;
    }
    appSelectionFeedback(context);
    setState(() => tab = index);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: IndexedStack(index: tab, children: _pages),
      ),
      bottomNavigationBar: AppBottomNavigationBar(
        selectedIndex: tab,
        onDestinationSelected: _selectTab,
      ),
    );
  }
}

class AppBottomNavigationBar extends StatelessWidget {
  const AppBottomNavigationBar({
    super.key,
    required this.selectedIndex,
    required this.onDestinationSelected,
  });

  final int selectedIndex;
  final ValueChanged<int> onDestinationSelected;

  static const _destinations = [
    (Icons.explore_outlined, Icons.explore, '发现'),
    (Icons.map_outlined, Icons.map, '岛屿'),
    (Icons.add_circle_outline, Icons.add_circle, '发布'),
    (Icons.notifications_none, Icons.notifications, '通知'),
    (Icons.person_outline, Icons.person, '我的'),
  ];

  @override
  Widget build(BuildContext context) {
    final duration = appMotionDuration(
      context,
      const Duration(milliseconds: 180),
    );
    return DecoratedBox(
      decoration: const BoxDecoration(
        color: AppColors.white,
        border: Border(top: BorderSide(color: AppColors.line)),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 72,
          child: Row(
            children: [
              for (var index = 0; index < _destinations.length; index++)
                Expanded(
                  child: AppPressable(
                    semanticLabel: _destinations[index].$3,
                    onTap: () => onDestinationSelected(index),
                    borderRadius: BorderRadius.circular(AppRadius.control),
                    child: AnimatedContainer(
                      duration: duration,
                      curve: Curves.easeOutCubic,
                      margin: const EdgeInsets.symmetric(
                        horizontal: AppSpace.xs,
                        vertical: AppSpace.sm,
                      ),
                      decoration: BoxDecoration(
                        color: selectedIndex == index
                            ? AppColors.skyPale
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(AppRadius.control),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            selectedIndex == index
                                ? _destinations[index].$2
                                : _destinations[index].$1,
                            size: 22,
                            color: selectedIndex == index
                                ? AppColors.primary
                                : AppColors.inkSoft,
                          ),
                          const SizedBox(height: AppSpace.xs),
                          Text(
                            _destinations[index].$3,
                            style: Theme.of(context).textTheme.labelSmall
                                ?.copyWith(
                                  color: selectedIndex == index
                                      ? AppColors.primary
                                      : AppColors.inkSoft,
                                  fontWeight: selectedIndex == index
                                      ? FontWeight.w700
                                      : FontWeight.w500,
                                ),
                          ),
                        ],
                      ),
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

class TopBar extends StatelessWidget {
  const TopBar({super.key, required this.title, this.action, this.subtitle});

  final String title;
  final Widget? action;
  final String? subtitle;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(
      AppSpace.md,
      AppSpace.sm,
      AppSpace.md,
      AppSpace.md,
    ),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: Theme.of(context).textTheme.titleLarge),
              if (subtitle != null)
                Text(subtitle!, style: Theme.of(context).textTheme.bodyMedium),
            ],
          ),
        ),
        ?action,
      ],
    ),
  );
}
