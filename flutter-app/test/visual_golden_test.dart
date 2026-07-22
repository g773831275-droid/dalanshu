import 'package:dalanbook_app/app/app.dart';
import 'package:dalanbook_app/core/mock/mock_data.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  Future<void> configurePhoneViewport(WidgetTester tester) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));
  }

  testWidgets('欢迎页视觉基线', (tester) async {
    await configurePhoneViewport(tester);
    await tester.pumpWidget(DalanBookApp(state: AppState()));
    await tester.pumpAndSettle();

    await expectLater(
      find.byType(MaterialApp),
      matchesGoldenFile('goldens/welcome.png'),
    );
  });

  testWidgets('游客发现页视觉基线', (tester) async {
    await configurePhoneViewport(tester);
    await tester.pumpWidget(DalanBookApp(state: AppState()));
    await tester.tap(find.byKey(const Key('guest-browse-button')));
    await tester.pumpAndSettle();

    await expectLater(
      find.byType(MaterialApp),
      matchesGoldenFile('goldens/discover.png'),
    );
  });
}
