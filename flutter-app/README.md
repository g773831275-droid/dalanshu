# DalanBook Flutter App

Flutter WebView container for the existing `dalanbook-frontend` site. The app
must load a configured HTTPS site URL and must not contain API keys, tokens,
STS credentials, or media playback credentials.

## Run

The project package name is `flutter_app`; the repository directory retains the
planned `flutter-app` name. Run it from this directory:

```bash
flutter pub get
flutter run
```

The web entry is configured with `WEB_ENTRY_URL`. The development package uses
the repository's documented user-site host:

```bash
flutter build apk --release \
  --dart-define=WEB_ENTRY_URL=https://dev-web.scarletmoon.tech
```

Use the production HTTPS site URL for release distribution. The container only
keeps navigation within that configured host; telephone, email, and map links
open through the operating system.

The generated implementation should follow
`docs/移动端/Flutter开发计划.md`: use `webview_flutter` to load the production
same-origin site, and configure the entry URL, application identifiers, name,
icon, and launch screen through build configuration rather than committed
secrets.
