import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    ArrowLeft,
    Bookmark,
    MessageSquare,
    Share2,
    MoreHorizontal,
    Users,
    Send,
    Heart,
    Reply,
    Trash2,
} from "lucide-react";
import { TopNav } from "@/components/home/TopNav";
import { MobileTopBar } from "@/components/home/MobileTopBar";
import { ShortVideoPlayer } from "@/components/home/ShortVideoPlayer";
import { LoginGateModal, useLoginGate } from "@/components/auth/LoginGate";
import { AdaptiveImage } from "@/components/ui/adaptive-image";
import { posts, type Post } from "@/data/mockPosts";
import { circles } from "@/data/mockCircles";
import { AuthApiError } from "@/lib/authApi";
import { useAuthUser } from "@/lib/authStore";
import {
    createPostComment,
    deletePostComment,
    getPost,
    getPostComments,
    getVideoAsset,
    setPostReaction,
    type ApiComment,
    type Topic,
} from "@/lib/dalanbookApi";
import { getUserProfile, setUserFollowing } from "@/lib/userApi";

type DetailPost = Omit<Post, "useful" | "usefulLiked"> & {
    authorId: string;
    content: string;
    images: string[];
    topics: Topic[];
    createdAt: string;
    isLiked: boolean;
    isFavorited: boolean;
    likeCount: number;
    favoriteCount: number;
    commentCount: number;
};

export const Route = createFileRoute("/posts/$id")({
    loader: async ({ params }) => {
        let api: Awaited<ReturnType<typeof getPost>>;
        try {
            api = await getPost(params.id);
        } catch (error) {
            if (error instanceof AuthApiError && Number(error.code) === 404) {
                throw notFound();
            }
            throw error;
        }
        const post: DetailPost = {
            id: api.id,
            cover: api.cover,
            ratio: api.ratio,
            tag: api.tag,
            circleId: api.circle.id,
            circle: api.circle.name,
            title: api.title,
            authorId: api.author.id,
            author: api.author.name,
            avatarUrl: api.author.avatarUrl,
            avatarColor: api.author.avatarColor,
            content: api.content,
            images: api.images
                .map((image) => image.url)
                .filter((url): url is string => Boolean(url)),
            video: api.video,
            topics: api.topics,
            createdAt: api.createdAt,
            isLiked: api.isLiked,
            isFavorited: api.isFavorited,
            likeCount: api.likeCount,
            favoriteCount: api.favoriteCount,
            commentCount: api.commentCount,
        };
        return { post };
    },
    head: ({ loaderData }) => {
        if (!loaderData) {
            return {
                meta: [{ title: "帖子不存在 · 大蓝岛" }, { name: "robots", content: "noindex" }],
            };
        }
        const { post } = loaderData;
        const desc = buildBody(post)[0];
        return {
            meta: [
                { title: `${post.title} · 大蓝岛` },
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
function buildBody(post: DetailPost): string[] {
    return post.content
        .split(/\n{2,}/)
        .map((part) => part.trim())
        .filter(Boolean);
}

function topicLookupKey(value: string) {
    return value.normalize("NFKC").trim().toLocaleLowerCase().replace(/\s/g, "");
}

function renderTopicText(text: string, topics: Topic[]): ReactNode[] {
    const topicByName = new Map(topics.map((topic) => [topicLookupKey(topic.name), topic]));
    const content: ReactNode[] = [];
    const matcher = /#([^#\n]{2,20})#/gu;
    let offset = 0;
    for (const match of text.matchAll(matcher)) {
        const index = match.index ?? 0;
        if (index > offset) content.push(text.slice(offset, index));
        const topic = topicByName.get(topicLookupKey(match[1]));
        content.push(
            topic ? (
                <Link
                    key={`${topic.id}-${index}`}
                    to="/topics/$slug"
                    params={{ slug: topic.slug }}
                    className="font-medium text-foreground underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground/60"
                >
                    #{topic.name}
                </Link>
            ) : (
                match[0]
            ),
        );
        offset = index + match[0].length;
    }
    if (offset < text.length) content.push(text.slice(offset));
    return content;
}

function formatCommentTime(value: string) {
    const time = new Date(value).getTime();
    const diff = Date.now() - time;
    if (diff < 60_000) return "刚刚";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
    return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(time);
}

function formatPostTime(value: string) {
    const time = new Date(value).getTime();
    if (!Number.isFinite(time)) return "时间未知";
    const diff = Math.max(0, Date.now() - time);
    if (diff < 60_000) return "刚刚";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
    if (diff < 30 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`;
    const date = new Date(time);
    return new Intl.DateTimeFormat("zh-CN", {
        ...(date.getFullYear() === new Date().getFullYear() ? {} : { year: "numeric" }),
        month: "numeric",
        day: "numeric",
    }).format(date);
}

function PostDetail() {
    const { post } = Route.useLoaderData();
    const body = useMemo(() => buildBody(post), [post]);
    const { data: videoAsset } = useQuery({
        queryKey: ["dalanbook", "video", post.video?.assetId],
        queryFn: () => getVideoAsset(post.video!.assetId),
        enabled: Boolean(post.video && post.video.status !== "ready"),
        refetchInterval: (query) => (query.state.data?.status === "ready" ? false : 3_000),
    });
    const video = videoAsset ?? post.video;

    // Derive 2–3 extra gallery images from cover pool (deterministic).
    const gallery = useMemo(() => {
        if (video) return [];
        return post.images.length ? post.images : post.cover ? [post.cover] : [];
    }, [post, video]);

    const related = useMemo(
        () => posts.filter((p) => p.circle === post.circle && p.id !== post.id).slice(0, 6),
        [post],
    );

    const circleMeta = useMemo(() => circles.find((c) => c.name === post.circle), [post]);

    const [activeImg, setActiveImg] = useState(0);
    const [liked, setLiked] = useState(post.isLiked);
    const [saved, setSaved] = useState(post.isFavorited);
    const [following, setFollowing] = useState(false);
    const [comment, setComment] = useState("");
    const [replyTo, setReplyTo] = useState<ApiComment | null>(null);
    const [commentCount, setCommentCount] = useState(post.commentCount);
    const [commentSubmitting, setCommentSubmitting] = useState(false);
    const [commentError, setCommentError] = useState("");
    const { require, gateProps } = useLoginGate();
    const authUser = useAuthUser();
    const { data: authorProfile, refetch: refetchAuthorProfile } = useQuery({
        queryKey: ["dalanbook", "user", post.authorId],
        queryFn: () => getUserProfile(post.authorId),
    });
    const {
        data: comments,
        isLoading: commentsLoading,
        refetch: refetchComments,
    } = useQuery({
        queryKey: ["dalanbook", "post", post.id, "comments"],
        queryFn: () => getPostComments(post.id, { limit: 50 }),
    });
    const likeCount = post.likeCount + (liked === post.isLiked ? 0 : liked ? 1 : -1);
    const savedCount = post.favoriteCount + (saved === post.isFavorited ? 0 : saved ? 1 : -1);

    useEffect(() => {
        setFollowing(authorProfile?.isFollowing ?? false);
    }, [authorProfile?.isFollowing]);

    const toggleLike = () =>
        require("给帖子点赞", async () => {
            const next = !liked;
            setLiked(next);
            try {
                const result = await setPostReaction(post.id, "like", next);
                setLiked(result.active);
            } catch {
                setLiked(!next);
            }
        });
    const toggleSave = () =>
        require("收藏帖子", async () => {
            const next = !saved;
            setSaved(next);
            try {
                const result = await setPostReaction(post.id, "favorite", next);
                setSaved(result.active);
            } catch {
                setSaved(!next);
            }
        });
    const toggleFollow = () =>
        require(following ? "管理关注" : `关注 ${post.author}`, () => {
            const next = !following;
            setFollowing(next);
            void setUserFollowing(post.authorId, next)
                .then(() => refetchAuthorProfile())
                .catch(() => setFollowing(!next));
        });
    const submitComment = () => {
        const content = comment.trim();
        if (!content || commentSubmitting) return;
        require("发表评论", () => {
            void (async () => {
                setCommentSubmitting(true);
                setCommentError("");
                try {
                    await createPostComment(post.id, content, replyTo?.id);
                    setComment("");
                    setReplyTo(null);
                    setCommentCount((count) => count + 1);
                    await refetchComments();
                } catch {
                    setCommentError("评论发送失败，请稍后重试。");
                } finally {
                    setCommentSubmitting(false);
                }
            })();
        });
    };
    const removeComment = (id: string) => {
        require("删除评论", () => {
            void (async () => {
                setCommentError("");
                try {
                    await deletePostComment(id);
                    setCommentCount((count) => Math.max(0, count - 1));
                    await refetchComments();
                } catch {
                    setCommentError("评论删除失败，请稍后重试。");
                }
            })();
        });
    };

    const tags = useMemo(() => {
        const base = post.topics.map((topic) => topic.name);
        return Array.from(
            new Set(base.length ? base : [post.circle.replace(/圈$/, ""), post.tag ?? "分享"]),
        );
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

                        {/* Media */}
                        {video ? (
                            video.status === "ready" ? (
                                <ShortVideoPlayer
                                    postId={post.id}
                                    posterUrl={video.posterUrl ?? post.cover}
                                    durationMs={video.durationMs}
                                />
                            ) : (
                                <div className="relative aspect-[9/16] overflow-hidden rounded-[12px] border border-[color:var(--border)] bg-black">
                                    {(video.posterUrl ?? post.cover) ? (
                                        <AdaptiveImage
                                            src={video.posterUrl ?? post.cover}
                                            alt=""
                                            priority
                                            sizes="(max-width: 1023px) calc(100vw - 32px), 860px"
                                            className="opacity-70"
                                        />
                                    ) : null}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/35 text-center text-white">
                                        <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                        <span className="text-[13px] font-medium">
                                            {video.status === "failed" ||
                                            video.status === "rejected"
                                                ? "视频处理失败"
                                                : "视频处理中"}
                                        </span>
                                    </div>
                                </div>
                            )
                        ) : gallery.length > 0 ? (
                            <div className="overflow-hidden rounded-[16px] border border-[color:var(--border)] bg-[color:var(--action-muted)]">
                                <div className="relative flex min-h-[220px] max-h-[72svh] w-full items-center justify-center bg-black/[0.025] md:min-h-[360px]">
                                    <AdaptiveImage
                                        key={gallery[activeImg]}
                                        src={gallery[activeImg]}
                                        alt={post.title}
                                        fill={false}
                                        fit="contain"
                                        priority
                                        sizes="(max-width: 1023px) calc(100vw - 32px), 860px"
                                        className="max-h-[72svh] w-auto max-w-full"
                                    />
                                    {post.tag && (
                                        <span className="glass-dark absolute left-3 top-3 rounded-[6px] px-2 py-0.5 text-[11px] font-medium text-white">
                                            {post.tag}
                                        </span>
                                    )}
                                </div>
                                {gallery.length > 1 && (
                                    <div className="no-scrollbar flex gap-2 overflow-x-auto p-2">
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
                                                <AdaptiveImage src={g} alt="" sizes="56px" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : null}

                        {/* Author row */}
                        <div className="mt-5 flex items-center gap-3">
                            <Link
                                to="/u/$id"
                                params={{ id: post.authorId }}
                                className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                                aria-label={`查看 ${post.author} 的主页`}
                            >
                                {post.avatarUrl ? (
                                    <AdaptiveImage
                                        src={post.avatarUrl}
                                        alt=""
                                        sizes="40px"
                                        className="h-10 w-10 shrink-0 rounded-full"
                                    />
                                ) : (
                                    <span
                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
                                        style={{ backgroundColor: post.avatarColor }}
                                        aria-hidden
                                    >
                                        {post.author.slice(0, 1)}
                                    </span>
                                )}
                            </Link>
                            <div className="min-w-0 flex-1">
                                <Link
                                    to="/u/$id"
                                    params={{ id: post.authorId }}
                                    className="block truncate text-[14px] font-semibold text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                                >
                                    {post.author}
                                </Link>
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
                                    ·{" "}
                                    <time dateTime={post.createdAt}>
                                        {formatPostTime(post.createdAt)}
                                    </time>
                                </div>
                            </div>
                            {post.authorId !== authUser?.id && (
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
                            )}
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
                                <p key={i}>{renderTopicText(p, post.topics)}</p>
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
                                    <AdaptiveImage src={circleMeta.cover} alt="" sizes="48px" />
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
                                <Link
                                    key={t}
                                    to="/topics/$slug"
                                    params={{
                                        slug:
                                            post.topics.find((topic) => topic.name === t)?.slug ??
                                            t,
                                    }}
                                    className="rounded-full border border-[color:var(--border)] bg-white/50 px-2.5 py-0.5 text-[12px] text-text-secondary"
                                >
                                    #{t}
                                </Link>
                            ))}
                        </div>

                        {/* Stats bar */}
                        <div className="mt-6 flex items-center gap-4 border-t border-[color:var(--border)] pt-4 text-[12.5px] text-text-tertiary">
                            <span>{likeCount} 点赞</span>
                            <span>·</span>
                            <span>{savedCount} 收藏</span>
                            <span>·</span>
                            <span>{commentCount} 条评论</span>
                        </div>

                        {/* Desktop action row */}
                        <div className="mt-4 hidden items-center gap-2 md:flex">
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
                                收藏 {savedCount}
                            </button>
                            <button
                                onClick={toggleLike}
                                className={
                                    "flex h-10 items-center gap-1.5 rounded-[12px] px-4 text-[13.5px] font-medium transition-colors " +
                                    (liked
                                        ? "bg-[color:var(--action-muted)] text-foreground"
                                        : "border border-[color:var(--border-default)] bg-white/60 text-text-secondary hover:text-foreground")
                                }
                            >
                                <Heart className="h-4 w-4" strokeWidth={1.75} />
                                点赞 {likeCount}
                            </button>
                            <button className="flex h-10 items-center gap-1.5 rounded-[12px] border border-[color:var(--border-default)] bg-white/60 px-4 text-[13.5px] font-medium text-text-secondary transition-colors hover:text-foreground">
                                <Share2 className="h-4 w-4" strokeWidth={1.75} />
                                分享
                            </button>
                        </div>

                        {/* Comments */}
                        <section className="mt-8">
                            <h2 className="mb-3 text-[15px] font-semibold text-foreground">
                                评论 · {commentCount}
                            </h2>

                            {replyTo && (
                                <div className="mb-2 flex items-center justify-between rounded-[10px] bg-[color:var(--action-muted)] px-3 py-2 text-[12px] text-text-secondary">
                                    <span>回复 @{replyTo.author.name}</span>
                                    <button
                                        onClick={() => setReplyTo(null)}
                                        className="hover:text-foreground"
                                    >
                                        取消
                                    </button>
                                </div>
                            )}

                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    submitComment();
                                }}
                                className="mb-5 flex items-center gap-2 rounded-[14px] border border-[color:var(--border)] bg-white/60 px-3 py-2"
                            >
                                <input
                                    className="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-text-tertiary"
                                    placeholder={
                                        replyTo
                                            ? `回复 @${replyTo.author.name}...`
                                            : `回复 @${post.author}...`
                                    }
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    onFocus={(e) => {
                                        if (!require("发表评论", () => {})) e.currentTarget.blur();
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={!comment.trim() || commentSubmitting}
                                    className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-foreground text-white transition-colors hover:bg-[color:var(--action-primary-hover)]"
                                    aria-label="发送"
                                >
                                    <Send className="h-4 w-4" strokeWidth={1.75} />
                                </button>
                            </form>
                            {commentError && (
                                <p className="mb-4 text-[12px] text-[#D94B4B]">{commentError}</p>
                            )}

                            <ul className="space-y-5">
                                {commentsLoading && (
                                    <li className="text-[13px] text-text-tertiary">评论加载中…</li>
                                )}
                                {!commentsLoading && comments?.items.length === 0 && (
                                    <li className="text-[13px] text-text-tertiary">
                                        还没有评论，来说点什么吧。
                                    </li>
                                )}
                                {comments?.items.map((c) => (
                                    <li key={c.id} className="flex gap-3">
                                        <span
                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
                                            style={{ backgroundColor: c.author.avatarColor }}
                                            aria-hidden
                                        >
                                            {c.author.name.slice(0, 1)}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-[13px] font-medium text-foreground">
                                                    {c.author.name}
                                                </span>
                                                <span className="text-[11.5px] text-text-tertiary">
                                                    {formatCommentTime(c.createdAt)}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-[13.5px] leading-relaxed text-foreground/90">
                                                {c.deleted ? "该评论已删除" : c.content}
                                            </p>
                                            {!c.deleted && (
                                                <div className="mt-1.5 flex items-center gap-3 text-[11.5px] text-text-tertiary">
                                                    <button
                                                        onClick={() =>
                                                            require(`回复 ${c.author.name}`, () =>
                                                                setReplyTo(c))
                                                        }
                                                        className="inline-flex items-center gap-1 hover:text-foreground"
                                                    >
                                                        <Reply
                                                            className="h-3 w-3"
                                                            strokeWidth={1.75}
                                                        />
                                                        回复
                                                    </button>
                                                    {c.isMine && (
                                                        <button
                                                            onClick={() => removeComment(c.id)}
                                                            className="hover:text-foreground"
                                                        >
                                                            删除
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            {c.replies.length > 0 && (
                                                <ul className="mt-3 space-y-3 border-l border-[color:var(--border)] pl-3">
                                                    {c.replies.map((reply) => (
                                                        <li key={reply.id}>
                                                            <div className="flex items-baseline gap-2">
                                                                <span className="text-[12.5px] font-medium text-foreground">
                                                                    {reply.author.name}
                                                                </span>
                                                                <span className="text-[11px] text-text-tertiary">
                                                                    {formatCommentTime(
                                                                        reply.createdAt,
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <p className="mt-1 text-[13px] leading-relaxed text-foreground/90">
                                                                {reply.deleted
                                                                    ? "该回复已删除"
                                                                    : reply.content}
                                                            </p>
                                                            {!reply.deleted && reply.isMine && (
                                                                <button
                                                                    onClick={() =>
                                                                        removeComment(reply.id)
                                                                    }
                                                                    className="mt-1 inline-flex items-center gap-1 text-[11px] text-text-tertiary hover:text-foreground"
                                                                >
                                                                    <Trash2
                                                                        className="h-3 w-3"
                                                                        strokeWidth={1.75}
                                                                    />
                                                                    删除
                                                                </button>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
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
                                <Link
                                    to="/u/$id"
                                    params={{ id: post.authorId }}
                                    className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                                    aria-label={`查看 ${post.author} 的主页`}
                                >
                                    {post.avatarUrl ? (
                                        <AdaptiveImage
                                            src={post.avatarUrl}
                                            alt=""
                                            sizes="48px"
                                            className="h-12 w-12 shrink-0 rounded-full"
                                        />
                                    ) : (
                                        <span
                                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold text-white"
                                            style={{ backgroundColor: post.avatarColor }}
                                            aria-hidden
                                        >
                                            {post.author.slice(0, 1)}
                                        </span>
                                    )}
                                    <div className="min-w-0">
                                        <div className="truncate text-[14px] font-semibold text-foreground hover:underline">
                                            {post.author}
                                        </div>
                                        <div className="text-[11.5px] text-text-tertiary">
                                            持续分享 · 大蓝岛原创作者
                                        </div>
                                    </div>
                                </Link>
                                <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-[11.5px] text-text-tertiary">
                                    <div>
                                        <dd className="text-[14px] font-semibold text-foreground">
                                            {authorProfile?.postCount ?? 0}
                                        </dd>
                                        <dt>作品</dt>
                                    </div>
                                    <div>
                                        <dd className="text-[14px] font-semibold text-foreground">
                                            {authorProfile?.followerCount ?? 0}
                                        </dd>
                                        <dt>粉丝</dt>
                                    </div>
                                    <div>
                                        <dd className="text-[14px] font-semibold text-foreground">
                                            {authorProfile?.followingCount ?? 0}
                                        </dd>
                                        <dt>关注</dt>
                                    </div>
                                </dl>
                                {post.authorId !== authUser?.id && (
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
                                )}
                            </section>

                            {/* Circle card */}
                            {circleMeta && (
                                <Link
                                    to="/circles/$id"
                                    params={{ id: circleMeta.id }}
                                    className="block overflow-hidden rounded-[16px] border border-[color:var(--border)] bg-white/70 transition-shadow hover:shadow-[var(--shadow-subtle)]"
                                >
                                    <div className="relative h-24 w-full overflow-hidden">
                                        <AdaptiveImage
                                            src={circleMeta.cover}
                                            alt=""
                                            sizes="320px"
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
                                                        <AdaptiveImage
                                                            src={r.cover}
                                                            alt=""
                                                            sizes="56px"
                                                        />
                                                    </span>
                                                    <span className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                                                        <span className="line-clamp-2 text-[12.5px] leading-snug text-foreground group-hover:underline">
                                                            {r.title}
                                                        </span>
                                                        <span className="text-[11px] text-text-tertiary">
                                                            {r.author}
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
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                submitComment();
                            }
                        }}
                        onFocus={(e) => {
                            if (!require("发表评论", () => {})) e.currentTarget.blur();
                        }}
                    />
                </div>
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
                    onClick={toggleLike}
                    className={
                        "flex h-10 w-10 items-center justify-center rounded-full transition-colors " +
                        (liked ? "bg-foreground text-white" : "text-text-secondary")
                    }
                    aria-label="点赞"
                >
                    <Heart className="h-5 w-5" strokeWidth={1.75} />
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
