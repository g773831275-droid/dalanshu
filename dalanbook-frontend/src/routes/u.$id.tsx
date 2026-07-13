import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, MapPin, CalendarDays, Share2, MessageCircle, Sparkles, Users } from "lucide-react";
import { TopNav } from "@/components/home/TopNav";
import { MobileTopBar } from "@/components/home/MobileTopBar";
import { MobileBottomNav } from "@/components/home/MobileBottomNav";
import { PostCard } from "@/components/home/PostCard";
import { findUser, users } from "@/data/mockUsers";
import { circles } from "@/data/mockCircles";
import { posts } from "@/data/mockPosts";
import cover from "@/assets/cover-portrait-pm.jpg";

export const Route = createFileRoute("/u/$id")({
  loader: ({ params }) => {
    const user = findUser(params.id) ?? users[0];
    if (!user) throw notFound();
    return { user };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "用户 · 大蓝书" }, { name: "robots", content: "noindex" }] };
    }
    const { user } = loaderData;
    const firstWork = posts.find((p) => p.author === user.name)?.cover;
    return {
      meta: [
        { title: `${user.name} · 大蓝书` },
        { name: "description", content: user.bio },
        { property: "og:title", content: `${user.name} · 大蓝书` },
        { property: "og:description", content: user.bio },
        ...(firstWork ? [{ property: "og:image", content: firstWork }] : []),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center text-text-secondary">
      用户不存在
    </div>
  ),
  component: UserProfile,
});

type TabKey = "posts" | "saved" | "liked";

function UserProfile() {
  const { user } = Route.useLoaderData();
  const [tab, setTab] = useState<TabKey>("posts");
  const [following, setFollowing] = useState(false);

  const worksList = useMemo(() => posts.filter((p) => p.author === user.name), [user]);
  const savedList = useMemo(() => posts.slice(0, 6), []);
  const likedList = useMemo(() => posts.slice(-6), []);
  const list = tab === "posts" ? worksList : tab === "saved" ? savedList : likedList;
  const joinedCircles = circles.filter((c) => user.joinedCircleIds.includes(c.id));

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <TopNav />
      </div>
      <MobileTopBar />

      {/* Cover */}
      <div className="relative">
        <div className="relative h-[160px] w-full overflow-hidden md:h-[220px]">
          <img src={cover} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/25 to-background" />
        </div>
        <Link
          to="/"
          className="glass-base absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-foreground md:hidden"
          aria-label="返回"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        </Link>
      </div>

      <main className="mx-auto -mt-14 max-w-[1240px] px-4 pb-28 md:-mt-16 md:px-6 md:pb-16">
        {/* Header card */}
        <section className="glass-elevated rounded-[20px] border border-[color:var(--border)] p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <span
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-[26px] font-semibold text-white shadow-[var(--shadow-subtle)]"
                style={{ backgroundColor: user.avatarColor }}
                aria-hidden
              >
                {user.name.slice(0, 1)}
              </span>
              <div className="min-w-0">
                <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-foreground md:text-[26px]">
                  {user.name}
                </h1>
                <p className="mt-1 max-w-lg text-[13.5px] leading-relaxed text-text-secondary">
                  {user.bio}
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-text-tertiary">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {user.location}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.75} />
                    加入于 {user.joinedAt}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 md:shrink-0">
              {user.id !== "me" && (
                <>
                  <button
                    onClick={() => setFollowing((v) => !v)}
                    className={
                      "h-10 rounded-[12px] px-4 text-[13.5px] font-medium transition-colors " +
                      (following
                        ? "bg-[color:var(--action-muted)] text-text-secondary hover:text-foreground"
                        : "bg-foreground text-white hover:bg-[color:var(--action-primary-hover)]")
                    }
                  >
                    {following ? "已关注" : "+ 关注"}
                  </button>
                  <button
                    className="flex h-10 items-center gap-1.5 rounded-[12px] border border-[color:var(--border-default)] bg-white/60 px-3 text-[13px] text-text-secondary transition-colors hover:text-foreground"
                    aria-label="私信"
                  >
                    <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
                    私信
                  </button>
                </>
              )}
              {user.id === "me" && (
                <Link
                  to="/publish"
                  className="h-10 rounded-[12px] bg-foreground px-4 text-[13.5px] font-medium leading-10 text-white hover:bg-[color:var(--action-primary-hover)]"
                >
                  发布笔记
                </Link>
              )}
              <button
                className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[color:var(--border-default)] bg-white/60 text-text-secondary transition-colors hover:text-foreground"
                aria-label="分享"
              >
                <Share2 className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          </div>

          {/* Stats */}
          <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-[color:var(--border)] pt-4 text-center text-[12px] text-text-tertiary">
            <div>
              <dd className="text-[18px] font-semibold text-foreground">{user.worksCount}</dd>
              <dt className="mt-0.5">作品</dt>
            </div>
            <div>
              <dd className="text-[18px] font-semibold text-foreground">{user.followers}</dd>
              <dt className="mt-0.5">粉丝</dt>
            </div>
            <div>
              <dd className="text-[18px] font-semibold text-foreground">{user.following}</dd>
              <dt className="mt-0.5">关注</dt>
            </div>
          </dl>

          {user.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {user.tags.map((t: string) => (
                <span
                  key={t}
                  className="rounded-full border border-[color:var(--border)] bg-white/50 px-2.5 py-0.5 text-[12px] text-text-secondary"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Content + sidebar */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
          <div className="min-w-0">
            <div className="sticky top-[76px] z-10 -mx-4 mb-4 border-b border-[color:var(--border)] bg-background/80 px-4 backdrop-blur md:top-[84px] md:mx-0 md:px-0">
              <div className="flex items-center gap-1">
                {(
                  [
                    { key: "posts", label: "笔记" },
                    { key: "saved", label: "收藏" },
                    { key: "liked", label: "点赞" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={
                      "relative h-11 px-3 text-[14px] font-medium transition-colors " +
                      (tab === t.key
                        ? "text-foreground"
                        : "text-text-tertiary hover:text-foreground")
                    }
                  >
                    {t.label}
                    {tab === t.key && (
                      <span className="absolute inset-x-3 -bottom-px h-[2px] rounded-full bg-foreground" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {list.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-[16px] border border-dashed border-[color:var(--border-default)] py-16 text-text-tertiary">
                <Sparkles className="h-6 w-6" strokeWidth={1.5} />
                <span className="text-[13px]">还没有内容</span>
              </div>
            ) : (
              <div className="columns-2 gap-2.5 md:gap-4 xl:columns-3">
                {list.map((p) => (
                  <PostCard key={p.id + tab} post={p} />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-[92px] space-y-4">
              <section className="rounded-[16px] border border-[color:var(--border)] bg-white/70 p-5">
                <h3 className="mb-3 text-[13px] font-semibold text-foreground">加入的圈子</h3>
                {joinedCircles.length === 0 ? (
                  <p className="text-[12.5px] text-text-tertiary">还没有加入任何圈子</p>
                ) : (
                  <ul className="space-y-3">
                    {joinedCircles.map((c) => (
                      <li key={c.id}>
                        <Link
                          to="/circles/$id"
                          params={{ id: c.id }}
                          className="group flex items-center gap-3"
                        >
                          <span className="h-10 w-10 shrink-0 overflow-hidden rounded-[10px]">
                            <img src={c.cover} alt="" className="h-full w-full object-cover" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium text-foreground group-hover:underline">
                              {c.name}
                            </span>
                            <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-text-tertiary">
                              <Users className="h-3 w-3" strokeWidth={1.75} />
                              {c.members}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-[16px] border border-[color:var(--border)] bg-white/70 p-5">
                <h3 className="mb-3 text-[13px] font-semibold text-foreground">关注的话题</h3>
                <div className="flex flex-wrap gap-1.5">
                  {user.tags.concat(["复盘", "长期主义"]).map((t: string) => (
                    <span
                      key={t}
                      className="rounded-full bg-[color:var(--action-muted)] px-2.5 py-1 text-[11.5px] text-text-secondary"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </section>
            </div>
          </aside>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
