import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

abstract final class AppColors {
  static const ink = Color(0xFF172A3A);
  static const inkSoft = Color(0xFF5D7180);
  static const primary = Color(0xFF1265D8);
  static const sky = Color(0xFF7AC6D5);
  static const skyPale = Color(0xFFEAF7F8);
  static const coral = Color(0xFFE47D68);
  static const coralPale = Color(0xFFFFF0EC);
  static const mint = Color(0xFF6BB9A6);
  static const canvas = Color(0xFFF8FBFC);
  static const line = Color(0xFFE3EDF0);
  static const error = Color(0xFFC7473E);
  static const success = Color(0xFF2D846E);
  static const white = Color(0xFFFFFFFF);
}

abstract final class AppSpace {
  static const xs = 4.0;
  static const sm = 8.0;
  static const compact = 12.0;
  static const md = 16.0;
  static const lg = 24.0;
  static const xl = 32.0;
}

abstract final class AppRadius {
  static const content = 8.0;
  static const control = 12.0;
  static const sheet = 20.0;
}

ThemeData buildAppTheme() {
  final scheme =
      ColorScheme.fromSeed(
        seedColor: AppColors.primary,
        brightness: Brightness.light,
        surface: AppColors.canvas,
      ).copyWith(
        primary: AppColors.primary,
        onPrimary: AppColors.white,
        secondary: AppColors.coral,
        error: AppColors.error,
        surface: AppColors.canvas,
        onSurface: AppColors.ink,
        outline: AppColors.line,
      );
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: AppColors.canvas,
    splashFactory: NoSplash.splashFactory,
    highlightColor: Colors.transparent,
    hoverColor: AppColors.ink.withValues(alpha: 0.04),
    focusColor: AppColors.primary.withValues(alpha: 0.08),
    textTheme: const TextTheme(
      headlineLarge: TextStyle(
        fontSize: 30,
        height: 1.18,
        fontWeight: FontWeight.w700,
        letterSpacing: 0,
        color: AppColors.ink,
      ),
      headlineSmall: TextStyle(
        fontSize: 23,
        height: 1.2,
        fontWeight: FontWeight.w700,
        letterSpacing: 0,
        color: AppColors.ink,
      ),
      titleLarge: TextStyle(
        fontSize: 20,
        height: 1.2,
        fontWeight: FontWeight.w700,
        letterSpacing: 0,
        color: AppColors.ink,
      ),
      titleMedium: TextStyle(
        fontSize: 16,
        height: 1.3,
        fontWeight: FontWeight.w700,
        letterSpacing: 0,
        color: AppColors.ink,
      ),
      bodyLarge: TextStyle(
        fontSize: 16,
        height: 1.5,
        letterSpacing: 0,
        color: AppColors.ink,
      ),
      bodyMedium: TextStyle(
        fontSize: 14,
        height: 1.45,
        letterSpacing: 0,
        color: AppColors.inkSoft,
      ),
      labelLarge: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w700,
        letterSpacing: 0,
        color: AppColors.ink,
      ),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.canvas,
      foregroundColor: AppColors.ink,
      elevation: 0,
      centerTitle: false,
      scrolledUnderElevation: 0,
      surfaceTintColor: Colors.transparent,
      titleTextStyle: TextStyle(
        color: AppColors.ink,
        fontSize: 17,
        height: 1.25,
        fontWeight: FontWeight.w700,
        letterSpacing: 0,
      ),
      systemOverlayStyle: SystemUiOverlayStyle.dark,
      iconTheme: IconThemeData(size: 22, color: AppColors.ink),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.all(Radius.circular(AppRadius.control)),
        borderSide: BorderSide(color: AppColors.line),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.all(Radius.circular(AppRadius.control)),
        borderSide: BorderSide(color: AppColors.line),
      ),
      focusedBorder: const OutlineInputBorder(
        borderRadius: BorderRadius.all(Radius.circular(AppRadius.control)),
        borderSide: BorderSide(color: AppColors.primary, width: 1.5),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: ButtonStyle(
        minimumSize: const WidgetStatePropertyAll(Size(48, 48)),
        elevation: const WidgetStatePropertyAll(0),
        padding: const WidgetStatePropertyAll(
          EdgeInsets.symmetric(horizontal: 18, vertical: 13),
        ),
        shape: WidgetStatePropertyAll(
          RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.control),
          ),
        ),
        overlayColor: WidgetStatePropertyAll(
          AppColors.white.withValues(alpha: 0.10),
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: ButtonStyle(
        minimumSize: const WidgetStatePropertyAll(Size(48, 44)),
        elevation: const WidgetStatePropertyAll(0),
        side: const WidgetStatePropertyAll(BorderSide(color: AppColors.line)),
        shape: WidgetStatePropertyAll(
          RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.control),
          ),
        ),
        overlayColor: WidgetStatePropertyAll(
          AppColors.primary.withValues(alpha: 0.06),
        ),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: ButtonStyle(
        minimumSize: const WidgetStatePropertyAll(Size(44, 44)),
        shape: WidgetStatePropertyAll(
          RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.control),
          ),
        ),
        overlayColor: WidgetStatePropertyAll(
          AppColors.primary.withValues(alpha: 0.06),
        ),
      ),
    ),
    iconButtonTheme: IconButtonThemeData(
      style: ButtonStyle(
        minimumSize: const WidgetStatePropertyAll(Size.square(44)),
        iconSize: const WidgetStatePropertyAll(22),
        overlayColor: WidgetStatePropertyAll(
          AppColors.ink.withValues(alpha: 0.06),
        ),
      ),
    ),
    checkboxTheme: CheckboxThemeData(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(5)),
      side: const BorderSide(color: AppColors.inkSoft, width: 1.5),
      visualDensity: VisualDensity.compact,
    ),
    switchTheme: SwitchThemeData(
      trackOutlineColor: const WidgetStatePropertyAll(Colors.transparent),
      thumbColor: const WidgetStatePropertyAll(AppColors.white),
      trackColor: WidgetStateProperty.resolveWith(
        (states) => states.contains(WidgetState.selected)
            ? AppColors.primary
            : AppColors.inkSoft.withValues(alpha: 0.26),
      ),
    ),
    dividerTheme: const DividerThemeData(
      color: AppColors.line,
      thickness: 1,
      space: 1,
    ),
    chipTheme: ChipThemeData(
      backgroundColor: AppColors.skyPale,
      side: BorderSide.none,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.content),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 4),
      labelStyle: const TextStyle(
        color: AppColors.inkSoft,
        fontSize: 13,
        fontWeight: FontWeight.w600,
        letterSpacing: 0,
      ),
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: Colors.transparent,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
    ),
    snackBarTheme: const SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: AppColors.ink,
      elevation: 0,
      dismissDirection: DismissDirection.down,
      insetPadding: EdgeInsets.all(AppSpace.compact),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(AppRadius.control)),
      ),
      contentTextStyle: TextStyle(
        color: AppColors.white,
        height: 1.4,
        fontWeight: FontWeight.w600,
        letterSpacing: 0,
      ),
    ),
  );
}

class GlassCard extends StatelessWidget {
  const GlassCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AppSpace.md),
    this.color,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: color ?? AppColors.white.withValues(alpha: .86),
        borderRadius: BorderRadius.circular(AppRadius.content),
        border: Border.all(color: AppColors.line.withValues(alpha: 0.72)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A172A3A),
            blurRadius: 12,
            offset: Offset(0, 3),
          ),
        ],
      ),
      child: Material(type: MaterialType.transparency, child: child),
    );
  }
}

class Avatar extends StatelessWidget {
  const Avatar({
    super.key,
    required this.label,
    this.image,
    this.size = 40,
    this.background = AppColors.skyPale,
  });

  final String label;
  final String? image;
  final double size;
  final Color background;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '$label头像',
      image: image != null,
      child: ClipOval(
        child: SizedBox(
          width: size,
          height: size,
          child: image == null
              ? ColoredBox(
                  color: background,
                  child: Center(
                    child: Text(
                      label.characters.first,
                      style: TextStyle(
                        color: AppColors.ink,
                        fontWeight: FontWeight.w700,
                        fontSize: size * .4,
                      ),
                    ),
                  ),
                )
              : Image.asset(
                  image!,
                  fit: BoxFit.cover,
                  cacheWidth: (size * MediaQuery.devicePixelRatioOf(context))
                      .round(),
                  cacheHeight: (size * MediaQuery.devicePixelRatioOf(context))
                      .round(),
                ),
        ),
      ),
    );
  }
}

class AppImage extends StatelessWidget {
  const AppImage({
    super.key,
    required this.asset,
    this.height,
    this.width,
    this.fit = BoxFit.cover,
    this.borderRadius = 8,
  });

  final String asset;
  final double? height;
  final double? width;
  final BoxFit fit;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    final pixelRatio = MediaQuery.devicePixelRatioOf(context);
    final cacheWidth = width != null && width!.isFinite
        ? (width! * pixelRatio).round()
        : null;
    final cacheHeight = height != null && height!.isFinite
        ? (height! * pixelRatio).round()
        : null;
    return RepaintBoundary(
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: Image.asset(
          asset,
          height: height,
          width: width,
          fit: fit,
          cacheWidth: cacheWidth,
          cacheHeight: cacheHeight,
          gaplessPlayback: true,
          errorBuilder: (context, error, stackTrace) => ColoredBox(
            color: AppColors.skyPale,
            child: SizedBox(
              width: width,
              height: height,
              child: const Icon(
                Icons.image_outlined,
                color: AppColors.sky,
                size: 24,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.title,
    required this.message,
    this.action,
  });

  final String title;
  final String message;
  final Widget? action;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(AppSpace.xl),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.anchor_outlined, size: 44, color: AppColors.sky),
          const SizedBox(height: AppSpace.md),
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: AppSpace.sm),
          Text(
            message,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          if (action != null) ...[const SizedBox(height: AppSpace.md), action!],
        ],
      ),
    ),
  );
}

enum ContentState { loading, empty, failure }

class ContentStateView extends StatelessWidget {
  const ContentStateView({
    super.key,
    required this.state,
    this.message,
    this.onRetry,
  });

  final ContentState state;
  final String? message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    if (state == ContentState.loading) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(AppSpace.xl),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _SkeletonLine(width: 188, height: 12),
              SizedBox(height: AppSpace.compact),
              _SkeletonLine(width: 132, height: 12),
              SizedBox(height: AppSpace.md),
              _StaticLoadingDots(),
            ],
          ),
        ),
      );
    }
    final failed = state == ContentState.failure;
    return EmptyState(
      title: failed ? '暂时无法靠岸' : '这里还没有内容',
      message: message ?? (failed ? '检查网络后再试一次。' : '稍后回来看看新的航线。'),
      action: failed && onRetry != null
          ? FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('重试'),
            )
          : null,
    );
  }
}

class _SkeletonLine extends StatelessWidget {
  const _SkeletonLine({required this.width, required this.height});

  final double width;
  final double height;

  @override
  Widget build(BuildContext context) => Container(
    width: width,
    height: height,
    decoration: BoxDecoration(
      color: AppColors.line.withValues(alpha: 0.82),
      borderRadius: BorderRadius.circular(height / 2),
    ),
  );
}

class _StaticLoadingDots extends StatelessWidget {
  const _StaticLoadingDots();

  @override
  Widget build(BuildContext context) => Semantics(
    label: '内容加载中',
    liveRegion: true,
    child: const Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _LoadingDot(opacity: 0.4),
        SizedBox(width: AppSpace.xs),
        _LoadingDot(opacity: 0.7),
        SizedBox(width: AppSpace.xs),
        _LoadingDot(opacity: 1),
      ],
    ),
  );
}

class _LoadingDot extends StatelessWidget {
  const _LoadingDot({required this.opacity});

  final double opacity;

  @override
  Widget build(BuildContext context) => Opacity(
    opacity: opacity,
    child: const DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.primary,
        shape: BoxShape.circle,
      ),
      child: SizedBox.square(dimension: 7),
    ),
  );
}
