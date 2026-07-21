class WebAppConfig {
  const WebAppConfig(this.entryUri);

  factory WebAppConfig.fromEnvironment() {
    const entryUrl = String.fromEnvironment(
      'WEB_ENTRY_URL',
      defaultValue: 'https://dev-web.scarletmoon.tech',
    );
    return WebAppConfig(Uri.tryParse(entryUrl));
  }

  final Uri? entryUri;

  bool get isValid =>
      entryUri != null &&
      entryUri!.isScheme('https') &&
      entryUri!.host.isNotEmpty;

  bool isTrusted(Uri uri) {
    return isValid && uri.isScheme('https') && uri.host == entryUri!.host;
  }

  bool isSystemLink(Uri uri) {
    return const {'tel', 'mailto', 'geo', 'maps'}.contains(uri.scheme);
  }
}
