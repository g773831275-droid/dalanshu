import { Play, ThumbsUp, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Post } from "@/data/mockPosts";

const ratioClass: Record<Post["ratio"], string> = {
  "1/1": "aspect-square",
  "4/5": "aspect-[4/5]",
  "3/4": "aspect-[3/4]",
  "4/3": "aspect-[4/3]",
  "16/9": "aspect-[16/9]",
  "9/16": "aspect-[9/16]",
};

export function PostCard({ post }: { post: Post }) {
  const initial = post.author.slice(0, 1);
  const circleId = post.circleId;
  const isVideo = Boolean(post.video);
  const videoDuration = post.video?.durationMs
    ? `${Math.floor(post.video.durationMs / 60_000)}:${String(
        Math.floor((post.video.durationMs % 60_000) / 1_000),
      ).padStart(2, "0")}`
    : null;

  return (
    <article className="group relative mb-3 md:mb-4 block break-inside-avoid overflow-hidden rounded-[16px] border border-[color:var(--border)] bg-white shadow-[var(--shadow-subtle)] transition-all duration-[220ms] ease-out hover:-translate-y-0.5 hover:shadow-[var(--shadow-floating)]">
      {(post.cover || isVideo) && (
        <Link to="/posts/$id" params={{ id: post.id }} className="block" aria-label={post.title}>
          <div
            className={`relative overflow-hidden ${isVideo ? "aspect-[9/16] bg-black" : ratioClass[post.ratio]}`}
          >
            {post.cover ? (
              <img
                src={post.cover}
                alt={post.title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-[220ms] ease-out group-hover:scale-[1.015]"
              />
            ) : null}
            {isVideo ? (
              <>
                <span className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-foreground shadow-[0_4px_16px_rgba(0,0,0,0.25)]">
                  <Play className="ml-0.5 h-4 w-4 fill-current" strokeWidth={1.75} />
                </span>
                <span className="absolute bottom-2 right-2 rounded-md bg-black/65 px-1.5 py-0.5 text-[10.5px] font-medium text-white">
                  {post.video?.status === "ready" ? (videoDuration ?? "短视频") : "处理中"}
                </span>
              </>
            ) : null}
            {post.tag && (
              <span className="glass-dark absolute left-2 top-2 rounded-[6px] px-1.5 py-0.5 text-[10.5px] font-medium text-white">
                {post.tag}
              </span>
            )}
          </div>
        </Link>
      )}

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
          {!post.cover && post.tag && (
            <span className="mb-2 inline-block rounded-[6px] bg-[color:var(--action-muted)] px-1.5 py-0.5 text-[10.5px] font-medium text-text-secondary">
              {post.tag}
            </span>
          )}
          <h3 className="line-clamp-2 text-[14px] md:text-[14.5px] font-semibold leading-snug tracking-[-0.01em] text-foreground">
            {post.title}
          </h3>
        </Link>

        <div className="mt-2.5 flex items-center justify-between">
          {post.authorId ? (
            <Link
              to="/u/$id"
              params={{ id: post.authorId }}
              className="flex min-w-0 items-center gap-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              aria-label={`查看 ${post.author} 的主页`}
            >
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
              <span className="truncate text-[12px] text-text-secondary hover:text-foreground hover:underline">
                {post.author}
              </span>
            </Link>
          ) : (
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
          )}
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
      </div>
    </article>
  );
}
