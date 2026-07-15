import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { authStore } from "@/lib/authStore";
import {
  getCaptcha,
  loginWithPassword,
  registerWithEmail,
  sendEmailCode,
  type Captcha,
} from "@/lib/authApi";
import cover from "@/assets/cover-ai-desk.jpg";

const searchSchema = z.object({
  tab: z.enum(["login", "register"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "登录 / 注册 · 大蓝书" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const loginSchema = z.object({
  account: z
    .string()
    .trim()
    .min(1, "请输入邮箱或手机号")
    .max(120)
    .refine(
      (v) => /^\S+@\S+\.\S+$/.test(v) || /^1[3-9]\d{9}$/.test(v),
      "请输入正确的邮箱或手机号",
    ),
  password: z.string().min(6, "密码至少 6 位").max(64),
});

const registerSchema = z
  .object({
    email: z.string().trim().email("邮箱格式不正确").max(120),
    emailCode: z.string().regex(/^\d{6}$/, "邮箱验证码为 6 位数字"),
    password: z.string().min(8, "密码至少 8 位").max(30),
    confirm: z.string(),
    agree: z.literal(true, { message: "请阅读并同意用户协议" }),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "两次密码不一致",
  });

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const initialTab = search.tab ?? "login";
  const [tab, setTab] = useState<"login" | "register">(initialTab);

  function switchTab(t: "login" | "register") {
    setTab(t);
    navigate({ to: "/auth", search: (prev: z.infer<typeof searchSchema>) => ({ ...prev, tab: t }), replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
        {/* Left brand panel */}
        <div className="relative hidden overflow-hidden md:flex md:flex-col md:justify-between md:p-10">
          <img
            src={cover}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/70" />
          <div className="relative z-10">
            <Logo className="text-white [&_span]:text-white" />
          </div>
          <div className="relative z-10 max-w-md text-white">
            <h2 className="text-[30px] font-semibold leading-tight tracking-[-0.02em]">
              找到和你做同一件事的人。
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-white/80">
              在大蓝书，加入真实的兴趣圈层，读到别人不吹不虚的经验。
            </p>
            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-2">
                {["#245BDB", "#1F9D6A", "#D88B16", "#0D1B33"].map((c) => (
                  <span
                    key={c}
                    className="h-8 w-8 rounded-full border-2 border-white"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <span className="text-[13px] text-white/85">已有 12 万人加入</span>
            </div>
          </div>
        </div>

        {/* Right form */}
        <div className="flex min-h-screen flex-col px-5 py-6 md:px-10 md:py-12">
          <div className="flex items-center justify-between md:justify-end">
            <Link
              to="/"
              className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary md:hidden"
              aria-label="返回"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            </Link>
            <div className="md:hidden">
              <Logo />
            </div>
            <span className="text-[13px] text-text-tertiary">
              {tab === "login" ? "还没有账号？" : "已有账号？"}{" "}
              <button
                onClick={() => switchTab(tab === "login" ? "register" : "login")}
                className="font-medium text-foreground hover:underline"
              >
                {tab === "login" ? "注册" : "登录"}
              </button>
            </span>
          </div>

          <div className="mx-auto mt-8 flex w-full max-w-[400px] flex-1 flex-col md:mt-16">
            <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-foreground">
              {tab === "login" ? "欢迎回来" : "加入大蓝书"}
            </h1>
            <p className="mt-1.5 text-[13.5px] text-text-secondary">
              {tab === "login"
                ? "登录后继续你上次的阅读与讨论。"
                : "注册后可以加入圈子、发布笔记与提问。"}
            </p>

            {/* Tabs */}
            <div className="mt-6 inline-flex self-start rounded-[10px] border border-[color:var(--border)] bg-white/60 p-1 text-[13px]">
              {(["login", "register"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => switchTab(k)}
                  className={
                    "rounded-[8px] px-3 py-1.5 transition-colors " +
                    (tab === k
                      ? "bg-foreground text-white"
                      : "text-text-secondary hover:text-foreground")
                  }
                >
                  {k === "login" ? "登录" : "注册"}
                </button>
              ))}
            </div>

            {tab === "login" ? <LoginForm /> : <RegisterForm />}

            {/* Divider */}
            <div className="my-6 flex items-center gap-3 text-[11.5px] text-text-tertiary">
              <span className="h-px flex-1 bg-[color:var(--border)]" />
              或使用以下方式
              <span className="h-px flex-1 bg-[color:var(--border)]" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "微信", color: "#1AAD19" },
                { label: "Apple", color: "#000" },
                { label: "Google", color: "#4285F4" },
              ].map((s) => (
                <button
                  key={s.label}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-[10px] border border-[color:var(--border-default)] bg-white/60 text-[12.5px] text-text-secondary transition-colors hover:text-foreground"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.label}
                </button>
              ))}
            </div>

            <p className="mt-6 text-center text-[11.5px] leading-relaxed text-text-tertiary">
              继续即表示同意《用户协议》与《隐私政策》
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[12.5px] font-medium text-text-secondary">{label}</span>
      <div className="mt-1.5">{children}</div>
      {error && <span className="mt-1 block text-[11.5px] text-[#D94B4B]">{error}</span>}
    </label>
  );
}

const inputCls =
  "h-11 w-full rounded-[10px] border border-[color:var(--border-default)] bg-white/70 px-3 text-[14px] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] placeholder:text-text-tertiary focus:border-black/30 focus:outline-none focus:ring-[3px] focus:ring-black/5";

function CaptchaInput({
  captcha,
  value,
  onChange,
  onRefresh,
  error,
}: {
  captcha: Captcha | null;
  value: string;
  onChange: (value: string) => void;
  onRefresh: () => void;
  error?: string;
}) {
  if (!captcha?.captchaEnabled) return null;
  return (
    <Field label="图形验证码" error={error}>
      <div className="flex gap-2">
        <input
          className={inputCls + " flex-1"}
          placeholder="请输入计算结果"
          value={value}
          onChange={(event) => onChange(event.target.value.trim())}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={onRefresh}
          className="h-11 w-[112px] overflow-hidden rounded-[10px] border border-[color:var(--border-default)] bg-white"
          title="看不清，换一张"
        >
          {captcha.img ? <img src={captcha.img} alt="图形验证码" className="h-full w-full object-cover" /> : "刷新"}
        </button>
      </div>
    </Field>
  );
}

function LoginForm() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [values, setValues] = useState({ account: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState<Captcha | null>(null);
  const [captchaCode, setCaptchaCode] = useState("");

  const refreshCaptcha = () => {
    setCaptchaCode("");
    void getCaptcha().then(setCaptcha).catch((error) =>
      setErrors((current) => ({ ...current, form: error instanceof Error ? error.message : "验证码加载失败" })),
    );
  };

  useEffect(refreshCaptcha, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const r = loginSchema.safeParse(values);
    if (!r.success) {
      const errs: Record<string, string> = {};
      for (const i of r.error.issues) errs[String(i.path[0])] = i.message;
      setErrors(errs);
      return;
    }
    if (captcha?.captchaEnabled && !captchaCode) {
      setErrors({ captcha: "请输入图形验证码" });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const user = await loginWithPassword(values.account, values.password, {
        uuid: captcha?.uuid,
        code: captchaCode,
      });
      authStore.set(user);
      navigate({ to: search.redirect ?? "/" });
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : "登录失败，请稍后重试" });
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-3">
      <Field label="邮箱 / 手机号" error={errors.account}>
        <input
          className={inputCls}
          placeholder="you@dalanbook.com"
          value={values.account}
          onChange={(e) => setValues((v) => ({ ...v, account: e.target.value }))}
          autoComplete="username"
        />
      </Field>
      <CaptchaInput
        captcha={captcha}
        value={captchaCode}
        onChange={setCaptchaCode}
        onRefresh={refreshCaptcha}
        error={errors.captcha}
      />
      <Field label="密码" error={errors.password}>
        <div className="relative">
          <input
            className={inputCls + " pr-10"}
            type={showPwd ? "text" : "password"}
            placeholder="至少 6 位"
            value={values.password}
            onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-text-tertiary hover:text-foreground"
            aria-label={showPwd ? "隐藏密码" : "显示密码"}
          >
            {showPwd ? (
              <EyeOff className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <Eye className="h-4 w-4" strokeWidth={1.75} />
            )}
          </button>
        </div>
      </Field>

      <div className="flex items-center justify-between text-[12.5px]">
        <label className="inline-flex items-center gap-1.5 text-text-secondary">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-[color:var(--border-default)] accent-foreground"
          />
          记住我
        </label>
        <button type="button" className="text-text-tertiary hover:text-foreground">
          忘记密码？
        </button>
      </div>

      {errors.form && <p className="text-[12px] text-[#D94B4B]">{errors.form}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-foreground text-[14px] font-medium text-white transition-colors hover:bg-[color:var(--action-primary-hover)] disabled:opacity-70"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}
        登录
      </button>
    </form>
  );
}

function RegisterForm() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [values, setValues] = useState({
    email: "",
    emailCode: "",
    password: "",
    confirm: "",
    agree: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [captcha, setCaptcha] = useState<Captcha | null>(null);
  const [captchaCode, setCaptchaCode] = useState("");

  const refreshCaptcha = () => {
    setCaptchaCode("");
    void getCaptcha().then(setCaptcha).catch((error) =>
      setErrors((current) => ({ ...current, form: error instanceof Error ? error.message : "验证码加载失败" })),
    );
  };

  useEffect(refreshCaptcha, []);
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const strength = useMemo(() => {
    const p = values.password;
    let s = 0;
    if (p.length >= 6) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  }, [values.password]);

  async function requestEmailCode() {
    const email = z.string().trim().email().safeParse(values.email);
    if (!email.success) {
      setErrors({ email: "请输入正确的邮箱" });
      return;
    }
    if (captcha?.captchaEnabled && !captchaCode) {
      setErrors({ captcha: "请先输入图形验证码" });
      return;
    }
    setSending(true);
    setErrors({});
    try {
      const devCode = await sendEmailCode({
        email: values.email,
        purpose: "register",
        uuid: captcha?.uuid,
        code: captchaCode,
      });
      if (devCode) {
        setValues((current) => ({ ...current, emailCode: devCode }));
      }
      setCountdown(60);
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : "验证码发送失败" });
    } finally {
      setSending(false);
      refreshCaptcha();
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const r = registerSchema.safeParse(values);
    if (!r.success) {
      const errs: Record<string, string> = {};
      for (const i of r.error.issues) errs[String(i.path[0])] = i.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const user = await registerWithEmail({
        email: values.email,
        emailCode: values.emailCode,
        password: values.password,
      });
      authStore.set(user);
      navigate({ to: search.redirect ?? "/" });
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : "注册失败，请稍后重试" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-3">
      <Field label="邮箱" error={errors.email}>
        <input
          className={inputCls}
          placeholder="you@dalanbook.com"
          value={values.email}
          onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
          autoComplete="email"
        />
      </Field>
      <CaptchaInput
        captcha={captcha}
        value={captchaCode}
        onChange={setCaptchaCode}
        onRefresh={refreshCaptcha}
        error={errors.captcha}
      />
      <Field label="邮箱验证码" error={errors.emailCode}>
        <div className="relative">
          <input
            className={inputCls + " pr-28"}
            placeholder="6 位数字"
            inputMode="numeric"
            maxLength={6}
            value={values.emailCode}
            onChange={(event) =>
              setValues((current) => ({ ...current, emailCode: event.target.value.replace(/\D/g, "") }))
            }
            autoComplete="one-time-code"
          />
          <button
            type="button"
            disabled={sending || countdown > 0 || !values.email.includes("@")}
            onClick={() => void requestEmailCode()}
            className="absolute right-1.5 top-1/2 h-8 -translate-y-1/2 rounded-[8px] px-3 text-[12px] font-medium text-foreground hover:bg-black/[0.04] disabled:text-text-tertiary"
          >
            {countdown > 0 ? `${countdown}s 后重发` : sending ? "发送中…" : "获取验证码"}
          </button>
        </div>
      </Field>
      <Field label="密码" error={errors.password}>
        <div className="relative">
          <input
            className={inputCls + " pr-10"}
            type={showPwd ? "text" : "password"}
            placeholder="8–30 位"
            value={values.password}
            onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-text-tertiary hover:text-foreground"
            aria-label={showPwd ? "隐藏密码" : "显示密码"}
          >
            {showPwd ? (
              <EyeOff className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <Eye className="h-4 w-4" strokeWidth={1.75} />
            )}
          </button>
        </div>
        {values.password && (
          <div className="mt-1.5 flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={
                  "h-1 flex-1 rounded-full " +
                  (i < strength ? "bg-foreground" : "bg-[color:var(--action-muted)]")
                }
              />
            ))}
          </div>
        )}
      </Field>
      <Field label="确认密码" error={errors.confirm}>
        <input
          className={inputCls}
          type={showPwd ? "text" : "password"}
          placeholder="再输入一次"
          value={values.confirm}
          onChange={(e) => setValues((v) => ({ ...v, confirm: e.target.value }))}
          autoComplete="new-password"
        />
      </Field>

      <label className="mt-1 flex items-start gap-2 text-[12.5px] text-text-secondary">
        <input
          type="checkbox"
          checked={values.agree}
          onChange={(e) => setValues((v) => ({ ...v, agree: e.target.checked }))}
          className="mt-0.5 h-3.5 w-3.5 rounded border-[color:var(--border-default)] accent-foreground"
        />
        <span>
          我已阅读并同意《用户协议》与《隐私政策》
        </span>
      </label>
      {errors.agree && (
        <span className="block text-[11.5px] text-[#D94B4B]">{errors.agree}</span>
      )}

      {errors.form && <p className="text-[12px] text-[#D94B4B]">{errors.form}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-foreground text-[14px] font-medium text-white transition-colors hover:bg-[color:var(--action-primary-hover)] disabled:opacity-70"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}
        注册
      </button>
    </form>
  );
}
