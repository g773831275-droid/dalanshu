class WebAppConfig {
  const WebAppConfig(this.entryUri, {this.allowHttp = true});

  factory WebAppConfig.fromEnvironment() {
    const entryUrl = String.fromEnvironment(
      'WEB_ENTRY_URL',
      defaultValue: 'http://118.196.139.226/',
    );
    const allowHttp = bool.fromEnvironment(
      'ALLOW_HTTP_ENTRY',
      defaultValue: true,
    );
    return WebAppConfig(Uri.tryParse(entryUrl), allowHttp: allowHttp);
  }

  final Uri? entryUri;
  final bool allowHttp;

  bool get isValid =>
      entryUri != null &&
      _isAllowedScheme(entryUri!) &&
      entryUri!.host.isNotEmpty;

  bool isTrusted(Uri uri) {
    return isValid &&
        _isAllowedScheme(uri) &&
        uri.host.toLowerCase() == entryUri!.host.toLowerCase();
  }

  bool isSystemLink(Uri uri) {
    return const {'tel', 'mailto', 'geo', 'maps'}.contains(uri.scheme);
  }

  bool _isAllowedScheme(Uri uri) {
    return uri.isScheme('https') || (allowHttp && uri.isScheme('http'));
  }
}

bool isSameWebDocument(Uri first, Uri second) {
  String normalizedPath(Uri uri) => uri.path.isEmpty ? '/' : uri.path;

  return first.scheme.toLowerCase() == second.scheme.toLowerCase() &&
      first.userInfo == second.userInfo &&
      first.host.toLowerCase() == second.host.toLowerCase() &&
      first.port == second.port &&
      normalizedPath(first) == normalizedPath(second) &&
      first.query == second.query;
}
