import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Users, MessageSquare, Check } from "lucide-react";
import type { Circle } from "@/data/mockCircles";

export function CircleCard({
  circle,
  compact = false,
}: {
  circle: Circle;
  compact?: boolean;
}) {
  const [joined, setJoined] = useState(!!circle.joined);

  return (
    <article className="group flex flex-col overflow-hidden rounded-[16px] border border-[color:var(--border)] bg-white shadow-[var(--shadow-subtle)] transition-all duration-[220ms] ease-out hover:-translate-y-0.5 hover:shadow-[var(--shadow-floating)]">
      {/* Cover */}
      <Link
        to="/circles/$id"
        params={{ id: circle.id }}
        className={"relative block overflow-hidden " + (compact ? "aspect-[16/7]" : "aspect-[16/9]")}
        aria-label={circle.name}
      >
        <img
          src={circle.cover}
          alt={circle.name}
          loading="lazy"
          className="h-full w-full object-cover grayscale-[0.15] transition-transform duration-[220ms] ease-out group-hover:scale-[1.015]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link
          to="/circles/$id"
          params={{ id: circle.id }}
          className="mb-1 flex items-center gap-2"
        >
          <h3 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-foreground hover:underline">
            {circle.name}
          </h3>
        </Link>

        <p className="mb-3 line-clamp-2 text-[12.5px] leading-relaxed text-text-secondary">
          {circle.desc}
        </p>

        {!compact && circle.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {circle.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-[color:var(--action-muted)] px-2 py-0.5 text-[11px] text-text-secondary"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-1">
          <div className="flex items-center gap-3 text-[12px] text-text-tertiary">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" strokeWidth={1.75} />
              {circle.members}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.75} />
              {circle.posts}
            </span>
          </div>

          <button
            onClick={() => setJoined((v) => !v)}
            className={
              "rounded-[10px] px-3 py-1.5 text-[12.5px] font-medium transition-colors " +
              (joined
                ? "bg-[color:var(--action-muted)] text-text-secondary hover:text-foreground"
                : "bg-foreground text-white hover:bg-[color:var(--action-primary-hover)]")
            }
          >
            {joined ? (
              <span className="inline-flex items-center gap-1">
                <Check className="h-3.5 w-3.5" strokeWidth={2} />
                已加入
              </span>
            ) : (
              "加入圈子"
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
