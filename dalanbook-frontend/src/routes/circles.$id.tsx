import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Users, MessageSquare, Share2, Pin } from "lucide-react";
import { toast } from "sonner";
import { TopNav } from "@/components/home/TopNav";
import { MobileTopBar } from "@/components/home/MobileTopBar";
import { MobileBottomNav } from "@/components/home/MobileBottomNav";
import { PostCard } from "@/components/home/PostCard";
import { AdaptiveImage } from "@/components/ui/adaptive-image";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { authStore, useAuthUser } from "@/lib/authStore";
import {
    getCircle,
    getCirclePinnedItems,
    getCirclePostPage,
    setCircleMembership,
    type CirclePinnedItem,
} from "@/lib/dalanbookApi";

export const Route = createFileRoute("/circles/$id")({
    head: () => ({ meta: [{ title: "圈子 · 大蓝书" }] }),
    component: CircleDetail,
});

const tabs = [
    { key: "recommend", label: "推荐" },
    { key: "latest", label: "最新" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

function formatCount(value: number) {
    return new Intl.NumberFormat("zh-CN", {
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(value);
}

function pinnedMeta(item: CirclePinnedItem) {
    if (item.kind === "activity" && item.status) {
        return `${item.publisher.name} · ${item.status === "active" ? "进行中" : "已结束"}`;
    }
    return `${item.publisher.name} · ${formatCount(item.viewCount)} 阅读`;
}

function CircleDetail() {
    const { id } = Route.useParams();
    const user = useAuthUser();
    const queryClient = useQueryClient();
    const {
        data: circle,
        isLoading,
        error,
    } = useQuery({ queryKey: ["dalanbook", "circle", id], queryFn: () => getCircle(id) });
    const {
        data: postPages,
        isLoading: postsLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
        error: postsError,
    } = useInfiniteQuery({
        queryKey: ["dalanbook", "circle", id, "posts"],
        queryFn: ({ pageParam }) => getCirclePostPage({ id, cursor: pageParam, limit: 12 }),
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    });
    const {
        data: pinnedItems = [],
        isLoading: pinnedLoading,
        isError: pinnedError,
    } = useQuery({
        queryKey: ["dalanbook", "circle", id, "pinned-items"],
        queryFn: () => getCirclePinnedItems(id),
        staleTime: 5 * 60_000,
    });
    const [joinedOverride, setJoinedOverride] = useState<boolean | null>(null);
    const [joining, setJoining] = useState(false);
    const joined = joinedOverride ?? !!circle?.joined;
    const [tab, setTab] = useState<TabKey>("recommend");
    const [selectedPinned, setSelectedPinned] = useState<CirclePinnedItem | null>(null);

    const circlePosts = useMemo(() => {
        const loadedPosts = postPages?.pages.flatMap((page) => page.items) ?? [];
        if (tab === "recommend") return [...loadedPosts].sort((a, b) => b.useful - a.useful);
        return loadedPosts;
    }, [postPages, tab]);
    const rules = pinnedItems.find((item) => item.kind === "rules");

    async function copyCircleLink() {
        const url = `${window.location.origin}/circles/${encodeURIComponent(id)}`;
        try {
            await navigator.clipboard.writeText(url);
            toast.success("圈子链接已复制");
        } catch {
            toast.error("复制失败，请重试");
        }
    }

    async function toggleMembership() {
        if (!user) {
            authStore.openAuth({ tab: "login", action: "加入圈子" });
            return;
        }
        if (joining) return;
        const next = !joined;
        setJoinedOverride(next);
        setJoining(true);
        try {
            const updated = await setCircleMembership(id, next);
            setJoinedOverride(!!updated.joined);
            queryClient.setQueryData(["dalanbook", "circle", id], updated);
            void queryClient.invalidateQueries({ queryKey: ["dalanbook", "circles"] });
            void queryClient.invalidateQueries({
                queryKey: ["dalanbook", "circle", id, "posts"],
            });
        } catch {
            setJoinedOverride(!next);
        } finally {
            setJoining(false);
        }
    }

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center text-text-secondary">
                正在加载圈子…
            </div>
        );
    }
    if (!circle || error) {
        return (
            <div className="flex min-h-screen items-center justify-center text-text-secondary">
                圈子不存在
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="hidden md:block">
                <TopNav />
            </div>
            <MobileTopBar />

            {/* Cover */}
            <div className="relative">
                <div className="relative h-[180px] w-full overflow-hidden md:h-[260px]">
                    <AdaptiveImage src={circle.cover} alt={circle.name} priority sizes="100vw" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-background" />
                </div>

                {/* Back — mobile only */}
                <Link
                    to="/circles"
                    className="glass-base absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-foreground md:hidden"
                    aria-label="返回"
                >
                    <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
                </Link>
            </div>

            <main className="mx-auto -mt-14 max-w-[1240px] px-4 pb-28 md:-mt-20 md:px-6 md:pb-16">
                {/* Header card */}
                <section className="glass-elevated relative rounded-[20px] border border-[color:var(--border)] p-5 md:p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[16px] border border-white/60 shadow-[var(--shadow-subtle)] md:h-20 md:w-20">
                                <AdaptiveImage src={circle.cover} alt="" priority sizes="80px" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-foreground md:text-[26px]">
                                        {circle.name}
                                    </h1>
                                    <span className="rounded-full bg-[color:var(--action-muted)] px-2 py-0.5 text-[11px] text-text-secondary">
                                        {circle.category}
                                    </span>
                                </div>
                                <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-text-secondary">
                                    {circle.desc}
                                </p>
                                <div className="mt-2.5 flex flex-wrap items-center gap-4 text-[12.5px] text-text-tertiary">
                                    <span className="inline-flex items-center gap-1">
                                        <Users className="h-3.5 w-3.5" strokeWidth={1.75} />
                                        {circle.members} 位成员
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.75} />
                                        {circle.posts}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 md:shrink-0">
                            <button
                                onClick={toggleMembership}
                                disabled={joining}
                                className={
                                    "h-10 rounded-[12px] px-4 text-[13.5px] font-medium transition-colors " +
                                    (joined
                                        ? "bg-[color:var(--action-muted)] text-text-secondary hover:text-foreground"
                                        : "bg-foreground text-white hover:bg-[color:var(--action-primary-hover)]")
                                }
                            >
                                {joined ? (
                                    <span className="inline-flex items-center gap-1.5">
                                        <Check className="h-4 w-4" strokeWidth={2} />
                                        已加入
                                    </span>
                                ) : (
                                    "加入圈子"
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => void copyCircleLink()}
                                className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[color:var(--border-default)] bg-white/60 text-text-secondary transition-colors hover:text-foreground"
                                aria-label="分享"
                            >
                                <Share2 className="h-4 w-4" strokeWidth={1.75} />
                            </button>
                        </div>
                    </div>

                    {circle.tags.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-1.5">
                            {circle.tags.map((t: string) => (
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
                        {/* Tabs */}
                        <div className="sticky top-[76px] z-10 -mx-4 mb-4 border-b border-[color:var(--border)] bg-background/80 px-4 backdrop-blur md:top-[84px] md:mx-0 md:px-0">
                            <div className="flex items-center gap-1">
                                {tabs.map((t) => (
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

                        {/* Pinned */}
                        {tab === "recommend" && (
                            <div className="mb-5 space-y-2">
                                {pinnedLoading && (
                                    <div className="rounded-[14px] border border-[color:var(--border)] bg-white/60 px-4 py-3 text-[12.5px] text-text-tertiary">
                                        正在加载置顶内容…
                                    </div>
                                )}
                                {pinnedError && (
                                    <div className="rounded-[14px] border border-[color:var(--border)] bg-white/60 px-4 py-3 text-[12.5px] text-text-tertiary">
                                        置顶内容加载失败，请稍后重试
                                    </div>
                                )}
                                {pinnedItems.map((item) => (
                                    <button
                                        type="button"
                                        key={item.id}
                                        onClick={() => setSelectedPinned(item)}
                                        className="flex w-full items-center gap-3 rounded-[14px] border border-[color:var(--border)] bg-white/60 px-4 py-3 text-left transition-colors hover:border-foreground/25 hover:bg-white/80"
                                    >
                                        <Pin
                                            className="h-4 w-4 shrink-0 text-text-tertiary"
                                            strokeWidth={1.75}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-[14px] font-medium text-foreground">
                                                {item.title}
                                            </div>
                                            <div className="text-[11.5px] text-text-tertiary">
                                                {pinnedMeta(item)}
                                            </div>
                                        </div>
                                        <span className="text-[11px] text-text-tertiary">置顶</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Feed */}
                        {postsLoading ? (
                            <div className="py-16 text-center text-[13px] text-text-tertiary">
                                正在加载圈内帖子…
                            </div>
                        ) : postsError ? (
                            <div className="py-16 text-center text-[13px] text-text-tertiary">
                                圈内帖子加载失败，请稍后重试
                            </div>
                        ) : circlePosts.length > 0 ? (
                            <>
                                <div className="columns-2 gap-2.5 md:columns-2 md:gap-4 xl:columns-3">
                                    {circlePosts.map((post) => (
                                        <PostCard key={post.id} post={post} />
                                    ))}
                                </div>
                                {hasNextPage && (
                                    <div className="mt-5 flex justify-center">
                                        <button
                                            type="button"
                                            onClick={() => void fetchNextPage()}
                                            disabled={isFetchingNextPage}
                                            className="h-10 rounded-[12px] border border-[color:var(--border-default)] bg-white/70 px-5 text-[13px] font-medium text-text-secondary transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {isFetchingNextPage ? "正在加载…" : "加载更多帖子"}
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="py-16 text-center text-[13px] text-text-tertiary">
                                这个圈子还没有帖子
                            </div>
                        )}
                    </div>

                    {/* Sidebar — desktop only */}
                    <aside className="hidden lg:block">
                        <div className="sticky top-[92px] space-y-4">
                            <section className="rounded-[16px] border border-[color:var(--border)] bg-white/70 p-5">
                                <h3 className="mb-2 text-[13px] font-semibold text-foreground">
                                    关于圈子
                                </h3>
                                <p className="text-[12.5px] leading-relaxed text-text-secondary">
                                    {circle.desc} 我们鼓励真实经验、可复现的方法与克制的表达。
                                </p>
                                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[color:var(--border)] pt-4 text-[12px]">
                                    <div>
                                        <dt className="text-text-tertiary">成员</dt>
                                        <dd className="mt-0.5 text-[15px] font-semibold text-foreground">
                                            {circle.members}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-text-tertiary">帖子</dt>
                                        <dd className="mt-0.5 text-[15px] font-semibold text-foreground">
                                            {circle.posts.replace(" 条讨论", "")}
                                        </dd>
                                    </div>
                                </dl>
                            </section>

                            {rules && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedPinned(rules)}
                                    className="w-full rounded-[16px] border border-[color:var(--border)] bg-white/70 p-5 text-left transition-colors hover:border-foreground/25 hover:bg-white/90"
                                >
                                    <h3 className="mb-3 text-[13px] font-semibold text-foreground">
                                        圈子公约
                                    </h3>
                                    <p className="line-clamp-6 whitespace-pre-line text-[12.5px] leading-relaxed text-text-secondary">
                                        {rules.content}
                                    </p>
                                    <span className="mt-3 inline-block text-[11.5px] font-medium text-foreground">
                                        查看完整公约
                                    </span>
                                </button>
                            )}

                            <section className="rounded-[16px] border border-[color:var(--border)] bg-white/70 p-5">
                                <h3 className="mb-3 text-[13px] font-semibold text-foreground">
                                    活跃成员
                                </h3>
                                <ul className="space-y-2.5">
                                    {["林深", "周航", "Kai", "老周的桌面", "夜航船"].map((n) => (
                                        <li key={n} className="flex items-center gap-2.5">
                                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--action-muted)] text-[11px] font-semibold text-text-secondary">
                                                {n.slice(0, 1)}
                                            </span>
                                            <span className="flex-1 text-[13px] text-foreground">
                                                {n}
                                            </span>
                                            <span className="text-[11px] text-text-tertiary">
                                                活跃
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        </div>
                    </aside>
                </div>
            </main>

            <MobileBottomNav />
            <Dialog
                open={selectedPinned !== null}
                onOpenChange={(open) => !open && setSelectedPinned(null)}
            >
                <DialogContent className="max-h-[85vh] max-w-[640px] overflow-y-auto rounded-[20px] border-[color:var(--border)] bg-white p-6 md:p-8">
                    {selectedPinned && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="pr-8 text-[20px] leading-snug">
                                    {selectedPinned.title}
                                </DialogTitle>
                                <DialogDescription className="text-[12px] text-text-tertiary">
                                    {pinnedMeta(selectedPinned)} · 发布于{" "}
                                    {new Intl.DateTimeFormat("zh-CN", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    }).format(new Date(selectedPinned.publishedAt))}
                                </DialogDescription>
                            </DialogHeader>
                            {selectedPinned.images && selectedPinned.images.length > 0 && (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {selectedPinned.images.map((image) => (
                                        <AdaptiveImage
                                            key={image.ossId}
                                            src={image.url}
                                            alt=""
                                            fill={false}
                                            fit="contain"
                                            sizes="(max-width: 639px) calc(100vw - 48px), 280px"
                                            className="max-h-[420px] w-full rounded-[14px] bg-black/[0.025]"
                                        />
                                    ))}
                                </div>
                            )}
                            <div className="whitespace-pre-wrap text-[14px] leading-7 text-text-secondary">
                                {selectedPinned.content}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
