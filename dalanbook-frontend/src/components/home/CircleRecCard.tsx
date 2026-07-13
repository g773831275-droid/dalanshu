import { Users } from "lucide-react";

export function CircleRecCard({
  name,
  desc,
  members,
}: {
  name: string;
  desc: string;
  members: string;
}) {
  return (
    <div className="mb-3 md:mb-4 break-inside-avoid rounded-[16px] border border-[color:var(--border)] bg-white p-4 shadow-[var(--shadow-subtle)]">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[color:var(--action-muted)] text-foreground">
          <Users className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[14px] font-semibold text-foreground">
            {name}
          </div>
          <div className="text-[11px] text-text-tertiary">{members}</div>
        </div>
      </div>
      <p className="mb-3 line-clamp-3 text-[12.5px] leading-relaxed text-text-secondary">
        {desc}
      </p>
      <button className="w-full rounded-[10px] bg-foreground py-2 text-[13px] font-medium text-white transition-colors hover:bg-[color:var(--action-primary-hover)]">
        进入圈子
      </button>
    </div>
  );
}
