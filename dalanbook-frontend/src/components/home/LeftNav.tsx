import { Compass, Users, Clock, Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthUser } from "@/lib/authStore";
import { getHomeLeftNav } from "@/lib/homeApi";
import type { HomeChannel } from "@/lib/homeUi";

const primaryItems = [
  { id: "recommend", icon: Compass, label: "推荐" },
  { id: "following", icon: Users, label: "关注" },
  { id: "latest", icon: Clock, label: "最新" },
] as const;

export function LeftNav({
  activeChannel,
  onChannelChange,
}: {
  activeChannel: HomeChannel;
  onChannelChange: (channel: HomeChannel) => void;
}) {
  const user = useAuthUser();
  const { data, isLoading } = useQuery({
    queryKey: ["home", "left-nav", user?.id ?? "anonymous"],
    queryFn: getHomeLeftNav,
    staleTime: 60_000,
  });
  const myCircles = data?.myCircles ?? [];

  return (
    <aside className="sticky top-[132px] hidden h-[calc(100vh-160px)] w-[176px] shrink-0 overflow-y-auto pr-2 md:block">
      <nav className="space-y-0.5">
        {primaryItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onChannelChange(item.id)}
            className={
              "flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-[13.5px] transition-colors " +
              (item.id === activeChannel
                ? "bg-[color:var(--action-muted)] font-medium text-foreground"
                : "text-text-secondary hover:bg-black/[0.04] hover:text-foreground")
            }
          >
            <item.icon className="h-4 w-4" strokeWidth={1.75} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-7">
        <div className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
          我的圈子
        </div>
        <div className="space-y-0.5">
          {isLoading ? (
            <div className="space-y-2 px-3 py-2" aria-label="正在加载我的圈子">
              <div className="h-4 animate-pulse rounded bg-black/[0.05]" />
              <div className="h-4 animate-pulse rounded bg-black/[0.05]" />
            </div>
          ) : null}
          {myCircles.map((circle) => (
            <Link
              key={circle.id}
              to="/circles/$id"
              params={{ id: circle.id }}
              className="flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] text-text-secondary hover:bg-black/[0.04] hover:text-foreground"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-text-tertiary" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{circle.name}</span>
              {circle.unread > 0 ? (
                <span className="rounded-full bg-foreground px-1.5 text-[10px] text-white">
                  {Math.min(circle.unread, 99)}
                </span>
              ) : null}
            </Link>
          ))}
          <Link
            to="/circles"
            className="mt-1 flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] text-text-secondary hover:bg-black/[0.04] hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
            发现更多圈子
          </Link>
        </div>
      </div>
    </aside>
  );
}
