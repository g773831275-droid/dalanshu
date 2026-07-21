import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';

import 'app_config.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(DalanBookApp(config: WebAppConfig.fromEnvironment()));
}

class DalanBookApp extends StatelessWidget {
  const DalanBookApp({super.key, required this.config});

  final WebAppConfig config;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'DalanBook',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF176B5B)),
        useMaterial3: true,
      ),
      home: WebShell(config: config),
    );
  }
}

class WebShell extends StatefulWidget {
  const WebShell({super.key, required this.config});

  final WebAppConfig config;

  @override
  State<WebShell> createState() => _WebShellState();
}

class _WebShellState extends State<WebShell> {
  late final WebViewController _controller;
  int _progress = 0;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    if (widget.config.isValid) {
      _controller = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setNavigationDelegate(
          NavigationDelegate(
            onProgress: (progress) {
              if (mounted) {
                setState(() => _progress = progress);
              }
            },
            onNavigationRequest: _handleNavigation,
            onWebResourceError: (error) {
              if (error.isForMainFrame == true && mounted) {
                setState(() => _errorMessage = error.description);
              }
            },
            onHttpError: (error) {
              if (error.request?.uri == widget.config.entryUri && mounted) {
                final statusCode = error.response?.statusCode;
                setState(
                  () => _errorMessage = statusCode == null
                      ? '服务器暂时无法响应。'
                      : '服务器返回 HTTP $statusCode。',
                );
              }
            },
          ),
        )
        ..loadRequest(widget.config.entryUri!);
    }
  }

  Future<NavigationDecision> _handleNavigation(
    NavigationRequest request,
  ) async {
    final uri = Uri.tryParse(request.url);
    if (uri == null) {
      return NavigationDecision.prevent;
    }
    if (widget.config.isTrusted(uri)) {
      return NavigationDecision.navigate;
    }
    if (widget.config.isSystemLink(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
    return NavigationDecision.prevent;
  }

  Future<void> _retry() async {
    setState(() {
      _errorMessage = null;
      _progress = 0;
    });
    await _controller.loadRequest(widget.config.entryUri!);
  }

  Future<void> _handleBack() async {
    if (await _controller.canGoBack()) {
      await _controller.goBack();
      return;
    }
    await SystemNavigator.pop();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.config.isValid) {
      return const _ErrorView(message: '网页入口地址配置无效。');
    }

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) {
          _handleBack();
        }
      },
      child: Scaffold(
        body: SafeArea(
          child: Stack(
            children: [
              WebViewWidget(controller: _controller),
              if (_progress < 100 && _errorMessage == null)
                LinearProgressIndicator(value: _progress / 100),
              if (_errorMessage != null)
                _ErrorView(message: _errorMessage!, onRetry: _retry),
            ],
          ),
        ),
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, this.onRetry});

  final String message;
  final Future<void> Function()? onRetry;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Theme.of(context).colorScheme.surface,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.wifi_off_outlined,
                size: 36,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              const SizedBox(height: 16),
              Text('页面暂时无法打开', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              Text(
                message,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              if (onRetry != null) ...[
                const SizedBox(height: 20),
                FilledButton.icon(
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh),
                  label: const Text('重试'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
