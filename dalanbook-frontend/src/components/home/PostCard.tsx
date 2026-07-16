import { ThumbsUp, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Post } from "@/data/mockPosts";

const ratioClass: Record<Post["ratio"], string> = {
  "1/1": "aspect-square",
  "4/5": "aspect-[4/5]",
  "3/4": "aspect-[3/4]",
  "4/3": "aspect-[4/3]",
  "16/9": "aspect-[16/9]",
};

export function PostCard({ post }: { post: Post }) {
  const initial = post.author.slice(0, 1);
  const circleId = post.circleId;

  return (
    <article className="group relative mb-3 md:mb-4 block break-inside-avoid overflow-hidden rounded-[16px] border border-[color:var(--border)] bg-white shadow-[var(--shadow-subtle)] transition-all duration-[220ms] ease-out hover:-translate-y-0.5 hover:shadow-[var(--shadow-floating)]">
      <Link to="/posts/$id" params={{ id: post.id }} className="block" aria-label={post.title}>
        <div className={`relative overflow-hidden ${ratioClass[post.ratio]}`}>
          <img
            src={post.cover}
            alt={post.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-[220ms] ease-out group-hover:scale-[1.015]"
          />
          {post.tag && (
            <span className="glass-dark absolute left-2 top-2 rounded-[6px] px-1.5 py-0.5 text-[10.5px] font-medium text-white">
              {post.tag}
            </span>
          )}
        </div>
      </Link>

      <div className="p-2.5 md:p-3">
        <div className="mb-1.5">
          {circleId ? (
            <Link
              to="/circles/$id"
              params={{ id: circleId }}
              className="inline-flex items-center gap-1 rounded-md bg-[color:var(--action-muted)] px-1.5 py-0.5 text-[11px] font-medium text-text-secondary transition-colors hover:bg-foreground hover:text-white"
            >
              <Users className="h-3 w-3" strokeWidth={1.75} />
              {post.circle}
            </Link>
          ) : (
            <span className="inline-block rounded-md bg-[color:var(--action-muted)] px-1.5 py-0.5 text-[11px] font-medium text-text-secondary">
              {post.circle}
            </span>
          )}
        </div>

        <Link to="/posts/$id" params={{ id: post.id }} className="block">
          <h3 className="line-clamp-2 text-[14px] md:text-[14.5px] font-semibold leading-snug tracking-[-0.01em] text-foreground">
            {post.title}
          </h3>

          <div className="mt-2.5 flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-1.5">
              {post.avatarUrl ? (
                <img
                  src={post.avatarUrl}
                  alt=""
                  loading="lazy"
                  className="h-5 w-5 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                  style={{ backgroundColor: post.avatarColor }}
                  aria-hidden
                >
                  {initial}
                </span>
              )}
              <span className="truncate text-[12px] text-text-secondary">{post.author}</span>
            </div>
            <div
              className={
                "flex items-center gap-1 text-[12px] " +
                (post.usefulLiked ? "text-foreground" : "text-text-tertiary")
              }
            >
              <ThumbsUp className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>{post.useful}</span>
            </div>
          </div>
        </Link>
      </div>
    </article>
  );
}
