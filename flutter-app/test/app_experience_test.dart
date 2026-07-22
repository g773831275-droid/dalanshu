import 'package:dalanbook_app/core/design_system/app_experience.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  Future<ScrollPhysics> physicsFor(
    WidgetTester tester,
    TargetPlatform platform,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(platform: platform),
        home: Scaffold(
          body: Builder(
            builder: (context) => ListView(
              key: const Key('platform-list'),
              physics: appScrollPhysics(context),
              children: const [SizedBox(height: 1200)],
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    return tester
        .widget<ListView>(find.byKey(const Key('platform-list')))
        .physics!;
  }

  testWidgets('滚动物理随平台切换', (tester) async {
    expect(
      await physicsFor(tester, TargetPlatform.iOS),
      isA<BouncingScrollPhysics>(),
    );
    expect(
      await physicsFor(tester, TargetPlatform.android),
      isA<ClampingScrollPhysics>(),
    );
  });

  testWidgets('减少动态效果时按压只改变透明度', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: MediaQuery(
          data: const MediaQueryData(disableAnimations: true),
          child: Scaffold(
            body: Center(
              child: AppPressable(
                key: const Key('pressable'),
                onTap: () {},
                child: const SizedBox(width: 120, height: 48),
              ),
            ),
          ),
        ),
      ),
    );

    final gesture = await tester.startGesture(
      tester.getCenter(find.byKey(const Key('pressable'))),
    );
    await tester.pump();

    final scale = tester.widget<AnimatedScale>(
      find.descendant(
        of: find.byKey(const Key('pressable')),
        matching: find.byType(AnimatedScale),
      ),
    );
    final opacity = tester.widget<AnimatedOpacity>(
      find.descendant(
        of: find.byKey(const Key('pressable')),
        matching: find.byType(AnimatedOpacity),
      ),
    );
    expect(scale.scale, 1);
    expect(opacity.opacity, 0.72);

    await gesture.up();
  });
}
