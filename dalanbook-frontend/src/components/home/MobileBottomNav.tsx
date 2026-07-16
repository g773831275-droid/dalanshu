import { Home, Compass, Plus, User, Bell } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";

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
                        <Tab key={t.label} {...t} active={isActive(t.to)} />
                    ))}
                </div>
            </nav>
        </div>
    );
}

function Tab({ icon: Icon, label, to, active }: Item & { active?: boolean }) {
    return (
        <Link
            to={to}
            className={
                "flex flex-col items-center justify-center gap-0.5 text-[10.5px] " +
                (active ? "text-foreground" : "text-text-tertiary")
            }
        >
            <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2 : 1.75} />
            {label}
        </Link>
    );
}
