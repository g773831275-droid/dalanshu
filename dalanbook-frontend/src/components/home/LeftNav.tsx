import { Compass, Users, Star, Clock, Plus } from "lucide-react";

const primaryItems = [
  { icon: Compass, label: "推荐", active: true },
  { icon: Users, label: "关注" },
  { icon: Star, label: "精华" },
  { icon: Clock, label: "最新" },
];

const myCircles = [
  "AI 工具圈",
  "职场成长圈",
  "健身减脂圈",
  "数码装备圈",
];

export function LeftNav() {
  return (
    <aside className="sticky top-[132px] hidden h-[calc(100vh-160px)] w-[176px] shrink-0 overflow-y-auto pr-2 md:block">
      <nav className="space-y-0.5">
        {primaryItems.map((it) => (
          <a
            key={it.label}
            href="#"
            className={
              "flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] transition-colors " +
              (it.active
                ? "bg-[color:var(--action-muted)] font-medium text-foreground"
                : "text-text-secondary hover:bg-black/[0.04] hover:text-foreground")
            }
          >
            <it.icon className="h-4 w-4" strokeWidth={1.75} />
            {it.label}
          </a>
        ))}
      </nav>

      <div className="mt-7">
        <div className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
          我的圈子
        </div>
        <div className="space-y-0.5">
          {myCircles.map((c) => (
            <a
              key={c}
              href="#"
              className="flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] text-text-secondary hover:bg-black/[0.04] hover:text-foreground"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-text-tertiary" aria-hidden />
              <span className="truncate">{c}</span>
            </a>
          ))}
          <a
            href="#"
            className="mt-1 flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] text-text-secondary hover:bg-black/[0.04] hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
            发现更多圈子
          </a>
        </div>
      </div>
    </aside>
  );
}
