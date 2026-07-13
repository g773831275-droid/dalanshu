import { Bell, Search } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

const channels = ["推荐", "关注", "精华", "最新"];

export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-40 md:hidden">
      <div className="glass-base mx-3 mt-2 flex h-12 items-center justify-between rounded-[18px] px-3">
        <Logo size={24} />
        <div className="flex items-center gap-0.5">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-[10px] text-text-secondary"
            aria-label="搜索"
          >
            <Search className="h-[17px] w-[17px]" strokeWidth={1.75} />
          </button>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-[10px] text-text-secondary"
            aria-label="消息"
          >
            <Bell className="h-[17px] w-[17px]" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="no-scrollbar mt-2 flex items-center gap-1.5 overflow-x-auto px-3 pb-1">
        {channels.map((c, i) => (
          <button
            key={c}
            className={
              "shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors " +
              (i === 0
                ? "bg-foreground text-white"
                : "border border-[color:var(--border)] bg-white/60 text-text-secondary")
            }
          >
            {c}
          </button>
        ))}
      </div>
    </header>
  );
}
