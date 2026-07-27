import 'package:flutter_test/flutter_test.dart';
import 'package:dalanbook_webview_app/app_config.dart';
import 'package:dalanbook_webview_app/media_picker_config.dart';

void main() {
  test('uses the deployed HTTP entry by default', () {
    final config = WebAppConfig.fromEnvironment();

    expect(config.entryUri, Uri.parse('http://118.196.139.226/'));
    expect(config.allowHttp, isTrue);
    expect(config.isValid, isTrue);
  });

  test('accepts HTTPS navigation on the configured host', () {
    final config = WebAppConfig(Uri.parse('https://web.example.com'));

    expect(config.isValid, isTrue);
    expect(
      config.isTrusted(Uri.parse('https://web.example.com/posts/1')),
      isTrue,
    );
    expect(config.isTrusted(Uri.parse('https://other.example.com')), isFalse);
  });

  test('allows HTTP entry and navigation when enabled', () {
    final config = WebAppConfig(Uri.parse('http://127.0.0.1:5174/'));

    expect(config.isValid, isTrue);
    expect(
      config.isTrusted(Uri.parse('http://127.0.0.1:5174/posts/1')),
      isTrue,
    );
  });

  test('rejects HTTP entry and navigation when disabled', () {
    final config = WebAppConfig(
      Uri.parse('http://127.0.0.1:5174/'),
      allowHttp: false,
    );

    expect(config.isValid, isFalse);
    expect(
      config.isTrusted(Uri.parse('http://127.0.0.1:5174/posts/1')),
      isFalse,
    );
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

  test('normalizes the root path when comparing web documents', () {
    expect(
      isSameWebDocument(
        Uri.parse('https://web.example.com'),
        Uri.parse('https://web.example.com/#feed'),
      ),
      isTrue,
    );
    expect(
      isSameWebDocument(
        Uri.parse('https://web.example.com/?page=1'),
        Uri.parse('https://web.example.com/?page=2'),
      ),
      isFalse,
    );
  });

  test('maps image and video accept types to native media pickers', () {
    expect(acceptedMediaType(['image/*']), AcceptedMediaType.image);
    expect(acceptedMediaType(['video/mp4']), AcceptedMediaType.video);
    expect(acceptedMediaType(['image/*,video/*']), AcceptedMediaType.mixed);
    expect(
      acceptedMediaType(['application/pdf']),
      AcceptedMediaType.unsupported,
    );
  });
}
