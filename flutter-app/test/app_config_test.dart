import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_app/app_config.dart';

void main() {
  test('accepts HTTPS navigation on the configured host', () {
    final config = WebAppConfig(Uri.parse('https://web.example.com'));

    expect(config.isValid, isTrue);
    expect(
      config.isTrusted(Uri.parse('https://web.example.com/posts/1')),
      isTrue,
    );
    expect(config.isTrusted(Uri.parse('https://other.example.com')), isFalse);
  });

  test('allows only supported system link schemes', () {
    final config = WebAppConfig(Uri.parse('https://web.example.com'));

    expect(config.isSystemLink(Uri.parse('tel:123456')), isTrue);
    expect(
      config.isSystemLink(Uri.parse('mailto:support@example.com')),
      isTrue,
    );
    expect(
      config.isSystemLink(Uri.parse('https://other.example.com')),
      isFalse,
    );
  });
}
