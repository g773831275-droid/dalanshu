import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
    ArrowLeft,
    CalendarDays,
    Loader2,
    MapPin,
    MessageCircle,
    Pencil,
    Share2,
    Sparkles,
    Users,
} from "lucide-react";
import { TopNav } from "@/components/home/TopNav";
import { MobileTopBar } from "@/components/home/MobileTopBar";
import { MobileBottomNav } from "@/components/home/MobileBottomNav";
import { PostCard } from "@/components/home/PostCard";
import { ProfileEditorDialog } from "@/components/profile/ProfileEditorDialog";
import cover from "@/assets/cover-portrait-pm.jpg";
import { ageRangeLabel } from "@/data/regions";
import { AuthApiError, getMyProfile, reportWebDevice } from "@/lib/authApi";
import { authStore, useAuthUser } from "@/lib/authStore";
import {
    getFollowedTopics,
    getProfileCircles,
    getProfilePostPage,
    getProfileUser,
    setProfileFollowing,
    type ProfileTab,
    type ProfileUser,
} from "@/lib/profileApi";

const PAGE_SIZE = 12;

export const Route = createFileRoute("/u/$id")({
    head: () => ({
        meta: [
            { title: "个人主页 · 大蓝书" },
            { name: "description", content: "查看用户资料、公开笔记和社区动态。" },
        ],
    }),
    component: UserProfile,
});

function formatCount(value: number): string {
    if (value < 1000) return String(value);
    if (value < 10_000) return `${Number((value / 1000).toFixed(1))}k`;
    return `${Number((value / 10_000).toFixed(1))}万`;
}

function formatJoinedAt(value: string | null): string {
    if (!value) return "未知时间";
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) return "未知时间";
    return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long" }).format(timestamp);
}

function ProfilePageState({
    message,
    loading = false,
    action,
}: {
    message: string;
    loading?: boolean;
    action?: { label: string; onClick: () => void };
}) {
    return (
        <div className="min-h-screen bg-background">
            <div className="hidden md:block">
                <TopNav />
            </div>
            <MobileTopBar showChannels={false} />
            <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center text-[13px] text-text-secondary">
                <div className="flex items-center">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {message}
                </div>
                {action ? (
                    <button
                        type="button"
                        onClick={action.onClick}
                        className="mt-4 rounded-[10px] bg-foreground px-4 py-2 text-[13px] font-medium text-white"
                    >
                        {action.label}
                    </button>
                ) : null}
            </div>
            <MobileBottomNav />
        </div>
    );
}

function UserProfile() {
    const { id: routeId } = Route.useParams();
    const authUser = useAuthUser();
    const queryClient = useQueryClient();
    const isOwn = routeId === "me" || authUser?.id === routeId;
    const resourceId = isOwn ? "me" : routeId;
    const profileQueryKey = ["dalanbook", "profile", resourceId] as const;
    const [tab, setTab] = useState<ProfileTab>("posts");
    const [editing, setEditing] = useState(false);

    useEffect(() => {
        if (!isOwn) setTab("posts");
    }, [isOwn, routeId]);

    useEffect(() => {
        if (!isOwn) return;
        void reportWebDevice().catch(() => undefined);
    }, [isOwn]);

    const profileQuery = useQuery({
        queryKey: profileQueryKey,
        queryFn: () => getProfileUser(resourceId),
    });
    const myProfileQuery = useQuery({
        queryKey: ["dalanbook", "profile", "editable"],
        queryFn: getMyProfile,
        enabled: isOwn && !!profileQuery.data,
    });
    const circlesQuery = useQuery({
        queryKey: ["dalanbook", "profile", "circles"],
        queryFn: getProfileCircles,
        enabled: isOwn && !!profileQuery.data,
    });
    const topicsQuery = useQuery({
        queryKey: ["dalanbook", "profile", "topics"],
        queryFn: () => getFollowedTopics(12),
        enabled: isOwn && !!profileQuery.data,
    });
    const postQuery = useInfiniteQuery({
        queryKey: ["dalanbook", "profile", resourceId, "posts", tab],
        queryFn: ({ pageParam }) =>
            getProfilePostPage({ id: resourceId, tab, cursor: pageParam, limit: PAGE_SIZE }),
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) =>
            lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
        enabled: !!profileQuery.data && (isOwn || tab === "posts"),
    });
    const followMutation = useMutation({
        mutationFn: (following: boolean) => setProfileFollowing(routeId, following),
        onSuccess: (result) => {
            queryClient.setQueryData<ProfileUser>(profileQueryKey, (current) =>
                current
                    ? {
                          ...current,
                          isFollowing: result.following,
                          followerCount: result.followerCount,
                      }
                    : current,
            );
        },
    });

    if (profileQuery.isLoading) return <ProfilePageState loading message="正在加载个人主页…" />;
    if (profileQuery.error || !profileQuery.data) {
        const unauthorized =
            profileQuery.error instanceof AuthApiError && Number(profileQuery.error.code) === 401;
        if (routeId === "me" && unauthorized) {
            return (
                <ProfilePageState
                    message="登录后才能查看个人主页"
                    action={{
                        label: "登录 / 注册",
                        onClick: () =>
                            authStore.openAuth({
                                tab: "login",
                                redirect: "/u/me",
                                action: "查看个人主页",
                            }),
                    }}
                />
            );
        }
        return <ProfilePageState message="用户不存在或暂时无法访问" />;
    }

    const user = profileQuery.data;
    const myProfile = myProfileQuery.data;
    const joinedCircles = circlesQuery.data ?? [];
    const followedTopics = topicsQuery.data ?? [];
    const posts = postQuery.data?.pages.flatMap((page) => page.items) ?? [];
    const displayName = myProfile?.nickname ?? user.nickname;
    const displayBio = (myProfile?.bio ?? user.bio) || "还没有填写个人简介。";
    const displayLocation = (myProfile?.location ?? user.location) || "暂未填写地域";
    const tabs: Array<{ key: ProfileTab; label: string }> = isOwn
        ? [
              { key: "posts", label: "笔记" },
              { key: "saved", label: "收藏" },
              { key: "liked", label: "点赞" },
          ]
        : [{ key: "posts", label: "笔记" }];

    function toggleFollowing() {
        if (!authUser) {
            authStore.openAuth({
                tab: "login",
                redirect: `/u/${routeId}`,
                action: "关注用户",
            });
            return;
        }
        followMutation.mutate(!user.isFollowing);
    }

    function shareProfile() {
        if (typeof window === "undefined") return;
        if (navigator.share) {
            void navigator.share({ title: `${displayName} · 大蓝书`, url: window.location.href });
            return;
        }
        void navigator.clipboard?.writeText(window.location.href);
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="hidden md:block">
                <TopNav />
            </div>
            <MobileTopBar showChannels={false} />

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
                <section className="glass-elevated rounded-[20px] border border-[color:var(--border)] p-5 md:p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="flex items-start gap-4">
                            {user.avatarUrl ? (
                                <img
                                    src={user.avatarUrl}
                                    alt=""
                                    className="h-20 w-20 shrink-0 rounded-full object-cover shadow-[var(--shadow-subtle)]"
                                />
                            ) : (
                                <span
                                    className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-[26px] font-semibold text-white shadow-[var(--shadow-subtle)]"
                                    style={{ backgroundColor: user.avatarColor }}
                                    aria-hidden
                                >
                                    {displayName.slice(0, 1)}
                                </span>
                            )}
                            <div className="min-w-0">
                                <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-foreground md:text-[26px]">
                                    {displayName}
                                </h1>
                                <p className="mt-1 max-w-lg text-[13.5px] leading-relaxed text-text-secondary">
                                    {displayBio}
                                </p>
                                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-text-tertiary">
                                    <span className="inline-flex items-center gap-1">
                                        <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
                                        {displayLocation}
                                    </span>
                                    {myProfile && myProfile.ageRange !== "unknown" ? (
                                        <span>{ageRangeLabel(myProfile.ageRange)}</span>
                                    ) : null}
                                    <span className="inline-flex items-center gap-1">
                                        <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.75} />
                                        加入于 {formatJoinedAt(user.createdAt)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 md:shrink-0">
                            {!isOwn ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={toggleFollowing}
                                        disabled={followMutation.isPending}
                                        className={
                                            "h-10 rounded-[12px] px-4 text-[13.5px] font-medium transition-colors disabled:opacity-60 " +
                                            (user.isFollowing
                                                ? "bg-[color:var(--action-muted)] text-text-secondary hover:text-foreground"
                                                : "bg-foreground text-white hover:bg-[color:var(--action-primary-hover)]")
                                        }
                                    >
                                        {followMutation.isPending
                                            ? "处理中…"
                                            : user.isFollowing
                                              ? "已关注"
                                              : "+ 关注"}
                                    </button>
                                    <button
                                        type="button"
                                        className="flex h-10 items-center gap-1.5 rounded-[12px] border border-[color:var(--border-default)] bg-white/60 px-3 text-[13px] text-text-secondary transition-colors hover:text-foreground"
                                        aria-label="私信"
                                    >
                                        <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
                                        私信
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setEditing(true)}
                                    disabled={!myProfile}
                                    className="flex h-10 items-center gap-1.5 rounded-[12px] bg-foreground px-4 text-[13.5px] font-medium text-white hover:bg-[color:var(--action-primary-hover)] disabled:opacity-60"
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                    编辑资料
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={shareProfile}
                                className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[color:var(--border-default)] bg-white/60 text-text-secondary transition-colors hover:text-foreground"
                                aria-label="分享"
                            >
                                <Share2 className="h-4 w-4" strokeWidth={1.75} />
                            </button>
                        </div>
                    </div>

                    <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-[color:var(--border)] pt-4 text-center text-[12px] text-text-tertiary">
                        <div>
                            <dd className="text-[18px] font-semibold text-foreground">
                                {formatCount(user.postCount)}
                            </dd>
                            <dt className="mt-0.5">作品</dt>
                        </div>
                        <div>
                            <dd className="text-[18px] font-semibold text-foreground">
                                {formatCount(user.followerCount)}
                            </dd>
                            <dt className="mt-0.5">粉丝</dt>
                        </div>
                        <div>
                            <dd className="text-[18px] font-semibold text-foreground">
                                {formatCount(user.followingCount)}
                            </dd>
                            <dt className="mt-0.5">关注</dt>
                        </div>
                    </dl>

                    {followedTopics.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-1.5">
                            {followedTopics.map((topic) => (
                                <span
                                    key={topic.id}
                                    className="rounded-full border border-[color:var(--border)] bg-white/50 px-2.5 py-0.5 text-[12px] text-text-secondary"
                                >
                                    #{topic.name}
                                </span>
                            ))}
                        </div>
                    ) : null}
                </section>

                <div
                    className={`mt-6 grid grid-cols-1 gap-6 ${isOwn ? "lg:grid-cols-[1fr_300px]" : ""}`}
                >
                    <div className="min-w-0">
                        <div className="sticky top-[76px] z-10 -mx-4 mb-4 border-b border-[color:var(--border)] bg-background/80 px-4 backdrop-blur md:top-[84px] md:mx-0 md:px-0">
                            <div className="flex items-center gap-1">
                                {tabs.map((item) => (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => setTab(item.key)}
                                        className={
                                            "relative h-11 px-3 text-[14px] font-medium transition-colors " +
                                            (tab === item.key
                                                ? "text-foreground"
                                                : "text-text-tertiary hover:text-foreground")
                                        }
                                    >
                                        {item.label}
                                        {tab === item.key ? (
                                            <span className="absolute inset-x-3 -bottom-px h-[2px] rounded-full bg-foreground" />
                                        ) : null}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {postQuery.isLoading ? (
                            <div className="flex items-center justify-center py-16 text-[13px] text-text-tertiary">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                正在加载内容…
                            </div>
                        ) : postQuery.error ? (
                            <div className="rounded-[16px] border border-dashed border-[color:var(--border-default)] py-16 text-center text-[13px] text-text-secondary">
                                内容加载失败，请稍后重试。
                            </div>
                        ) : posts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 rounded-[16px] border border-dashed border-[color:var(--border-default)] py-16 text-text-tertiary">
                                <Sparkles className="h-6 w-6" strokeWidth={1.5} />
                                <span className="text-[13px]">还没有内容</span>
                            </div>
                        ) : (
                            <>
                                <div className="columns-2 gap-2.5 md:gap-4 xl:columns-3">
                                    {posts.map((post) => (
                                        <PostCard key={`${post.id}-${tab}`} post={post} />
                                    ))}
                                </div>
                                {postQuery.hasNextPage ? (
                                    <div className="mt-6 flex justify-center">
                                        <button
                                            type="button"
                                            onClick={() => void postQuery.fetchNextPage()}
                                            disabled={postQuery.isFetchingNextPage}
                                            className="h-10 rounded-[12px] border border-[color:var(--border-default)] bg-white/60 px-5 text-[13px] font-medium text-text-secondary disabled:opacity-60"
                                        >
                                            {postQuery.isFetchingNextPage
                                                ? "正在加载更多…"
                                                : "加载更多"}
                                        </button>
                                    </div>
                                ) : null}
                            </>
                        )}
                    </div>

                    {isOwn ? (
                        <aside className="hidden lg:block">
                            <div className="sticky top-[92px] space-y-4">
                                <section className="rounded-[16px] border border-[color:var(--border)] bg-white/70 p-5">
                                    <h3 className="mb-3 text-[13px] font-semibold text-foreground">
                                        加入的圈子
                                    </h3>
                                    {circlesQuery.isLoading ? (
                                        <p className="text-[12.5px] text-text-tertiary">
                                            正在加载圈子…
                                        </p>
                                    ) : joinedCircles.length === 0 ? (
                                        <p className="text-[12.5px] text-text-tertiary">
                                            还没有加入任何圈子
                                        </p>
                                    ) : (
                                        <ul className="space-y-3">
                                            {joinedCircles.slice(0, 6).map((circle) => (
                                                <li key={circle.id}>
                                                    <Link
                                                        to="/circles/$id"
                                                        params={{ id: circle.id }}
                                                        className="group flex items-center gap-3"
                                                    >
                                                        <span className="h-10 w-10 shrink-0 overflow-hidden rounded-[10px]">
                                                            <img
                                                                src={circle.cover}
                                                                alt=""
                                                                className="h-full w-full object-cover"
                                                            />
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate text-[13px] font-medium text-foreground group-hover:underline">
                                                                {circle.name}
                                                            </span>
                                                            <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-text-tertiary">
                                                                <Users
                                                                    className="h-3 w-3"
                                                                    strokeWidth={1.75}
                                                                />
                                                                {circle.members}
                                                            </span>
                                                        </span>
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </section>

                                {followedTopics.length > 0 ? (
                                    <section className="rounded-[16px] border border-[color:var(--border)] bg-white/70 p-5">
                                        <h3 className="mb-3 text-[13px] font-semibold text-foreground">
                                            关注的话题
                                        </h3>
                                        <div className="flex flex-wrap gap-1.5">
                                            {followedTopics.map((topic) => (
                                                <span
                                                    key={topic.id}
                                                    className="rounded-full bg-[color:var(--action-muted)] px-2.5 py-1 text-[11.5px] text-text-secondary"
                                                >
                                                    #{topic.name}
                                                </span>
                                            ))}
                                        </div>
                                    </section>
                                ) : null}
                            </div>
                        </aside>
                    ) : null}
                </div>
            </main>

            <MobileBottomNav />
            {myProfile ? (
                <ProfileEditorDialog
                    open={editing}
                    profile={myProfile}
                    onClose={() => setEditing(false)}
                    onSaved={(saved) => {
                        queryClient.setQueryData(["dalanbook", "profile", "editable"], saved);
                        queryClient.setQueryData<ProfileUser>(profileQueryKey, (current) =>
                            current
                                ? {
                                      ...current,
                                      nickname: saved.nickname,
                                      bio: saved.bio,
                                      location: saved.location,
                                  }
                                : current,
                        );
                        const current = authStore.get();
                        if (current) authStore.set({ ...current, name: saved.nickname });
                    }}
                />
            ) : null}
        </div>
    );
}
