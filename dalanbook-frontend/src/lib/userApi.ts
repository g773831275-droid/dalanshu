import type { Post } from "@/data/mockPosts";
import { posts } from "@/data/mockPosts";
import { findUser, users } from "@/data/mockUsers";
import { authRequest } from "@/lib/authApi";
import { useMockApi } from "@/lib/apiMode";

const mockFollowingState = new Map<string, boolean>();

export type CommunityUser = {
    id: string;
    nickname: string;
    avatar?: string | null;
    bio: string;
    gender: "unknown" | "male" | "female" | "other";
    location: string;
    followerCount: number;
    followingCount: number;
    postCount: number;
    isFollowing: boolean;
    createdAt: string | null;
};

type FeedItem = {
    id: string;
    cover: { url: string; ratio: Post["ratio"] };
    tag?: Post["tag"];
    title: string;
    circle: { id: string; name: string };
    author: { id: string; name: string; avatarUrl?: string; avatarColor: string };
    useful: { count: number; liked: boolean };
};

type FeedResponse = {
    items: FeedItem[];
    nextCursor: string | null;
    hasMore: boolean;
};

export type UserPostPage = {
    items: Post[];
    nextCursor: string | null;
    hasMore: boolean;
};

export type UserRelationType = "followers" | "following";

export type UserRelationPage = {
    items: CommunityUser[];
    nextCursor: string | null;
    hasMore: boolean;
};

function toPost(item: FeedItem): Post {
    return {
        id: item.id,
        cover: item.cover.url,
        ratio: item.cover.ratio,
        tag: item.tag,
        circleId: item.circle.id,
        circle: item.circle.name,
        title: item.title,
        authorId: item.author.id,
        author: item.author.name,
        avatarUrl: item.author.avatarUrl,
        avatarColor: item.author.avatarColor,
        useful: item.useful.count,
        usefulLiked: item.useful.liked,
    };
}

function toPage(page: FeedResponse): UserPostPage {
    return {
        items: page.items.map(toPost),
        nextCursor: page.nextCursor ?? null,
        hasMore: page.hasMore,
    };
}

function mockUser(id: string): CommunityUser {
    const user = findUser(id);
    if (!user) throw new Error("用户不存在");
    const followerValue = Number.parseFloat(user.followers.replaceAll(",", ""));
    const followerCount = Number.isFinite(followerValue)
        ? Math.round(followerValue * (user.followers.toLowerCase().includes("k") ? 1000 : 1))
        : 0;
    return {
        id: user.id,
        nickname: user.name,
        bio: user.bio,
        gender: "unknown",
        location: user.location,
        followerCount,
        followingCount: user.following,
        postCount: user.worksCount,
        isFollowing: mockFollowingState.get(user.id) ?? false,
        createdAt: null,
    };
}

function mockCursorOffset(cursor?: string | null): number {
    if (!cursor) return 0;
    const match = /^mock-user-post-(\d+)$/.exec(cursor);
    return match ? Number(match[1]) : 0;
}

function mockRelationCursorOffset(type: UserRelationType, cursor?: string | null): number {
    if (!cursor) return 0;
    const match = new RegExp(`^mock-user-${type}-(\\d+)$`).exec(cursor);
    return match ? Number(match[1]) : 0;
}

function mockRelationPage(
    id: string,
    type: UserRelationType,
    cursor?: string | null,
    limit = 20,
): UserRelationPage {
    mockUser(id);
    const source = users.filter((user) => user.id !== id).map((user) => mockUser(user.id));
    const offset = mockRelationCursorOffset(type, cursor);
    const items = source.slice(offset, offset + limit);
    const nextOffset = offset + items.length;
    const hasMore = nextOffset < source.length;
    return {
        items,
        nextCursor: hasMore ? `mock-user-${type}-${nextOffset}` : null,
        hasMore,
    };
}

function mockPage(
    user: CommunityUser,
    type: "published" | "liked" | "favorite",
    cursor?: string | null,
    limit = 40,
): UserPostPage {
    const authored = posts.filter((post) => post.author === user.nickname);
    const source =
        type === "favorite"
            ? posts.slice(2, 14)
            : type === "liked"
              ? posts.slice(6, 18)
              : authored.length > 0
                ? authored
                : posts.slice(0, 10);
    const offset = mockCursorOffset(cursor);
    const items = source.slice(offset, offset + limit);
    const nextOffset = offset + items.length;
    const hasMore = nextOffset < source.length;
    return {
        items,
        nextCursor: hasMore ? `mock-user-post-${nextOffset}` : null,
        hasMore,
    };
}

export function getUserProfile(id: string): Promise<CommunityUser> {
    if (useMockApi) return Promise.resolve(mockUser(id));
    if (id === "me") {
        return authRequest<{ user: CommunityUser }>("/api/v1/me/summary").then((data) => data.user);
    }
    return authRequest<CommunityUser>(`/api/v1/users/${encodeURIComponent(id)}`);
}

export function setUserFollowing(id: string, following: boolean): Promise<CommunityUser> {
    if (useMockApi) {
        const before = mockUser(id);
        mockFollowingState.set(before.id, following);
        return Promise.resolve({
            ...before,
            isFollowing: following,
            followerCount: Math.max(0, before.followerCount + (following ? 1 : 0)),
        });
    }
    return authRequest<CommunityUser>(`/api/v1/users/${encodeURIComponent(id)}/follow`, {
        method: "PUT",
        body: JSON.stringify({ following }),
    });
}

export function getUserRelationPage(
    id: string,
    type: UserRelationType,
    cursor?: string | null,
    limit = 20,
): Promise<UserRelationPage> {
    if (useMockApi) return Promise.resolve(mockRelationPage(id, type, cursor, limit));
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    return authRequest<UserRelationPage>(
        `/api/v1/users/${encodeURIComponent(id)}/${type}?${params.toString()}`,
    );
}

export async function getUserPostPage(
    id: string,
    cursor?: string | null,
    limit = 40,
): Promise<UserPostPage> {
    if (useMockApi) return mockPage(mockUser(id), "published", cursor, limit);
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    return toPage(
        await authRequest<FeedResponse>(
            `/api/v1/users/${encodeURIComponent(id)}/posts?${params.toString()}`,
        ),
    );
}

export async function getMyPostPage(
    type: "published" | "liked" | "favorite",
    cursor?: string | null,
    limit = 40,
): Promise<UserPostPage> {
    if (useMockApi) return mockPage(mockUser("me"), type, cursor, limit);
    const params = new URLSearchParams({ type, limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    return toPage(await authRequest<FeedResponse>(`/api/v1/me/posts?${params.toString()}`));
}
