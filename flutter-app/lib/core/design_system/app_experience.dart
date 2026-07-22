import 'package:flutter/cupertino.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app_theme.dart';

bool appReduceMotion(BuildContext context) {
  final mediaQuery = MediaQuery.maybeOf(context);
  return (mediaQuery?.disableAnimations ?? false) ||
      (mediaQuery?.accessibleNavigation ?? false);
}

Duration appMotionDuration(BuildContext context, Duration duration) =>
    appReduceMotion(context) ? Duration.zero : duration;

bool appUsesCupertino(BuildContext context) {
  final platform = Theme.of(context).platform;
  return platform == TargetPlatform.iOS || platform == TargetPlatform.macOS;
}

ScrollPhysics appScrollPhysics(
  BuildContext context, {
  bool alwaysScrollable = false,
}) {
  if (appUsesCupertino(context)) {
    return alwaysScrollable
        ? const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics())
        : const BouncingScrollPhysics();
  }
  return alwaysScrollable
      ? const ClampingScrollPhysics(parent: AlwaysScrollableScrollPhysics())
      : const ClampingScrollPhysics();
}

class AppScrollBehavior extends MaterialScrollBehavior {
  const AppScrollBehavior();

  @override
  ScrollPhysics getScrollPhysics(BuildContext context) =>
      appScrollPhysics(context);

  @override
  Widget buildOverscrollIndicator(
    BuildContext context,
    Widget child,
    ScrollableDetails details,
  ) {
    if (appUsesCupertino(context)) return child;
    return StretchingOverscrollIndicator(
      axisDirection: details.direction,
      child: child,
    );
  }

  @override
  Set<PointerDeviceKind> get dragDevices => const {
    PointerDeviceKind.touch,
    PointerDeviceKind.mouse,
    PointerDeviceKind.trackpad,
    PointerDeviceKind.stylus,
  };
}

class AppCupertinoPageRoute<T> extends CupertinoPageRoute<T> {
  AppCupertinoPageRoute({required super.builder, super.settings});

  @override
  Duration get transitionDuration => const Duration(milliseconds: 260);

  @override
  Duration get reverseTransitionDuration => const Duration(milliseconds: 220);

  @override
  Widget buildTransitions(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    if (appReduceMotion(context)) {
      return FadeTransition(opacity: animation, child: child);
    }
    return super.buildTransitions(
      context,
      animation,
      secondaryAnimation,
      child,
    );
  }
}

Route<T> appPageRoute<T>(
  BuildContext context, {
  required WidgetBuilder builder,
  RouteSettings? settings,
}) {
  if (appUsesCupertino(context)) {
    return AppCupertinoPageRoute<T>(builder: builder, settings: settings);
  }
  final reduceMotion = appReduceMotion(context);
  return PageRouteBuilder<T>(
    settings: settings,
    transitionDuration: reduceMotion
        ? const Duration(milliseconds: 100)
        : const Duration(milliseconds: 220),
    reverseTransitionDuration: reduceMotion
        ? const Duration(milliseconds: 80)
        : const Duration(milliseconds: 180),
    pageBuilder: (context, animation, secondaryAnimation) => builder(context),
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      final opacity = CurvedAnimation(
        parent: animation,
        curve: Curves.easeOutCubic,
        reverseCurve: Curves.easeInCubic,
      );
      if (reduceMotion) {
        return FadeTransition(opacity: opacity, child: child);
      }
      final position = Tween<Offset>(
        begin: const Offset(0.035, 0),
        end: Offset.zero,
      ).animate(opacity);
      return FadeTransition(
        opacity: opacity,
        child: SlideTransition(position: position, child: child),
      );
    },
  );
}

Future<T?> showAppBottomSheet<T>({
  required BuildContext context,
  required WidgetBuilder builder,
}) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    useSafeArea: false,
    backgroundColor: Colors.transparent,
    barrierColor: AppColors.ink.withValues(alpha: 0.32),
    elevation: 0,
    sheetAnimationStyle: AnimationStyle(
      duration: appMotionDuration(context, const Duration(milliseconds: 260)),
      reverseDuration: appMotionDuration(
        context,
        const Duration(milliseconds: 200),
      ),
    ),
    builder: (sheetContext) => AppSheetSurface(child: builder(sheetContext)),
  );
}

class AppSheetSurface extends StatelessWidget {
  const AppSheetSurface({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.sizeOf(context).height * 0.82,
        ),
        decoration: const BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(AppRadius.sheet),
          ),
          boxShadow: [
            BoxShadow(
              color: Color(0x1A172A3A),
              blurRadius: 24,
              offset: Offset(0, -4),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: AppSpace.sm),
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.inkSoft.withValues(alpha: 0.28),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Flexible(child: child),
          ],
        ),
      ),
    );
  }
}

Future<void> appSelectionFeedback(BuildContext context) async {
  if (appUsesCupertino(context)) {
    await HapticFeedback.selectionClick();
  } else {
    await HapticFeedback.lightImpact();
  }
}

Future<void> appCommitFeedback(BuildContext context) =>
    appUsesCupertino(context)
    ? HapticFeedback.mediumImpact()
    : HapticFeedback.selectionClick();

class AppPressable extends StatefulWidget {
  const AppPressable({
    super.key,
    required this.child,
    required this.onTap,
    this.semanticLabel,
    this.borderRadius = const BorderRadius.all(
      Radius.circular(AppRadius.content),
    ),
    this.scale = 0.98,
    this.haptic = false,
  });

  final Widget child;
  final VoidCallback? onTap;
  final String? semanticLabel;
  final BorderRadius borderRadius;
  final double scale;
  final bool haptic;

  @override
  State<AppPressable> createState() => _AppPressableState();
}

class _AppPressableState extends State<AppPressable> {
  bool _pressed = false;

  void _setPressed(bool value) {
    if (_pressed == value || widget.onTap == null) return;
    setState(() => _pressed = value);
  }

  @override
  Widget build(BuildContext context) {
    final reduceMotion = appReduceMotion(context);
    final duration = appMotionDuration(
      context,
      const Duration(milliseconds: 110),
    );
    return Semantics(
      button: true,
      enabled: widget.onTap != null,
      label: widget.semanticLabel,
      child: MouseRegion(
        cursor: widget.onTap == null
            ? MouseCursor.defer
            : SystemMouseCursors.click,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapDown: (_) => _setPressed(true),
          onTapUp: (_) => _setPressed(false),
          onTapCancel: () => _setPressed(false),
          onTap: widget.onTap == null
              ? null
              : () {
                  if (widget.haptic) appSelectionFeedback(context);
                  widget.onTap!();
                },
          child: ClipRRect(
            borderRadius: widget.borderRadius,
            child: RepaintBoundary(
              child: AnimatedScale(
                scale: reduceMotion || !_pressed ? 1 : widget.scale,
                duration: duration,
                curve: Curves.easeOutCubic,
                child: AnimatedOpacity(
                  opacity: reduceMotion && _pressed ? 0.72 : 1,
                  duration: duration,
                  curve: Curves.easeOutCubic,
                  child: widget.child,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class AppFilterChip extends StatelessWidget {
  const AppFilterChip({
    super.key,
    required this.label,
    required this.selected,
    required this.onSelected,
  });

  final String label;
  final bool selected;
  final VoidCallback onSelected;

  @override
  Widget build(BuildContext context) {
    return AppPressable(
      semanticLabel: '${selected ? '已选中' : '选择'}$label',
      onTap: onSelected,
      haptic: true,
      borderRadius: BorderRadius.circular(AppRadius.control),
      child: AnimatedContainer(
        duration: appMotionDuration(context, const Duration(milliseconds: 180)),
        curve: Curves.easeOutCubic,
        alignment: Alignment.center,
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpace.md,
          vertical: AppSpace.sm,
        ),
        decoration: BoxDecoration(
          color: selected ? AppColors.ink : AppColors.white,
          borderRadius: BorderRadius.circular(AppRadius.control),
          border: Border.all(color: selected ? AppColors.ink : AppColors.line),
        ),
        child: Text(
          label,
          maxLines: 1,
          style: Theme.of(context).textTheme.labelLarge?.copyWith(
            color: selected ? AppColors.white : AppColors.inkSoft,
          ),
        ),
      ),
    );
  }
}

class AppSegment<T extends Object> {
  const AppSegment({required this.value, required this.label, this.icon});

  final T value;
  final String label;
  final IconData? icon;
}

class AppSegmentedControl<T extends Object> extends StatelessWidget {
  const AppSegmentedControl({
    super.key,
    required this.segments,
    required this.selected,
    required this.onChanged,
  });

  final List<AppSegment<T>> segments;
  final T selected;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpace.xs),
      decoration: BoxDecoration(
        color: AppColors.line.withValues(alpha: 0.58),
        borderRadius: BorderRadius.circular(AppRadius.control),
      ),
      child: Row(
        children: segments
            .map((segment) {
              final isSelected = segment.value == selected;
              return Expanded(
                child: AppPressable(
                  semanticLabel: segment.label,
                  onTap: isSelected
                      ? null
                      : () {
                          appSelectionFeedback(context);
                          onChanged(segment.value);
                        },
                  borderRadius: BorderRadius.circular(AppRadius.content),
                  child: AnimatedContainer(
                    duration: appMotionDuration(
                      context,
                      const Duration(milliseconds: 180),
                    ),
                    curve: Curves.easeOutCubic,
                    constraints: const BoxConstraints(minHeight: 40),
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpace.sm,
                      vertical: AppSpace.sm,
                    ),
                    decoration: BoxDecoration(
                      color: isSelected ? AppColors.white : Colors.transparent,
                      borderRadius: BorderRadius.circular(AppRadius.content),
                      boxShadow: isSelected
                          ? const [
                              BoxShadow(
                                color: Color(0x0F172A3A),
                                blurRadius: 8,
                                offset: Offset(0, 2),
                              ),
                            ]
                          : null,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        if (segment.icon != null) ...[
                          Icon(segment.icon, size: 18),
                          const SizedBox(width: AppSpace.xs),
                        ],
                        Flexible(
                          child: Text(
                            segment.label,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.labelLarge
                                ?.copyWith(
                                  color: isSelected
                                      ? AppColors.ink
                                      : AppColors.inkSoft,
                                ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            })
            .toList(growable: false),
      ),
    );
  }
}

class AppAdaptiveSwitch extends StatelessWidget {
  const AppAdaptiveSwitch({
    super.key,
    required this.value,
    required this.onChanged,
  });

  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    if (appUsesCupertino(context)) {
      return CupertinoSwitch(
        value: value,
        activeTrackColor: AppColors.primary,
        onChanged: (value) {
          appSelectionFeedback(context);
          onChanged(value);
        },
      );
    }
    return Switch(
      value: value,
      onChanged: (value) {
        appSelectionFeedback(context);
        onChanged(value);
      },
    );
  }
}

class AppLoadingIndicator extends StatefulWidget {
  const AppLoadingIndicator({super.key, this.label = '内容加载中'});

  final String label;

  @override
  State<AppLoadingIndicator> createState() => _AppLoadingIndicatorState();
}

class _AppLoadingIndicatorState extends State<AppLoadingIndicator>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (appReduceMotion(context)) {
      _controller.stop();
      _controller.value = 0.5;
    } else if (!_controller.isAnimating) {
      _controller.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: widget.label,
      liveRegion: true,
      child: RepaintBoundary(
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, child) => Row(
            mainAxisSize: MainAxisSize.min,
            children: List.generate(3, (index) {
              final distance = (_controller.value - index * 0.24).abs();
              final opacity = (1 - distance).clamp(0.28, 1.0);
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 3),
                child: Opacity(
                  opacity: opacity,
                  child: const DecoratedBox(
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                    ),
                    child: SizedBox.square(dimension: 7),
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}
