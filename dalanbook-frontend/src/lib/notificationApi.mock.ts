import type { NotificationItem, NotificationPage } from "@/lib/notificationApi";

const now = Date.now();
const minute = 60_000;
const day = 24 * 60 * minute;

let notifications: NotificationItem[] = [
    {
        id: "notification-like-1",
        type: "post_like",
        actor: { id: "u-lin", name: "林深", avatarColor: "#315C7B" },
        post: {
            id: "p1",
            title: "我用了 30 天 AI Agent，真正有用的是这 4 个场景",
        },
        readAt: null,
        createdAt: new Date(now - 8 * minute).toISOString(),
    },
    {
        id: "notification-follow-1",
        type: "user_follow",
        actor: { id: "u-zhou", name: "周航", avatarColor: "#76543A" },
        readAt: null,
        createdAt: new Date(now - 42 * minute).toISOString(),
    },
    {
        id: "notification-favorite-1",
        type: "post_favorite",
        actor: { id: "u-efficiency", name: "效率笔记", avatarColor: "#4B6B50" },
        post: {
            id: "p3",
            title: "3000 元预算做一套安静高效的桌搭，我踩过的坑",
        },
        readAt: null,
        createdAt: new Date(now - 3 * 60 * minute).toISOString(),
    },
    {
        id: "notification-like-2",
        type: "post_like",
        actor: { id: "u-kai", name: "Kai", avatarColor: "#805A48" },
        post: { id: "p2", title: "从 92kg 到 78kg，上班族减脂真实复盘" },
        readAt: new Date(now - day).toISOString(),
        createdAt: new Date(now - day - 2 * minute).toISOString(),
    },
    {
        id: "notification-follow-2",
        type: "user_follow",
        actor: { id: "u-mountain", name: "山野川", avatarColor: "#456A62" },
        readAt: new Date(now - 2 * day).toISOString(),
        createdAt: new Date(now - 2 * day - 20 * minute).toISOString(),
    },
];

export async function getMockNotificationUnreadCount(): Promise<number> {
    return notifications.filter((item) => !item.readAt).length;
}

export async function getMockNotificationPage(
    cursor: string | null,
    limit: number,
): Promise<NotificationPage> {
    const offset = cursor ? Number(cursor) : 0;
    const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;
    const items = notifications.slice(safeOffset, safeOffset + limit);
    const nextOffset = safeOffset + items.length;
    return {
        items,
        nextCursor: nextOffset < notifications.length ? String(nextOffset) : null,
        hasMore: nextOffset < notifications.length,
    };
}

export async function markMockNotificationRead(id: string): Promise<void> {
    notifications = notifications.map((item) =>
        item.id === id && !item.readAt ? { ...item, readAt: new Date().toISOString() } : item,
    );
}
