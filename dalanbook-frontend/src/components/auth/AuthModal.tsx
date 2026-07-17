import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Eye, EyeOff, Loader2, X } from "lucide-react";
import { authStore, useAuthModal, type AuthUser } from "@/lib/authStore";
import {
    getCaptcha,
    loginWithEmail,
    registerWithEmail,
    sendEmailCode,
    type Captcha,
} from "@/lib/authApi";

type Tab = "login" | "register";

const emailLoginSchema = z.object({
    email: z.string().trim().email("请输入正确的邮箱"),
    password: z.string().min(6, "密码至少 6 位").max(64),
});
const emailRegisterSchema = z
    .object({
        email: z.string().trim().email("请输入正确的邮箱"),
        emailCode: z.string().regex(/^\d{6}$/, "邮箱验证码为 6 位数字"),
        password: z.string().min(8, "密码至少 8 位").max(30),
        confirm: z.string(),
        agree: z.literal(true, { message: "请阅读并同意用户协议" }),
    })
    .refine((v) => v.password === v.confirm, {
        path: ["confirm"],
        message: "两次密码不一致",
    });

const inputCls =
    "h-11 w-full rounded-[10px] border border-[color:var(--border-default)] bg-white/70 px-3 text-[14px] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] placeholder:text-text-tertiary focus:border-black/30 focus:outline-none focus:ring-[3px] focus:ring-black/5";

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

function useCountdown() {
    const [left, setLeft] = useState(0);
    useEffect(() => {
        if (left <= 0) return;
        const t = setTimeout(() => setLeft((v) => v - 1), 1000);
        return () => clearTimeout(t);
    }, [left]);
    return { left, start: () => setLeft(60) };
}

export function AuthModal() {
    const state = useAuthModal();
    const [tab, setTab] = useState<Tab>(state.tab);

    useEffect(() => {
        if (state.open) {
            setTab(state.tab);
        }
    }, [state.open, state.tab]);

    if (!state.open) return null;

    return (
        <div
            className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45 backdrop-blur-sm md:items-center"
            onClick={() => authStore.closeAuth()}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="glass-elevated relative w-full max-w-[420px] rounded-t-[20px] border border-[color:var(--border)] p-6 md:rounded-[20px]"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={() => authStore.closeAuth()}
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-black/[0.04] hover:text-foreground"
                    aria-label="关闭"
                >
                    <X className="h-4 w-4" strokeWidth={1.75} />
                </button>

                <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-foreground">
                    {tab === "login" ? "登录大蓝书" : "加入大蓝书"}
                </h2>
                <p className="mt-1 text-[13px] text-text-secondary">
                    {state.action
                        ? `登录后即可${state.action}`
                        : tab === "login"
                          ? "登录后继续你的阅读与讨论。"
                          : "注册后可以加入圈子、发布帖子与提问。"}
                </p>

                {/* Tabs */}
                <div className="mt-5 inline-flex self-start rounded-[10px] border border-[color:var(--border)] bg-white/60 p-1 text-[13px]">
                    {(["login", "register"] as const).map((k) => (
                        <button
                            key={k}
                            onClick={() => setTab(k)}
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

                <div className="mt-4">
                    {tab === "login" ? <EmailLoginForm /> : <EmailRegisterForm />}
                </div>

                <p className="mt-4 text-center text-[11.5px] leading-relaxed text-text-tertiary">
                    继续即表示同意《用户协议》与《隐私政策》
                </p>
            </div>
        </div>
    );
}

function useAfterAuth() {
    const navigate = useNavigate();
    return (user: AuthUser) => {
        const s = authStore.getModal();
        authStore.set(user);
        authStore.closeAuth();
        navigate({ to: s.redirect ?? "/" });
    };
}

function CaptchaField({
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
                    {captcha.img ? (
                        <img
                            src={captcha.img}
                            alt="图形验证码"
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        "刷新"
                    )}
                </button>
            </div>
        </Field>
    );
}

function SubmitBtn({ loading, children }: { loading: boolean; children: React.ReactNode }) {
    return (
        <button
            type="submit"
            disabled={loading}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-foreground text-[14px] font-medium text-white transition-colors hover:bg-[color:var(--action-primary-hover)] disabled:opacity-70"
        >
            {loading && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}
            {children}
        </button>
    );
}

function EmailLoginForm() {
    const after = useAfterAuth();
    const [values, setValues] = useState({ email: "", password: "" });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [captcha, setCaptcha] = useState<Captcha | null>(null);
    const [captchaCode, setCaptchaCode] = useState("");

    const refreshCaptcha = () => {
        setCaptchaCode("");
        void getCaptcha()
            .then(setCaptcha)
            .catch((error) =>
                setErrors((current) => ({
                    ...current,
                    form: error instanceof Error ? error.message : "验证码加载失败",
                })),
            );
    };

    useEffect(refreshCaptcha, []);

    return (
        <form
            className="space-y-3"
            onSubmit={async (e) => {
                e.preventDefault();
                const r = emailLoginSchema.safeParse(values);
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
                    const user = await loginWithEmail(values.email, values.password, {
                        uuid: captcha?.uuid,
                        code: captchaCode,
                    });
                    after(user);
                } catch (error) {
                    setErrors({
                        form: error instanceof Error ? error.message : "登录失败，请稍后重试",
                    });
                    refreshCaptcha();
                } finally {
                    setLoading(false);
                }
            }}
        >
            <Field label="邮箱" error={errors.email}>
                <input
                    className={inputCls}
                    placeholder="you@dalanbook.com"
                    value={values.email}
                    onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
                    autoComplete="username"
                />
            </Field>
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
            <CaptchaField
                captcha={captcha}
                value={captchaCode}
                onChange={setCaptchaCode}
                onRefresh={refreshCaptcha}
                error={errors.captcha}
            />
            {errors.form && <p className="text-[12px] text-[#D94B4B]">{errors.form}</p>}
            <SubmitBtn loading={loading}>登录</SubmitBtn>
        </form>
    );
}

function CodeButton({
    disabled,
    onSend,
    left,
}: {
    disabled: boolean;
    onSend: () => void;
    left: number;
}) {
    return (
        <button
            type="button"
            disabled={disabled || left > 0}
            onClick={onSend}
            className="absolute right-1.5 top-1/2 h-8 -translate-y-1/2 rounded-[8px] px-3 text-[12px] font-medium text-foreground transition-colors hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:text-text-tertiary"
        >
            {left > 0 ? `${left}s 后重发` : "获取验证码"}
        </button>
    );
}

function EmailRegisterForm() {
    const after = useAfterAuth();
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
    const [captcha, setCaptcha] = useState<Captcha | null>(null);
    const [captchaCode, setCaptchaCode] = useState("");
    const cd = useCountdown();

    const refreshCaptcha = () => {
        setCaptchaCode("");
        void getCaptcha()
            .then(setCaptcha)
            .catch((error) =>
                setErrors((current) => ({
                    ...current,
                    form: error instanceof Error ? error.message : "验证码加载失败",
                })),
            );
    };

    useEffect(refreshCaptcha, []);

    const requestEmailCode = async () => {
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
                email: values.email.trim(),
                purpose: "register",
                uuid: captcha?.uuid,
                code: captchaCode,
            });
            if (devCode) {
                setValues((current) => ({ ...current, emailCode: devCode }));
            }
            cd.start();
        } catch (error) {
            setErrors({ form: error instanceof Error ? error.message : "验证码发送失败" });
            refreshCaptcha();
        } finally {
            setSending(false);
        }
    };

    return (
        <form
            className="space-y-3"
            onSubmit={async (e) => {
                e.preventDefault();
                const r = emailRegisterSchema.safeParse(values);
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
                    after(user);
                } catch (error) {
                    setErrors({
                        form: error instanceof Error ? error.message : "注册失败，请稍后重试",
                    });
                } finally {
                    setLoading(false);
                }
            }}
        >
            <Field label="邮箱" error={errors.email}>
                <input
                    className={inputCls}
                    placeholder="you@dalanbook.com"
                    value={values.email}
                    onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
                    autoComplete="email"
                />
            </Field>
            <CaptchaField
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
                            setValues((current) => ({
                                ...current,
                                emailCode: event.target.value.replace(/\D/g, ""),
                            }))
                        }
                        autoComplete="one-time-code"
                    />
                    <CodeButton
                        disabled={sending || !values.email.includes("@")}
                        left={cd.left}
                        onSend={() => void requestEmailCode()}
                    />
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
            <AgreeCheckbox
                checked={values.agree}
                onChange={(v) => setValues((s) => ({ ...s, agree: v }))}
                error={errors.agree}
            />
            {errors.form && <p className="text-[12px] text-[#D94B4B]">{errors.form}</p>}
            <SubmitBtn loading={loading}>注册</SubmitBtn>
        </form>
    );
}

function AgreeCheckbox({
    checked,
    onChange,
    error,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    error?: string;
}) {
    return (
        <>
            <label className="mt-1 flex items-start gap-2 text-[12.5px] text-text-secondary">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 rounded border-[color:var(--border-default)] accent-foreground"
                />
                <span>我已阅读并同意《用户协议》与《隐私政策》</span>
            </label>
            {error && <span className="block text-[11.5px] text-[#D94B4B]">{error}</span>}
        </>
    );
}
