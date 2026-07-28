import { useCallback, useState, type ReactNode } from "react";
import { X, LogIn } from "lucide-react";
import { authStore, useAuthUser } from "@/lib/authStore";
import { useRouterState } from "@tanstack/react-router";

type GateState = { open: boolean; action: string };

export function useLoginGate() {
    const user = useAuthUser();
    const [state, setState] = useState<GateState>({ open: false, action: "" });

    const require = useCallback(
        (action: string, fn: () => void) => {
            if (user) {
                fn();
                return true;
            }
            setState({ open: true, action });
            return false;
        },
        [user],
    );

    const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);

    return { user, require, gateProps: { ...state, onClose: close } };
}

export function LoginGateModal({
    open,
    action,
    onClose,
}: {
    open: boolean;
    action: string;
    onClose: () => void;
}) {
    const pathname = useRouterState({ select: (s) => s.location.pathname });
    if (!open) return null;

    function openAuth(tab: "login" | "register") {
        onClose();
        authStore.openAuth({ tab, redirect: pathname, action });
    }

    return (
        <div
            className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 backdrop-blur-sm md:items-center"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="glass-elevated relative w-full max-w-[380px] rounded-t-[20px] border border-[color:var(--border)] p-6 md:rounded-[20px]"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-black/[0.04] hover:text-foreground"
                    aria-label="关闭"
                >
                    <X className="h-4 w-4" strokeWidth={1.75} />
                </button>

                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[12px] bg-foreground text-white">
                    <LogIn className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <h3 className="text-[16px] font-semibold text-foreground">登录后即可{action}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">
                    加入大蓝岛，关注你感兴趣的圈子，与作者互动。
                </p>

                <div className="mt-5 flex flex-col gap-2">
                    <button
                        onClick={() => openAuth("login")}
                        className="flex h-10 items-center justify-center rounded-[12px] bg-foreground text-[13.5px] font-medium text-white transition-colors hover:bg-[color:var(--action-primary-hover)]"
                    >
                        登录
                    </button>
                    <button
                        onClick={() => openAuth("register")}
                        className="flex h-10 items-center justify-center rounded-[12px] border border-[color:var(--border-default)] bg-white/60 text-[13.5px] font-medium text-foreground transition-colors hover:bg-[color:var(--action-muted)]"
                    >
                        注册新账号
                    </button>
                </div>
            </div>
        </div>
    );
}

export function LoginGate({ children }: { children: ReactNode }) {
    return <>{children}</>;
}
