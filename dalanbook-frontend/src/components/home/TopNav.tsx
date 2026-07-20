import { Bell, LogOut } from "lucide-react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Logo } from "@/components/brand/Logo";
import { HomeSearch } from "@/components/home/HomeSearch";
import { AdaptiveImage } from "@/components/ui/adaptive-image";
import { authStore, useAuthUser } from "@/lib/authStore";
import { logout, reportWebDevice } from "@/lib/authApi";
import { getNotificationUnreadCount } from "@/lib/notificationApi";

const navItems = [
    { label: "首页", href: "/" as const },
    { label: "圈子", href: "/circles" as const },
    { label: "发布", href: "/publish" as const },
];

export function TopNav() {
    const pathname = useRouterState({ select: (s) => s.location.pathname });
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const user = useAuthUser();
    const { data: unreadCount = 0 } = useQuery({
        queryKey: ["dalanbook", "notifications", "unread-count"],
        queryFn: getNotificationUnreadCount,
        enabled: !!user,
        staleTime: 15_000,
        refetchInterval: user ? 60_000 : false,
    });
    useEffect(() => {
        if (user) void reportWebDevice().catch(() => undefined);
    }, [user?.id]);
    return (
        <div className="pointer-events-none sticky top-0 z-40 px-4 pt-3">
            <header className="glass-base pointer-events-auto mx-auto flex h-[60px] max-w-[1240px] items-center gap-4 rounded-[20px] px-4">
                <Logo />

                <nav className="ml-2 flex items-center gap-0.5 text-[13px]">
                    {navItems.map((n) => {
                        const active =
                            n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
                        return (
                            <Link
                                key={n.label}
                                to={n.href}
                                className={
                                    "rounded-[10px] px-3 py-1.5 font-medium transition-colors " +
                                    (active
                                        ? "bg-[color:var(--action-muted)] text-foreground"
                                        : "text-text-secondary hover:bg-black/[0.04] hover:text-foreground")
                                }
                            >
                                {n.label}
                            </Link>
                        );
                    })}
                </nav>

                <HomeSearch variant="desktop" />

                <div className="ml-auto flex items-center gap-1">
                    {user ? (
                        <>
                            <Link
                                to="/messages"
                                className="relative flex h-9 w-9 items-center justify-center rounded-[10px] text-text-tertiary transition-colors hover:bg-black/[0.04] hover:text-foreground"
                                aria-label={
                                    unreadCount > 0 ? `消息，${unreadCount} 条未读` : "消息"
                                }
                                title="消息"
                            >
                                <Bell className="h-[17px] w-[17px]" strokeWidth={1.75} />
                                {unreadCount > 0 ? (
                                    <span className="absolute right-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-[#D85656] px-1 text-[9px] font-semibold leading-4 text-white">
                                        {unreadCount > 99 ? "99+" : unreadCount}
                                    </span>
                                ) : null}
                            </Link>
                            <Link
                                to="/u/$id"
                                params={{ id: "me" }}
                                className="ml-1 flex h-9 items-center gap-2 rounded-[10px] px-2 text-[13px] font-medium text-foreground transition-colors hover:bg-black/[0.04]"
                            >
                                {user.avatar ? (
                                    <AdaptiveImage
                                        src={user.avatar}
                                        alt=""
                                        sizes="28px"
                                        className="h-7 w-7 rounded-full"
                                    />
                                ) : (
                                    <span
                                        className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-white"
                                        aria-hidden
                                    >
                                        {user.name.slice(0, 1)}
                                    </span>
                                )}
                                <span className="max-w-[80px] truncate">{user.name}</span>
                            </Link>
                            <button
                                onClick={() => {
                                    void logout().finally(() => {
                                        queryClient.clear();
                                        void navigate({ to: "/" });
                                    });
                                }}
                                className="flex h-9 items-center gap-1.5 rounded-[10px] px-2.5 text-[12.5px] text-text-tertiary transition-colors hover:bg-black/[0.04] hover:text-foreground"
                                aria-label="退出登录"
                                title="退出登录"
                            >
                                <LogOut className="h-[15px] w-[15px]" strokeWidth={1.75} />
                                退出
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => authStore.openAuth({ tab: "login" })}
                            className="ml-1 rounded-[10px] bg-foreground px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-[color:var(--action-primary-hover)]"
                        >
                            登录 / 注册
                        </button>
                    )}
                </div>
            </header>
        </div>
    );
}
