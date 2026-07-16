import { Search } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import type { HomeChannel } from "@/lib/homeApi";

const channels: { id: HomeChannel; label: string }[] = [
  { id: "recommend", label: "推荐" },
  { id: "following", label: "关注" },
  { id: "latest", label: "最新" },
];

export function MobileTopBar({
  showChannels = false,
  activeChannel = "recommend",
  onChannelChange,
}: {
  showChannels?: boolean;
  activeChannel?: HomeChannel;
  onChannelChange?: (channel: HomeChannel) => void;
}) {
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
        </div>
      </div>

      {showChannels && (
        <div className="no-scrollbar mt-2 flex items-center gap-1.5 overflow-x-auto px-3 pb-1">
          {channels.map((channel) => (
            <button
              key={channel.id}
              type="button"
              onClick={() => onChannelChange?.(channel.id)}
              className={
                "shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors " +
                (channel.id === activeChannel
                  ? "bg-foreground text-white"
                  : "border border-[color:var(--border)] bg-white/60 text-text-secondary")
              }
            >
              {channel.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
