import type { Circle } from "@/data/mockCircles";
import type { Post, PostTag } from "@/data/mockPosts";
import { authRequest } from "@/lib/authApi";
import { useMockApi } from "@/lib/apiMode";
import { getMyCircles } from "@/lib/dalanbookApi";
import {
    getMockFollowedTopics,
    getMockProfilePostPage,
    getMockProfileUser,
    setMockProfileFollowing,
} from "@/lib/profileApi.mock";

export type ProfileTab = "posts" | "saved" | "liked";

export type ProfileUser = {
    id: string;
    nickname: string;
    avatarUrl: string | null;
    avatarColor: string;
    bio: string;
    gender: "unknown" | "male" | "female" | "other";
    location: string;
    followerCount: number;
    followingCount: number;
    postCount: number;
    isFollowing: boolean;
    createdAt: string | null;
};

export type ProfileTopic = {
    id: string;
    slug: string;
    name: string;
};

export type ProfilePostPage = {
    items: Post[];
    nextCursor: string | null;
    hasMore: boolean;
};

export type GetProfilePostPageInput = {
    id: string;
    tab: ProfileTab;
    cursor?: string | null;
    limit?: number;
};

type ApiProfileUser = {
    id: string;
    nickname: string;
    avatar?: string | null;
    bio?: string | null;
    gender?: string | null;
    location?: string | null;
    followerCount: number;
    followingCount: number;
    postCount: number;
    isFollowing: boolean;
    createdAt?: string | null;
};

type ApiProfilePost = {
    id: string;
    title: string;
    tag?: PostTag | null;
    cover: {
        url: string;
        ratio: Post["ratio"];
    };
    circle: {
        id: string;
        name: string;
    };
    author: {
        id: string;
        name: string;
        avatarUrl?: string | null;
        avatarColor?: string | null;
    };
    useful: {
        count: number;
        liked: boolean;
    };
    createdAt: string;
};

type CursorPage<T> = {
    items: T[];
    nextCursor?: string | null;
    hasMore: boolean;
};

const avatarColors = ["#245BDB", "#1F9D6A", "#D88B16", "#D94B4B", "#5E6B7F"];

function avatarColor(id: string): string {
    let hash = 0;
    for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) | 0;
    return avatarColors[Math.abs(hash) % avatarColors.length];
}

function toProfileUser(user: ApiProfileUser): ProfileUser {
    const gender = ["male", "female", "other"].includes(user.gender ?? "")
        ? (user.gender as ProfileUser["gender"])
        : "unknown";
    return {
        id: user.id,
        nickname: user.nickname || "大蓝书用户",
        avatarUrl: user.avatar || null,
        avatarColor: avatarColor(user.id),
        bio: user.bio || "",
        gender,
        location: user.location || "",
        followerCount: user.followerCount ?? 0,
        followingCount: user.followingCount ?? 0,
        postCount: user.postCount ?? 0,
        isFollowing: user.isFollowing ?? false,
        createdAt: user.createdAt ?? null,
    };
}

function toPost(item: ApiProfilePost): Post {
    return {
        id: item.id,
        cover: item.cover.url,
        ratio: item.cover.ratio,
        tag: item.tag ?? undefined,
        circleId: item.circle.id,
        circle: item.circle.name,
        title: item.title,
        author: item.author.name,
        avatarUrl: item.author.avatarUrl ?? undefined,
        avatarColor: item.author.avatarColor || avatarColor(item.author.id),
        useful: item.useful.count,
        usefulLiked: item.useful.liked,
    };
}

export async function getProfileUser(id: string): Promise<ProfileUser> {
    if (useMockApi) return getMockProfileUser(id);
    const path = id === "me" ? "/api/v1/auth/me" : `/api/v1/users/${encodeURIComponent(id)}`;
    return toProfileUser(await authRequest<ApiProfileUser>(path));
}

export async function getProfilePostPage({
    id,
    tab,
    cursor,
    limit = 20,
}: GetProfilePostPageInput): Promise<ProfilePostPage> {
    if (useMockApi) return getMockProfilePostPage({ id, tab, cursor, limit });
    const params = new URLSearchParams({ limit: String(limit) });
    if (id === "me")
        params.set("tab", tab === "posts" ? "published" : tab === "saved" ? "favorited" : "liked");
    if (cursor) params.set("cursor", cursor);
    const path = id === "me" ? "/api/v1/me/posts" : `/api/v1/users/${encodeURIComponent(id)}/posts`;
    const data = await authRequest<CursorPage<ApiProfilePost>>(`${path}?${params.toString()}`);
    return {
        items: data.items.map(toPost),
        nextCursor: data.nextCursor ?? null,
        hasMore: data.hasMore,
    };
}

export function getProfileCircles(): Promise<Circle[]> {
    return getMyCircles(false);
}

export function getFollowedTopics(limit = 12): Promise<ProfileTopic[]> {
    if (useMockApi) return getMockFollowedTopics(limit);
    return authRequest<ProfileTopic[]>(`/api/v1/me/topics?limit=${limit}`);
}

export function setProfileFollowing(id: string, following: boolean) {
    if (useMockApi) return setMockProfileFollowing(id, following);
    return authRequest<{ following: boolean; followerCount: number }>(
        `/api/v1/users/${encodeURIComponent(id)}/following`,
        {
            method: "PUT",
            body: JSON.stringify({ following }),
        },
    );
}
