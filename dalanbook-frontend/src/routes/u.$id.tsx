import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
    ArrowLeft,
    CalendarDays,
    LogOut,
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
import cover from "@/assets/cover-portrait-pm.jpg";
import { ProfileEditorDialog } from "@/components/profile/ProfileEditorDialog";
import { UserRelationDialog } from "@/components/profile/UserRelationDialog";
import { AdaptiveImage } from "@/components/ui/adaptive-image";
import { ageRangeLabel } from "@/data/regions";
import { AuthApiError, getMyProfile, logout, reportWebDevice, type MyProfile } from "@/lib/authApi";
import { authStore, useAuthUser } from "@/lib/authStore";
import { getMyCircles } from "@/lib/dalanbookApi";
import {
    getMyPostPage,
    getUserPostPage,
    getUserProfile,
    setUserFollowing,
    type CommunityUser,
    type UserRelationType,
} from "@/lib/userApi";

export const Route = createFileRoute("/u/$id")({
    loader: async ({ params }) => {
        if (params.id === "me") return { user: null };
        try {
            return { user: await getUserProfile(params.id) };
        } catch (error) {
            if (error instanceof AuthApiError && Number(error.code) === 404) throw notFound();
            throw error;
        }
    },
    head: ({ loaderData }) => {
        if (!loaderData) {
            return { meta: [{ title: "用户 · 大蓝书" }, { name: "robots", content: "noindex" }] };
        }
        const { user } = loaderData;
        if (!user) return { meta: [{ title: "我的主页 · 大蓝书" }] };
        return {
            meta: [
                { title: `${user.nickname} · 大蓝书` },
                { name: "description", content: user.bio },
                { property: "og:title", content: `${user.nickname} · 大蓝书` },
                { property: "og:description", content: user.bio },
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

function formatCount(value: number) {
    return new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 }).format(
        value,
    );
}

function joinedAt(value: string | null) {
    if (!value) return "暂未记录";
    return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long" }).format(
        new Date(value),
    );
}

function UserAvatar({ user, className }: { user: CommunityUser; className: string }) {
    if (user.avatar)
        return <AdaptiveImage src={user.avatar} alt="" sizes="80px" className={className} />;
    return (
        <span
            className={`${className} flex items-center justify-center bg-[#245BDB] font-semibold text-white`}
            aria-hidden
        >
            {user.nickname.slice(0, 1)}
        </span>
    );
}

function UserProfile() {
    const { user } = Route.useLoaderData();
    return user ? <UserProfileContent loadedUser={user} /> : <CurrentUserProfile />;
}

function CurrentUserProfile() {
    const authUser = useAuthUser();
    const { data: user, isError } = useQuery({
        queryKey: ["dalanbook", "me", "summary"],
        queryFn: () => getUserProfile("me"),
        enabled: typeof window !== "undefined" && !!authUser,
    });
    if (user) return <UserProfileContent loadedUser={user} />;
    if (!authUser) {
        return (
            <div className="min-h-screen bg-background">
                <MobileTopBar showChannels={false} />
                <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-6 text-center">
                    <p className="text-[14px] text-text-secondary">登录后查看和编辑个人资料</p>
                    <button
                        type="button"
                        onClick={() =>
                            authStore.openAuth({
                                tab: "login",
                                redirect: "/u/me",
                                action: "查看个人主页",
                            })
                        }
                        className="rounded-[12px] bg-foreground px-5 py-2.5 text-[13.5px] font-medium text-white"
                    >
                        登录 / 注册
                    </button>
                </div>
                <MobileBottomNav />
            </div>
        );
    }
    return (
        <div className="flex min-h-screen items-center justify-center text-[13px] text-text-tertiary">
            {isError ? "个人主页加载失败，请稍后重试。" : "正在加载个人主页…"}
        </div>
    );
}

function UserProfileContent({ loadedUser }: { loadedUser: CommunityUser }) {
    const { id: routeUserId } = Route.useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const authUser = useAuthUser();
    const [user, setUser] = useState(loadedUser);
    const [tab, setTab] = useState<TabKey>("posts");
    const [editing, setEditing] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [relationType, setRelationType] = useState<UserRelationType | null>(null);
    const [followUpdating, setFollowUpdating] = useState(false);
    const isOwnProfile = routeUserId === "me" || user.id === authUser?.id;

    useEffect(() => setUser(loadedUser), [loadedUser]);
    useEffect(() => {
        if (!isOwnProfile || !authUser) return;
        void reportWebDevice().catch(() => undefined);
    }, [authUser, isOwnProfile]);
    useEffect(() => {
        if (!isOwnProfile && tab !== "posts") setTab("posts");
    }, [isOwnProfile, tab]);

    const { data: myProfile } = useQuery({
        queryKey: ["dalanbook", "me", "profile"],
        queryFn: getMyProfile,
        enabled: isOwnProfile && !!authUser,
    });
    const {
        data: postPage,
        isLoading: postsLoading,
        isError: postsError,
    } = useQuery({
        queryKey: ["dalanbook", "user", "posts", user.id, isOwnProfile ? tab : "posts"],
        queryFn: () =>
            isOwnProfile
                ? getMyPostPage(
                      tab === "saved" ? "favorite" : tab === "liked" ? "liked" : "published",
                  )
                : getUserPostPage(user.id),
        enabled: !isOwnProfile || !!authUser,
    });
    const { data: joinedCircles = [] } = useQuery({
        queryKey: ["dalanbook", "me", "circles"],
        queryFn: () => getMyCircles(),
        enabled: isOwnProfile && !!authUser,
    });

    const displayName = user.nickname;
    const displayBio = user.bio || "还没有填写个人简介。";
    const displayLocation = user.location || "暂未填写地域";
    const tabs = isOwnProfile
        ? ([
              { key: "posts", label: "笔记" },
              { key: "saved", label: "收藏" },
              { key: "liked", label: "点赞" },
          ] as const)
        : ([{ key: "posts", label: "笔记" }] as const);

    const toggleFollow = () => {
        if (!authUser) {
            authStore.openAuth({ tab: "login", action: `关注 ${user.nickname}` });
            return;
        }
        if (followUpdating) return;
        const next = !user.isFollowing;
        setUser((current) => ({
            ...current,
            isFollowing: next,
            followerCount: current.followerCount + (next ? 1 : -1),
        }));
        setFollowUpdating(true);
        void setUserFollowing(user.id, next)
            .then(setUser)
            .catch(() => {
                setUser((current) => ({
                    ...current,
                    isFollowing: !next,
                    followerCount: current.followerCount + (next ? -1 : 1),
                }));
            })
            .finally(() => setFollowUpdating(false));
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="hidden md:block">
                <TopNav />
            </div>
            <MobileTopBar showChannels={false} />

            <div className="relative">
                <div className="relative h-[160px] w-full overflow-hidden md:h-[220px]">
                    <AdaptiveImage src={cover} alt="" priority sizes="100vw" />
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
                            <UserAvatar
                                user={{ ...user, nickname: displayName }}
                                className="h-20 w-20 shrink-0 rounded-full text-[26px] shadow-[var(--shadow-subtle)]"
                            />
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
                                    {myProfile && myProfile.ageRange !== "unknown" && (
                                        <span>{ageRangeLabel(myProfile.ageRange)}</span>
                                    )}
                                    <span className="inline-flex items-center gap-1">
                                        <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.75} />
                                        加入于 {joinedAt(user.createdAt)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 md:shrink-0">
                            {!isOwnProfile && (
                                <>
                                    <button
                                        onClick={toggleFollow}
                                        disabled={followUpdating}
                                        className={
                                            "h-10 rounded-[12px] px-4 text-[13.5px] font-medium transition-colors disabled:opacity-60 " +
                                            (user.isFollowing
                                                ? "bg-[color:var(--action-muted)] text-text-secondary hover:text-foreground"
                                                : "bg-foreground text-white hover:bg-[color:var(--action-primary-hover)]")
                                        }
                                    >
                                        {user.isFollowing ? "已关注" : "+ 关注"}
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
                            {isOwnProfile && (
                                <>
                                    <button
                                        onClick={() => setEditing(true)}
                                        disabled={!myProfile}
                                        className="flex h-10 items-center gap-1.5 rounded-[12px] bg-foreground px-4 text-[13.5px] font-medium text-white hover:bg-[color:var(--action-primary-hover)] disabled:opacity-60"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                        编辑资料
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (loggingOut) return;
                                            setLoggingOut(true);
                                            void logout().finally(() => {
                                                queryClient.clear();
                                                void navigate({ to: "/" });
                                            });
                                        }}
                                        disabled={loggingOut}
                                        className="flex h-10 items-center gap-1.5 rounded-[12px] border border-[color:var(--border-default)] bg-white/60 px-3 text-[13px] text-text-secondary transition-colors hover:text-foreground disabled:opacity-60"
                                    >
                                        <LogOut className="h-3.5 w-3.5" />
                                        {loggingOut ? "退出中…" : "退出登录"}
                                    </button>
                                </>
                            )}
                            <button
                                className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[color:var(--border-default)] bg-white/60 text-text-secondary transition-colors hover:text-foreground"
                                aria-label="分享"
                            >
                                <Share2 className="h-4 w-4" strokeWidth={1.75} />
                            </button>
                        </div>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[color:var(--border)] pt-4 text-center text-[12px] text-text-tertiary">
                        <div>
                            <div className="text-[18px] font-semibold text-foreground">
                                {formatCount(user.postCount)}
                            </div>
                            <div className="mt-0.5">作品</div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setRelationType("followers")}
                            className="rounded-[10px] py-1 transition-colors hover:bg-black/[0.035] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                            aria-haspopup="dialog"
                            aria-label={`查看 ${displayName} 的粉丝`}
                        >
                            <span className="block text-[18px] font-semibold text-foreground">
                                {formatCount(user.followerCount)}
                            </span>
                            <span className="mt-0.5 block">粉丝</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setRelationType("following")}
                            className="rounded-[10px] py-1 transition-colors hover:bg-black/[0.035] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                            aria-haspopup="dialog"
                            aria-label={`查看 ${displayName} 的关注`}
                        >
                            <span className="block text-[18px] font-semibold text-foreground">
                                {formatCount(user.followingCount)}
                            </span>
                            <span className="mt-0.5 block">关注</span>
                        </button>
                    </div>
                </section>

                <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
                    <div className="min-w-0">
                        <div className="-mx-4 mb-4 border-b border-[color:var(--border)] px-4 md:mx-0 md:px-0">
                            <div className="flex items-center gap-1">
                                {tabs.map((item) => (
                                    <button
                                        key={item.key}
                                        onClick={() => setTab(item.key)}
                                        className={
                                            "relative h-11 px-3 text-[14px] font-medium transition-colors " +
                                            (tab === item.key
                                                ? "text-foreground"
                                                : "text-text-tertiary hover:text-foreground")
                                        }
                                    >
                                        {item.label}
                                        {tab === item.key && (
                                            <span className="absolute inset-x-3 -bottom-px h-[2px] rounded-full bg-foreground" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {postsLoading ? (
                            <div className="py-16 text-center text-[13px] text-text-tertiary">
                                正在加载内容…
                            </div>
                        ) : postsError ? (
                            <div className="py-16 text-center text-[13px] text-text-tertiary">
                                内容加载失败，请稍后重试。
                            </div>
                        ) : postPage?.items.length ? (
                            <div className="columns-2 gap-2.5 md:gap-4 xl:columns-3">
                                {postPage.items.map((post) => (
                                    <PostCard key={post.id} post={post} />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2 rounded-[16px] border border-dashed border-[color:var(--border-default)] py-16 text-text-tertiary">
                                <Sparkles className="h-6 w-6" strokeWidth={1.5} />
                                <span className="text-[13px]">还没有内容</span>
                            </div>
                        )}
                    </div>

                    {isOwnProfile && (
                        <aside className="hidden lg:block">
                            <div className="sticky top-[92px]">
                                <section className="rounded-[16px] border border-[color:var(--border)] bg-white/70 p-5">
                                    <h3 className="mb-3 text-[13px] font-semibold text-foreground">
                                        加入的圈子
                                    </h3>
                                    {joinedCircles.length === 0 ? (
                                        <p className="text-[12.5px] text-text-tertiary">
                                            还没有加入任何圈子
                                        </p>
                                    ) : (
                                        <ul className="space-y-3">
                                            {joinedCircles.map((circle) => (
                                                <li key={circle.id}>
                                                    <Link
                                                        to="/circles/$id"
                                                        params={{ id: circle.id }}
                                                        className="group flex items-center gap-3"
                                                    >
                                                        <span className="h-10 w-10 shrink-0 overflow-hidden rounded-[10px]">
                                                            <AdaptiveImage
                                                                src={circle.cover}
                                                                alt=""
                                                                sizes="40px"
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
                            </div>
                        </aside>
                    )}
                </div>
            </main>

            <MobileBottomNav />
            <UserRelationDialog
                open={relationType !== null}
                type={relationType ?? "followers"}
                userId={user.id}
                userName={displayName}
                onClose={() => setRelationType(null)}
            />
            {myProfile && (
                <ProfileEditorDialog
                    open={editing}
                    profile={myProfile}
                    onClose={() => setEditing(false)}
                    onSaved={(saved: MyProfile) => {
                        const updatedUser = {
                            ...user,
                            nickname: saved.nickname,
                            avatar: saved.avatar,
                            bio: saved.bio,
                            location: saved.location,
                        };
                        setUser(updatedUser);
                        queryClient.setQueryData(["dalanbook", "me", "profile"], saved);
                        queryClient.setQueryData(["dalanbook", "me", "summary"], updatedUser);
                        const current = authStore.get();
                        if (current) {
                            authStore.set({
                                ...current,
                                name: saved.nickname,
                                avatar: saved.avatar ?? undefined,
                            });
                        }
                        void Promise.all([
                            queryClient.invalidateQueries({ queryKey: ["home", "feed"] }),
                            queryClient.invalidateQueries({
                                queryKey: ["dalanbook", "user", "posts"],
                            }),
                            queryClient.invalidateQueries({ queryKey: ["dalanbook", "circle"] }),
                            queryClient.invalidateQueries({ queryKey: ["dalanbook", "topic"] }),
                        ]);
                    }}
                />
            )}
        </div>
    );
}
