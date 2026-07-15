import { Bell, LogOut, Search } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { Logo } from "@/components/brand/Logo";
import { authStore, useAuthUser } from "@/lib/authStore";
import { logout, reportWebDevice } from "@/lib/authApi";

const navItems = [
  { label: "首页", href: "/" as const },
  { label: "圈子", href: "/circles" as const },
  { label: "发布", href: "/publish" as const },
];

export function TopNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = useAuthUser();
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

        <div className="relative ml-2 hidden max-w-[380px] flex-1 md:block">
          <Search
            className="absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-text-tertiary"
            strokeWidth={1.75}
          />
          <input
            type="text"
            placeholder="搜索圈子、经验和问题"
            className="h-9 w-full rounded-[12px] border border-[color:var(--border-default)] bg-white/60 pl-9 pr-3 text-[13px] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] placeholder:text-text-tertiary focus:border-black/30 focus:outline-none focus:ring-[3px] focus:ring-black/5"
          />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-[10px] text-text-secondary transition-colors hover:bg-black/[0.04] hover:text-foreground"
            aria-label="消息"
          >
            <Bell className="h-[17px] w-[17px]" strokeWidth={1.75} />
          </button>
          {user ? (
            <>
              <Link
                to="/u/$id"
                params={{ id: "me" }}
                className="ml-1 flex h-9 items-center gap-2 rounded-[10px] px-2 text-[13px] font-medium text-foreground transition-colors hover:bg-black/[0.04]"
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-white"
                  aria-hidden
                >
                  {user.name.slice(0, 1)}
                </span>
                <span className="max-w-[80px] truncate">{user.name}</span>
              </Link>
              <button
                onClick={() => {
                  void logout().finally(() => authStore.set(null));
                }}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] text-text-tertiary transition-colors hover:bg-black/[0.04] hover:text-foreground"
                aria-label="退出登录"
                title="退出登录"
              >
                <LogOut className="h-[15px] w-[15px]" strokeWidth={1.75} />
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
