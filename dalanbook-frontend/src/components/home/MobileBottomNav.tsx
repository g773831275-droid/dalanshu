import { Home, Compass, Plus, User, Bell } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { authStore, useAuthUser } from "@/lib/authStore";
import { getNotificationUnreadCount } from "@/lib/notificationApi";

type Item = { icon: typeof Home; label: string; to: string };

const leftTabs: Item[] = [
    { icon: Home, label: "首页", to: "/" },
    { icon: Compass, label: "圈子", to: "/circles" },
];
const rightTabs: Item[] = [
    { icon: Bell, label: "消息", to: "/messages" },
    { icon: User, label: "我的", to: "/u/me" },
];

export function MobileBottomNav() {
    const pathname = useRouterState({ select: (s) => s.location.pathname });
    const user = useAuthUser();
    const { data: unreadCount = 0 } = useQuery({
        queryKey: ["dalanbook", "notifications", "unread-count"],
        queryFn: getNotificationUnreadCount,
        enabled: !!user,
        staleTime: 15_000,
        refetchInterval: user ? 60_000 : false,
    });
    const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

    return (
        <div className="fixed inset-x-0 bottom-0 z-40 md:hidden">
            <Link
                to="/publish"
                aria-label="发布"
                className="absolute left-1/2 -top-6 z-10 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-foreground text-white shadow-[0_10px_28px_rgba(0,0,0,0.22)] transition-transform duration-200 active:scale-95"
            >
                <Plus className="h-6 w-6" strokeWidth={2} />
            </Link>

            <nav className="mx-3 mb-3">
                <div className="glass-base grid h-[58px] grid-cols-[1fr_1fr_72px_1fr_1fr] items-center rounded-[22px] px-2">
                    {leftTabs.map((t) => (
                        <Tab key={t.label} {...t} active={isActive(t.to)} />
                    ))}
                    <div aria-hidden />
                    {rightTabs.map((t) => (
                        <Tab
                            key={t.label}
                            {...t}
                            active={isActive(t.to)}
                            badge={t.to === "/messages" ? unreadCount : 0}
                            onClick={
                                t.to === "/u/me" && !user
                                    ? () =>
                                          authStore.openAuth({
                                              tab: "login",
                                              redirect: "/u/me",
                                              action: "查看个人主页",
                                          })
                                    : undefined
                            }
                        />
                    ))}
                </div>
            </nav>
        </div>
    );
}

function Tab({
    icon: Icon,
    label,
    to,
    active,
    badge = 0,
    onClick,
}: Item & { active?: boolean; badge?: number; onClick?: () => void }) {
    const className =
        "flex flex-col items-center justify-center gap-0.5 text-[10.5px] " +
        (active ? "text-foreground" : "text-text-tertiary");
    const content = (
        <>
            <span className="relative">
                <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2 : 1.75} />
                {badge > 0 ? (
                    <span className="absolute -right-3 -top-2 flex min-w-4 items-center justify-center rounded-full bg-[#D85656] px-1 text-[9px] font-semibold leading-4 text-white">
                        {badge > 99 ? "99+" : badge}
                    </span>
                ) : null}
            </span>
            {label}
        </>
    );
    if (onClick) {
        return (
            <button type="button" onClick={onClick} className={className}>
                {content}
            </button>
        );
    }
    return (
        <Link to={to} className={className}>
            {content}
        </Link>
    );
}
