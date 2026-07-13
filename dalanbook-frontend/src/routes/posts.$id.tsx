import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ThumbsUp,
  Bookmark,
  MessageSquare,
  Share2,
  MoreHorizontal,
  Users,
  Send,
} from "lucide-react";
import { TopNav } from "@/components/home/TopNav";
import { MobileTopBar } from "@/components/home/MobileTopBar";
import { LoginGateModal, useLoginGate } from "@/components/auth/LoginGate";
import { posts, type Post } from "@/data/mockPosts";
import { circles } from "@/data/mockCircles";

export const Route = createFileRoute("/posts/$id")({
  loader: ({ params }) => {
    const post = posts.find((p) => p.id === params.id);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "帖子不存在 · 大蓝书" }, { name: "robots", content: "noindex" }],
      };
    }
    const { post } = loaderData;
    const desc = buildBody(post)[0];
    return {
      meta: [
        { title: `${post.title} · 大蓝书` },
        { name: "description", content: desc },
        { property: "og:title", content: post.title },
        { property: "og:description", content: desc },
        { property: "og:image", content: post.cover },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center text-text-secondary">
      帖子不存在
    </div>
  ),
  component: PostDetail,
});

// Deterministic content derived from post id — avoids mutating mockPosts.
function buildBody(post: Post): string[] {
  const author = post.author;
  const circle = post.circle;
  return [
    `这是我在「${circle}」里断断续续写了两周的一篇整理，来源于我自己踩坑之后重新梳理的做法。写下来主要是给和当时的我一样的人看：需要一份能直接上手、不吹不虚的记录。`,
    `${post.title.replace(/[，,。.！!？?]/g, "")}——这件事我从三个角度重新思考了一遍：为什么会做、怎么做、以及做完之后我改掉了哪些原本以为对的习惯。`,
    "先说结论：真正起作用的从来不是「多」，而是「稳定」。每天只前进一点点、但是能持续两个月的行动，胜过一次冲刺后的长期停摆。这一点听起来像鸡汤，但我用数据反复验证过。",
    "下面这几张图，是我近期整理时随手拍的现场。没有做任何摆拍，希望对你有参考价值。如果你也在做类似的事情，欢迎在评论区一起对齐一下。",
    `——${author}`,
  ];
}

function hashPick<T>(seed: string, arr: T[]): T[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const out: T[] = [];
  const used = new Set<number>();
  for (let i = 0; i < arr.length && out.length < 3; i++) {
    const idx = (h + i * 7) % arr.length;
    if (!used.has(idx)) {
      used.add(idx);
      out.push(arr[idx]);
    }
  }
  return out;
}

const sampleComments = [
  {
    name: "周航",
    color: "#245BDB",
    time: "2 小时前",
    text: "第 3 点我特别有感触，之前也是一味求多，后来才发现节奏稳更重要。收藏了。",
    likes: 42,
  },
  {
    name: "Kai",
    color: "#1F9D6A",
    time: "5 小时前",
    text: "想问下作者，你这套方法在项目并行较多的时候还适用吗？我一忙起来就断。",
    likes: 18,
  },
  {
    name: "夜航船",
    color: "#0D1B33",
    time: "昨天",
    text: "写得非常克制，没有那些营销味的形容词，谢谢分享。已加圈。",
    likes: 9,
  },
];

function PostDetail() {
  const { post } = Route.useLoaderData();
  const body = useMemo(() => buildBody(post), [post]);

  // Derive 2–3 extra gallery images from cover pool (deterministic).
  const gallery = useMemo(() => {
    const covers = posts.map((p) => p.cover);
    const extras = hashPick(post.id, covers).filter((c) => c !== post.cover);
    return [post.cover, ...extras.slice(0, 2)];
  }, [post]);

  const related = useMemo(
    () =>
      posts
        .filter((p) => p.circle === post.circle && p.id !== post.id)
        .slice(0, 6),
    [post],
  );

  const circleMeta = useMemo(
    () => circles.find((c) => c.name === post.circle),
    [post],
  );

  const [activeImg, setActiveImg] = useState(0);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);
  const [comment, setComment] = useState("");
  const { require, gateProps } = useLoginGate();
  const usefulCount = post.useful + (liked ? 1 : 0);
  const savedCount = 128 + (saved ? 1 : 0);

  const toggleLike = () => require("给帖子点赞", () => setLiked((v) => !v));
  const toggleSave = () => require("收藏帖子", () => setSaved((v) => !v));
  const toggleFollow = () =>
    require(following ? "管理关注" : `关注 ${post.author}`, () =>
      setFollowing((v) => !v),
    );
  const submitComment = () =>
    require("发表评论", () => {
      setComment("");
    });

  const tags = useMemo(() => {
    const base = [post.circle.replace(/圈$/, ""), post.tag ?? "分享"];
    return Array.from(new Set(base.concat(["真实经验", "复盘"])));
  }, [post]);

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <TopNav />
      </div>
      <MobileTopBar />

      {/* Mobile back */}
      <Link
        to="/"
        className="glass-base fixed left-3 top-3 z-40 flex h-9 w-9 items-center justify-center rounded-full text-foreground md:hidden"
        aria-label="返回"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
      </Link>

      <main className="mx-auto max-w-[1240px] px-4 pt-4 pb-28 md:px-6 md:pt-8 md:pb-16">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Main article */}
          <article className="glass-elevated min-w-0 rounded-[20px] border border-[color:var(--border)] p-4 md:p-7">
            {/* Breadcrumb */}
            <nav className="mb-3 flex items-center gap-1.5 text-[12px] text-text-tertiary">
              <Link to="/circles" className="hover:text-foreground">
                圈子
              </Link>
              <span>/</span>
              {circleMeta ? (
                <Link
                  to="/circles/$id"
                  params={{ id: circleMeta.id }}
                  className="inline-flex items-center gap-1 rounded-full bg-[color:var(--action-muted)] px-2 py-0.5 font-medium text-foreground transition-colors hover:bg-foreground hover:text-white"
                >
                  <Users className="h-3 w-3" strokeWidth={1.75} />
                  {post.circle}
                </Link>
              ) : (
                <span className="text-foreground">{post.circle}</span>
              )}
            </nav>

            {/* Gallery */}
            <div className="overflow-hidden rounded-[16px] border border-[color:var(--border)] bg-[color:var(--action-muted)]">
              <div className="relative">
                <img
                  key={gallery[activeImg]}
                  src={gallery[activeImg]}
                  alt={post.title}
                  className="max-h-[560px] w-full object-cover"
                />
                {post.tag && (
                  <span className="glass-dark absolute left-3 top-3 rounded-[6px] px-2 py-0.5 text-[11px] font-medium text-white">
                    {post.tag}
                  </span>
                )}
              </div>
              {gallery.length > 1 && (
                <div className="flex gap-2 p-2">
                  {gallery.map((g, i) => (
                    <button
                      key={g + i}
                      onClick={() => setActiveImg(i)}
                      className={
                        "relative h-14 w-14 shrink-0 overflow-hidden rounded-[10px] border transition " +
                        (i === activeImg
                          ? "border-foreground"
                          : "border-[color:var(--border)] opacity-70 hover:opacity-100")
                      }
                      aria-label={`第 ${i + 1} 张`}
                    >
                      <img src={g} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Author row */}
            <div className="mt-5 flex items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-semibold text-white"
                style={{ backgroundColor: post.avatarColor }}
                aria-hidden
              >
                {post.author.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold text-foreground">
                  {post.author}
                </div>
                <div className="mt-0.5 text-[11.5px] text-text-tertiary">
                  发布于{" "}
                  {circleMeta ? (
                    <Link
                      to="/circles/$id"
                      params={{ id: circleMeta.id }}
                      className="text-text-secondary hover:text-foreground hover:underline"
                    >
                      {post.circle}
                    </Link>
                  ) : (
                    post.circle
                  )}{" "}
                  · 2 天前
                </div>
              </div>
              <button
                onClick={toggleFollow}
                className={
                  "h-8 rounded-[10px] px-3 text-[12.5px] font-medium transition-colors " +
                  (following
                    ? "bg-[color:var(--action-muted)] text-text-secondary hover:text-foreground"
                    : "bg-foreground text-white hover:bg-[color:var(--action-primary-hover)]")
                }
              >
                {following ? "已关注" : "+ 关注"}
              </button>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-[10px] text-text-tertiary transition-colors hover:bg-black/[0.04] hover:text-foreground"
                aria-label="更多"
              >
                <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>

            {/* Title + body */}
            <h1 className="mt-5 text-[22px] font-semibold leading-snug tracking-[-0.02em] text-foreground md:text-[26px]">
              {post.title}
            </h1>

            <div className="mt-4 space-y-4 text-[15px] leading-[1.85] text-foreground/90">
              {body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            {/* Inline circle CTA */}
            {circleMeta && (
              <Link
                to="/circles/$id"
                params={{ id: circleMeta.id }}
                className="mt-6 flex items-center gap-3 rounded-[14px] border border-[color:var(--border)] bg-[color:var(--action-muted)]/60 p-3 transition-colors hover:bg-[color:var(--action-muted)]"
              >
                <span className="h-12 w-12 shrink-0 overflow-hidden rounded-[10px]">
                  <img
                    src={circleMeta.cover}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 text-[13px] font-semibold text-foreground">
                    <Users className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {circleMeta.name}
                  </div>
                  <div className="mt-0.5 line-clamp-1 text-[11.5px] text-text-tertiary">
                    {circleMeta.members} 位成员 · {circleMeta.desc}
                  </div>
                </div>
                <span className="shrink-0 rounded-[10px] bg-foreground px-3 py-1.5 text-[12px] font-medium text-white">
                  进入圈子
                </span>
              </Link>
            )}

            {/* Topic tags */}
            <div className="mt-5 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-[color:var(--border)] bg-white/50 px-2.5 py-0.5 text-[12px] text-text-secondary"
                >
                  #{t}
                </span>
              ))}
            </div>

            {/* Stats bar */}
            <div className="mt-6 flex items-center gap-4 border-t border-[color:var(--border)] pt-4 text-[12.5px] text-text-tertiary">
              <span>{usefulCount} 觉得有用</span>
              <span>·</span>
              <span>{savedCount} 收藏</span>
              <span>·</span>
              <span>{sampleComments.length} 条评论</span>
            </div>

            {/* Desktop action row */}
            <div className="mt-4 hidden items-center gap-2 md:flex">
              <button
                onClick={toggleLike}
                className={
                  "flex h-10 items-center gap-1.5 rounded-[12px] px-4 text-[13.5px] font-medium transition-colors " +
                  (liked
                    ? "bg-foreground text-white"
                    : "border border-[color:var(--border-default)] bg-white/60 text-text-secondary hover:text-foreground")
                }
              >
                <ThumbsUp className="h-4 w-4" strokeWidth={1.75} />
                有用 {usefulCount}
              </button>
              <button
                onClick={toggleSave}
                className={
                  "flex h-10 items-center gap-1.5 rounded-[12px] px-4 text-[13.5px] font-medium transition-colors " +
                  (saved
                    ? "bg-[color:var(--action-muted)] text-foreground"
                    : "border border-[color:var(--border-default)] bg-white/60 text-text-secondary hover:text-foreground")
                }
              >
                <Bookmark className="h-4 w-4" strokeWidth={1.75} />
                收藏
              </button>
              <button
                className="flex h-10 items-center gap-1.5 rounded-[12px] border border-[color:var(--border-default)] bg-white/60 px-4 text-[13.5px] font-medium text-text-secondary transition-colors hover:text-foreground"
              >
                <Share2 className="h-4 w-4" strokeWidth={1.75} />
                分享
              </button>
            </div>

            {/* Comments */}
            <section className="mt-8">
              <h2 className="mb-3 text-[15px] font-semibold text-foreground">
                评论 · {sampleComments.length}
              </h2>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitComment();
                }}
                className="mb-5 flex items-center gap-2 rounded-[14px] border border-[color:var(--border)] bg-white/60 px-3 py-2"
              >
                <input
                  className="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-text-tertiary"
                  placeholder={`回复 @${post.author}...`}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onFocus={(e) => {
                    if (!require("发表评论", () => {})) e.currentTarget.blur();
                  }}
                />
                <button
                  type="submit"
                  className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-foreground text-white transition-colors hover:bg-[color:var(--action-primary-hover)]"
                  aria-label="发送"
                >
                  <Send className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </form>

              <ul className="space-y-5">
                {sampleComments.map((c) => (
                  <li key={c.name} className="flex gap-3">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
                      style={{ backgroundColor: c.color }}
                      aria-hidden
                    >
                      {c.name.slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[13px] font-medium text-foreground">
                          {c.name}
                        </span>
                        <span className="text-[11.5px] text-text-tertiary">
                          {c.time}
                        </span>
                      </div>
                      <p className="mt-1 text-[13.5px] leading-relaxed text-foreground/90">
                        {c.text}
                      </p>
                      <div className="mt-1.5 flex items-center gap-3 text-[11.5px] text-text-tertiary">
                        <button
                          onClick={() => require("给评论点赞", () => {})}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          <ThumbsUp className="h-3 w-3" strokeWidth={1.75} />
                          {c.likes}
                        </button>
                        <button
                          onClick={() => require(`回复 ${c.name}`, () => {})}
                          className="hover:text-foreground"
                        >
                          回复
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </article>

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-[92px] space-y-4">
              {/* Author card */}
              <section className="rounded-[16px] border border-[color:var(--border)] bg-white/70 p-5">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-full text-[15px] font-semibold text-white"
                    style={{ backgroundColor: post.avatarColor }}
                    aria-hidden
                  >
                    {post.author.slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-semibold text-foreground">
                      {post.author}
                    </div>
                    <div className="text-[11.5px] text-text-tertiary">
                      持续分享 · 大蓝书原创作者
                    </div>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-[11.5px] text-text-tertiary">
                  <div>
                    <dd className="text-[14px] font-semibold text-foreground">128</dd>
                    <dt>作品</dt>
                  </div>
                  <div>
                    <dd className="text-[14px] font-semibold text-foreground">4.2k</dd>
                    <dt>粉丝</dt>
                  </div>
                  <div>
                    <dd className="text-[14px] font-semibold text-foreground">32</dd>
                    <dt>关注</dt>
                  </div>
                </dl>
                <button
                  onClick={toggleFollow}
                  className={
                    "mt-4 h-9 w-full rounded-[10px] text-[13px] font-medium transition-colors " +
                    (following
                      ? "bg-[color:var(--action-muted)] text-text-secondary hover:text-foreground"
                      : "bg-foreground text-white hover:bg-[color:var(--action-primary-hover)]")
                  }
                >
                  {following ? "已关注" : "关注 " + post.author}
                </button>
              </section>

              {/* Circle card */}
              {circleMeta && (
                <Link
                  to="/circles/$id"
                  params={{ id: circleMeta.id }}
                  className="block overflow-hidden rounded-[16px] border border-[color:var(--border)] bg-white/70 transition-shadow hover:shadow-[var(--shadow-subtle)]"
                >
                  <div className="relative h-24 w-full overflow-hidden">
                    <img
                      src={circleMeta.cover}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  </div>
                  <div className="p-4">
                    <div className="text-[14px] font-semibold text-foreground">
                      {circleMeta.name}
                    </div>
                    <div className="mt-1 line-clamp-2 text-[12px] text-text-secondary">
                      {circleMeta.desc}
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-[11.5px] text-text-tertiary">
                      <Users className="h-3.5 w-3.5" strokeWidth={1.75} />
                      {circleMeta.members} 位成员
                    </div>
                  </div>
                </Link>
              )}

              {/* Related */}
              {related.length > 0 && (
                <section className="rounded-[16px] border border-[color:var(--border)] bg-white/70 p-5">
                  <h3 className="mb-3 text-[13px] font-semibold text-foreground">
                    同圈子推荐
                  </h3>
                  <ul className="space-y-3">
                    {related.map((r) => (
                      <li key={r.id}>
                        <Link
                          to="/posts/$id"
                          params={{ id: r.id }}
                          className="flex gap-3 group"
                        >
                          <span className="h-14 w-14 shrink-0 overflow-hidden rounded-[10px]">
                            <img
                              src={r.cover}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                            <span className="line-clamp-2 text-[12.5px] leading-snug text-foreground group-hover:underline">
                              {r.title}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] text-text-tertiary">
                              <ThumbsUp className="h-3 w-3" strokeWidth={1.75} />
                              {r.useful}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* Mobile fixed action bar */}
      <div className="glass-base fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-[color:var(--border)] px-3 py-2.5 md:hidden">
        <div className="flex min-w-0 flex-1 items-center rounded-full bg-[color:var(--action-muted)] px-3 py-2">
          <input
            className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-text-tertiary"
            placeholder={`想问 @${post.author} 什么...`}
            onFocus={(e) => {
              if (!require("发表评论", () => {})) e.currentTarget.blur();
            }}
          />
        </div>
        <button
          onClick={toggleLike}
          className={
            "flex h-10 w-10 items-center justify-center rounded-full transition-colors " +
            (liked ? "bg-foreground text-white" : "text-text-secondary")
          }
          aria-label="有用"
        >
          <ThumbsUp className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <button
          onClick={toggleSave}
          className={
            "flex h-10 w-10 items-center justify-center rounded-full transition-colors " +
            (saved ? "bg-foreground text-white" : "text-text-secondary")
          }
          aria-label="收藏"
        >
          <Bookmark className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <button
          onClick={() => require("发表评论", () => {})}
          className="flex h-10 w-10 items-center justify-center rounded-full text-text-secondary"
          aria-label="评论"
        >
          <MessageSquare className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </div>

      <LoginGateModal {...gateProps} />
    </div>
  );
}
