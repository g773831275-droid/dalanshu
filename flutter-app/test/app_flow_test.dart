import 'package:dalanbook_app/app/app.dart';
import 'package:dalanbook_app/core/mock/mock_data.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  Future<void> openDiscover(WidgetTester tester, AppState state) async {
    await tester.pumpWidget(DalanBookApp(state: state));
    await tester.tap(find.byKey(const Key('guest-browse-button')));
    await tester.pumpAndSettle();
  }

  testWidgets('游客可以从欢迎页进入发现并浏览内容', (tester) async {
    await tester.binding.setSurfaceSize(const Size(320, 700));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await openDiscover(tester, AppState());

    expect(find.text('发现'), findsWidgets);
    expect(find.text('我用了 30 天 AI Agent，留下这 4 个场景'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('游客点击发布会登录并恢复到发布页', (tester) async {
    final state = AppState();
    await openDiscover(tester, state);

    await tester.tap(find.text('发布').last);
    await tester.pumpAndSettle();
    expect(find.text('手机号登录'), findsOneWidget);

    await tester.tap(find.byKey(const Key('login-submit-button')));
    await tester.pumpAndSettle();

    expect(state.isLoggedIn, isTrue);
    expect(find.text('写一条新的航线'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('大字体下五个主页面没有布局溢出', (tester) async {
    await tester.binding.setSurfaceSize(const Size(430, 900));
    tester.platformDispatcher.textScaleFactorTestValue = 1.5;
    addTearDown(() {
      tester.binding.setSurfaceSize(null);
      tester.platformDispatcher.clearTextScaleFactorTestValue();
    });

    final state = AppState()..isLoggedIn = true;
    await openDiscover(tester, state);

    for (final tab in ['岛屿', '发布', '通知', '我的', '发现']) {
      await tester.tap(find.text(tab).last);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull, reason: '$tab 页面不应溢出');
    }
  });
}
