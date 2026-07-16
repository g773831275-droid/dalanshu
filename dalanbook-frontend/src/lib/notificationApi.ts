import { authRequest } from "@/lib/authApi";
import { useMockApi } from "@/lib/apiMode";
import {
    getMockNotificationPage,
    getMockNotificationUnreadCount,
    markMockNotificationRead,
} from "@/lib/notificationApi.mock";

export type NotificationType = "post_like" | "post_favorite" | "user_follow";

export type NotificationActor = {
    id: string;
    name: string;
    avatarUrl?: string;
    avatarColor: string;
};

export type NotificationPost = {
    id: string;
    title: string;
    cover?: string;
};

export type NotificationItem = {
    id: string;
    type: NotificationType;
    actor: NotificationActor;
    post?: NotificationPost;
    readAt: string | null;
    createdAt: string;
};

export type NotificationPage = {
    items: NotificationItem[];
    nextCursor: string | null;
    hasMore: boolean;
};

type RawNotification = {
    id: string;
    type: string;
    payload?: {
        actor?: Partial<NotificationActor>;
        post?: Partial<NotificationPost>;
    };
    readAt?: string | null;
    createdAt: string;
};

type RawNotificationPage = {
    items: RawNotification[];
    nextCursor?: string | null;
    hasMore: boolean;
};

const supportedTypes = new Set<NotificationType>(["post_like", "post_favorite", "user_follow"]);

function normalizeNotification(item: RawNotification): NotificationItem | null {
    if (!supportedTypes.has(item.type as NotificationType)) return null;
    const actor = item.payload?.actor;
    if (!actor?.id || !actor.name) return null;
    const type = item.type as NotificationType;
    const post = item.payload?.post;
    if (type !== "user_follow" && (!post?.id || !post.title)) return null;
    return {
        id: item.id,
        type,
        actor: {
            id: actor.id,
            name: actor.name,
            avatarUrl: actor.avatarUrl,
            avatarColor: actor.avatarColor ?? "#4B5563",
        },
        post:
            post?.id && post.title
                ? { id: post.id, title: post.title, cover: post.cover }
                : undefined,
        readAt: item.readAt ?? null,
        createdAt: item.createdAt,
    };
}

export async function getNotificationUnreadCount(): Promise<number> {
    if (useMockApi) return getMockNotificationUnreadCount();
    const result = await authRequest<{ count: number }>("/api/v1/notifications/unread-count");
    return result.count;
}

export async function getNotificationPage(
    cursor: string | null = null,
    limit = 20,
): Promise<NotificationPage> {
    if (useMockApi) return getMockNotificationPage(cursor, limit);
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    const page = await authRequest<RawNotificationPage>(
        `/api/v1/notifications?${params.toString()}`,
    );
    return {
        items: page.items.map(normalizeNotification).filter((item) => item !== null),
        nextCursor: page.nextCursor ?? null,
        hasMore: page.hasMore,
    };
}

export async function markNotificationRead(id: string): Promise<void> {
    if (useMockApi) return markMockNotificationRead(id);
    await authRequest<void>(`/api/v1/notifications/${encodeURIComponent(id)}/read`, {
        method: "PUT",
    });
}
