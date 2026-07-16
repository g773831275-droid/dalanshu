import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Bookmark, Heart, Loader2, UserPlus } from "lucide-react";
import { TopNav } from "@/components/home/TopNav";
import { MobileTopBar } from "@/components/home/MobileTopBar";
import { MobileBottomNav } from "@/components/home/MobileBottomNav";
import { authStore, useAuthUser } from "@/lib/authStore";
import {
    getNotificationPage,
    getNotificationUnreadCount,
    markNotificationRead,
    type NotificationItem,
} from "@/lib/notificationApi";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/messages")({
    head: () => ({ meta: [{ title: "消息 · 大蓝书" }] }),
    component: MessagesPage,
});

function formatTime(value: string): string {
    const timestamp = new Date(value).getTime();
    const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (seconds < 60) return "刚刚";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} 天前`;
    return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(timestamp);
}

function notificationMeta(item: NotificationItem) {
    switch (item.type) {
        case "post_like":
            return { Icon: Heart, label: "点赞了你的帖子", color: "#D85656", bg: "#FCECEC" };
        case "post_favorite":
            return { Icon: Bookmark, label: "收藏了你的帖子", color: "#B47A2B", bg: "#FFF4DF" };
        case "user_follow":
            return { Icon: UserPlus, label: "关注了你", color: "#366E8A", bg: "#E9F4F8" };
    }
}

function NotificationContent({ item }: { item: NotificationItem }) {
    const meta = notificationMeta(item);
    return (
        <>
            <div className="relative shrink-0">
                {item.actor.avatarUrl ? (
                    <img
                        src={item.actor.avatarUrl}
                        alt=""
                        className="h-11 w-11 rounded-full object-cover"
                    />
                ) : (
                    <span
                        className="flex h-11 w-11 items-center justify-center rounded-full text-[14px] font-semibold text-white"
                        style={{ backgroundColor: item.actor.avatarColor }}
                        aria-hidden
                    >
                        {item.actor.name.slice(0, 1)}
                    </span>
                )}
                <span
                    className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-white"
                    style={{ color: meta.color, backgroundColor: meta.bg }}
                    aria-hidden
                >
                    <meta.Icon className="h-3 w-3" strokeWidth={2} />
                </span>
            </div>

            <div className="min-w-0 flex-1">
                <p className="text-[13.5px] leading-5 text-text-secondary">
                    <span className="font-semibold text-foreground">{item.actor.name}</span>{" "}
                    {meta.label}
                </p>
                {item.post ? (
                    <p className="mt-1 truncate text-[12.5px] text-text-tertiary">
                        《{item.post.title}》
                    </p>
                ) : null}
                <p className="mt-1.5 text-[11.5px] text-text-tertiary">
                    {formatTime(item.createdAt)}
                </p>
            </div>

            {!item.readAt ? (
                <span
                    className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#3B6F8F]"
                    aria-label="未读"
                />
            ) : null}
        </>
    );
}

function NotificationRow({
    item,
    onRead,
}: {
    item: NotificationItem;
    onRead: (id: string) => void;
}) {
    const className =
        "flex items-start gap-3.5 px-4 py-4 transition-colors hover:bg-black/[0.025] md:px-5 " +
        (!item.readAt ? "bg-[#F7FAFB]" : "bg-white/60");
    if (item.type === "user_follow") {
        return (
            <Link
                to="/u/$id"
                params={{ id: item.actor.id }}
                onClick={() => onRead(item.id)}
                className={className}
            >
                <NotificationContent item={item} />
            </Link>
        );
    }
    if (!item.post) return null;
    return (
        <Link
            to="/posts/$id"
            params={{ id: item.post.id }}
            onClick={() => onRead(item.id)}
            className={className}
        >
            <NotificationContent item={item} />
        </Link>
    );
}

function MessagesPage() {
    const user = useAuthUser();
    const queryClient = useQueryClient();
    const { data, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
        useInfiniteQuery({
            queryKey: ["dalanbook", "notifications"],
            queryFn: ({ pageParam }) => getNotificationPage(pageParam, PAGE_SIZE),
            initialPageParam: null as string | null,
            getNextPageParam: (lastPage) =>
                lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
            enabled: !!user,
        });
    const { data: unreadCount = 0 } = useQuery({
        queryKey: ["dalanbook", "notifications", "unread-count"],
        queryFn: getNotificationUnreadCount,
        enabled: !!user,
    });
    const markRead = useMutation({
        mutationFn: markNotificationRead,
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["dalanbook", "notifications"] }),
                queryClient.invalidateQueries({
                    queryKey: ["dalanbook", "notifications", "unread-count"],
                }),
            ]);
        },
    });
    const items = data?.pages.flatMap((page) => page.items) ?? [];

    return (
        <div className="min-h-screen bg-background">
            <div className="hidden md:block">
                <TopNav />
            </div>
            <MobileTopBar />

            <main className="mx-auto max-w-[760px] px-4 pb-28 pt-7 md:px-6 md:pb-16 md:pt-10">
                <header className="mb-5 flex items-end justify-between">
                    <div>
                        <h1 className="text-[27px] font-semibold tracking-[-0.02em] text-foreground">
                            消息
                        </h1>
                        <p className="mt-1 text-[13px] text-text-secondary">
                            点赞、收藏和关注你的动态都在这里。
                        </p>
                    </div>
                    {user && unreadCount > 0 ? (
                        <span className="rounded-full bg-foreground px-2.5 py-1 text-[11px] font-medium text-white">
                            {unreadCount > 99 ? "99+" : unreadCount} 条未读
                        </span>
                    ) : null}
                </header>

                {!user ? (
                    <section className="rounded-[18px] border border-[color:var(--border)] bg-white/65 px-6 py-16 text-center">
                        <Bell className="mx-auto h-8 w-8 text-text-tertiary" strokeWidth={1.5} />
                        <h2 className="mt-4 text-[16px] font-semibold text-foreground">
                            登录后查看消息
                        </h2>
                        <p className="mt-1.5 text-[13px] text-text-secondary">
                            有人点赞、收藏或关注你时，我们会在这里通知你。
                        </p>
                        <button
                            type="button"
                            onClick={() =>
                                authStore.openAuth({
                                    tab: "login",
                                    redirect: "/messages",
                                    action: "查看消息",
                                })
                            }
                            className="mt-5 rounded-[10px] bg-foreground px-4 py-2 text-[13px] font-medium text-white"
                        >
                            登录 / 注册
                        </button>
                    </section>
                ) : isLoading ? (
                    <section
                        className="rounded-[18px] border border-[color:var(--border)] bg-white/65 py-16 text-center text-[13px] text-text-tertiary"
                        aria-label="正在加载消息"
                    >
                        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                        正在加载消息…
                    </section>
                ) : error ? (
                    <section className="rounded-[18px] border border-[color:var(--border)] bg-white/65 px-5 py-16 text-center text-[13px] text-text-secondary">
                        消息加载失败，请稍后重试。
                    </section>
                ) : items.length === 0 ? (
                    <section className="rounded-[18px] border border-[color:var(--border)] bg-white/65 px-5 py-16 text-center">
                        <Bell className="mx-auto h-8 w-8 text-text-tertiary" strokeWidth={1.5} />
                        <h2 className="mt-4 text-[15px] font-semibold text-foreground">
                            暂时没有消息
                        </h2>
                        <p className="mt-1.5 text-[13px] text-text-secondary">
                            新的点赞、收藏和关注会显示在这里。
                        </p>
                    </section>
                ) : (
                    <section className="overflow-hidden rounded-[18px] border border-[color:var(--border)] bg-white/65 shadow-[0_8px_30px_rgba(0,0,0,0.035)]">
                        <div className="divide-y divide-[color:var(--border)]">
                            {items.map((item) => (
                                <NotificationRow
                                    key={item.id}
                                    item={item}
                                    onRead={(id) => {
                                        if (!item.readAt) markRead.mutate(id);
                                    }}
                                />
                            ))}
                        </div>
                        {hasNextPage ? (
                            <div className="border-t border-[color:var(--border)] p-3 text-center">
                                <button
                                    type="button"
                                    onClick={() => void fetchNextPage()}
                                    disabled={isFetchingNextPage}
                                    className="rounded-[9px] px-4 py-2 text-[12.5px] font-medium text-text-secondary transition-colors hover:bg-black/[0.04] hover:text-foreground disabled:opacity-60"
                                >
                                    {isFetchingNextPage ? "加载中…" : "加载更多"}
                                </button>
                            </div>
                        ) : null}
                    </section>
                )}
            </main>

            <MobileBottomNav />
        </div>
    );
}
