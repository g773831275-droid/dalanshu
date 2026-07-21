# DalanBook Flutter App

Flutter WebView container for the existing `dalanbook-frontend` site. The app
loads a configurable HTTP or HTTPS site URL and must not contain API keys,
tokens, STS credentials, or media playback credentials.

## Run

The project package name is `flutter_app`; the repository directory retains the
planned `flutter-app` name. Run it from this directory:

```bash
flutter pub get
```

The default entry is `http://118.196.139.226/`, and HTTP entries are enabled by
default. Run the app without additional entry configuration:

```bash
cd flutter-app
flutter run
```

To use the local frontend instead, start `dalanbook-frontend`, map its port to
an Android device, and override the entry URL:

```bash
adb reverse tcp:5174 tcp:5174
flutter run --dart-define=WEB_ENTRY_URL=http://127.0.0.1:5174/
```

`WEB_ENTRY_URL` controls the web entry and `ALLOW_HTTP_ENTRY` controls whether
HTTP URLs are accepted. The current deployment uses HTTP; for store or public
release builds, provide the production HTTPS URL and disable HTTP:

```bash
flutter build apk --release \
  --dart-define=WEB_ENTRY_URL=https://web.example.com/ \
  --dart-define=ALLOW_HTTP_ENTRY=false
```

The container only keeps HTTP/HTTPS navigation within the configured host;
telephone, email, and map links open through the operating system.

The generated implementation should follow
`docs/移动端/Flutter开发计划.md`: use `webview_flutter` to load the production
same-origin site, and configure the entry URL, application identifiers, name,
icon, and launch screen through build configuration rather than committed
secrets.
