part of '../../app/app.dart';

class WelcomePage extends StatelessWidget {
  const WelcomePage({super.key, required this.state});

  final AppState state;

  @override
  Widget build(BuildContext context) {
    final pixelRatio = MediaQuery.devicePixelRatioOf(context);
    final imageWidth = (MediaQuery.sizeOf(context).width * pixelRatio).round();
    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          Image.asset(
            'assets/images/cover-outdoor.jpg',
            fit: BoxFit.cover,
            cacheWidth: imageWidth,
            gaplessPlayback: true,
          ),
          const ColoredBox(color: Color(0x66172A3A)),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpace.lg,
                AppSpace.lg,
                AppSpace.lg,
                AppSpace.xl,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Spacer(),
                  const Text(
                    '大蓝书',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 48,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0,
                    ),
                  ),
                  const SizedBox(height: AppSpace.sm),
                  const Text(
                    '把共同的兴趣，变成长期的相遇。',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      height: 1.4,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: AppSpace.xl),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      key: const Key('guest-browse-button'),
                      onPressed: () => Navigator.of(context).pushReplacement(
                        appPageRoute(
                          context,
                          builder: (_) => AppShell(state: state),
                        ),
                      ),
                      style: FilledButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: AppColors.ink,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      icon: const Icon(Icons.explore_outlined),
                      label: const Text('先去逛逛'),
                    ),
                  ),
                  const SizedBox(height: AppSpace.sm),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () async {
                        final result = await openLogin(context, state);
                        if (result == true && context.mounted) {
                          Navigator.of(context).pushReplacement(
                            appPageRoute(
                              context,
                              builder: (_) => AppShell(state: state),
                            ),
                          );
                        }
                      },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: const BorderSide(color: Colors.white70),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: const Text('手机号登录'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key, required this.state, this.pendingAction});

  final AppState state;
  final VoidCallback? pendingAction;

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final phone = TextEditingController();
  final code = TextEditingController();
  bool agreed = true;
  bool sent = false;

  @override
  void dispose() {
    phone.dispose();
    code.dispose();
    super.dispose();
  }

  void _login() {
    if (!agreed) {
      showMessage(context, '请先同意用户协议与隐私政策');
      return;
    }
    appCommitFeedback(context);
    widget.state.login();
    Navigator.of(context).pop(true);
    widget.pendingAction?.call();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('手机号登录')),
      body: SafeArea(
        child: ListView(
          physics: appScrollPhysics(context, alwaysScrollable: true),
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.all(AppSpace.lg),
          children: [
            Text('欢迎回来', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: AppSpace.sm),
            Text(
              '输入手机号，验证后即可启航。首次登录将自动创建账号。',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: AppSpace.xl),
            TextField(
              controller: phone,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: '手机号',
                prefixText: '+86  ',
                hintText: '请输入手机号',
              ),
            ),
            const SizedBox(height: AppSpace.compact),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: code,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: '验证码',
                      hintText: '6 位验证码',
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                SizedBox(
                  height: 56,
                  child: OutlinedButton(
                    onPressed: () {
                      setState(() => sent = true);
                      showMessage(context, '验证码已发送（原型演示）');
                    },
                    child: Text(sent ? '已发送' : '获取验证码'),
                  ),
                ),
              ],
            ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Checkbox.adaptive(
                  value: agreed,
                  onChanged: (value) => setState(() => agreed = value ?? false),
                ),
                const Expanded(
                  child: Padding(
                    padding: EdgeInsets.only(top: 12),
                    child: Text(
                      '登录即代表你已阅读并同意《用户协议》和《隐私政策》',
                      style: TextStyle(fontSize: 12, color: AppColors.inkSoft),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpace.sm),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                key: const Key('login-submit-button'),
                onPressed: _login,
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: const Text('登录并继续'),
              ),
            ),
            const SizedBox(height: AppSpace.md),
            const GlassCard(
              color: AppColors.skyPale,
              child: Row(
                children: [
                  Icon(Icons.lock_outline, color: AppColors.primary),
                  SizedBox(width: 12),
                  Expanded(child: Text('我们只会使用手机号完成身份验证，不会公开你的联系方式。')),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
