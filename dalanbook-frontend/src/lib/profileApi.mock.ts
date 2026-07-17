import { posts, type Post } from "@/data/mockPosts";
import { findUser, users, type MockUser } from "@/data/mockUsers";
import type {
    GetProfilePostPageInput,
    ProfilePostPage,
    ProfileTopic,
    ProfileUser,
} from "@/lib/profileApi";

const followingState = new Map<string, boolean>();

function delay<T>(value: T): Promise<T> {
    return new Promise((resolve) => globalThis.setTimeout(() => resolve(value), 180));
}

function resolveUser(id: string): MockUser | undefined {
    if (id === "me" || id.startsWith("mock-user-")) return users[0];
    return findUser(id);
}

function count(value: string): number {
    const parsed = Number.parseFloat(value.replaceAll(",", ""));
    if (!Number.isFinite(parsed)) return 0;
    return Math.round(parsed * (value.toLowerCase().includes("k") ? 1000 : 1));
}

function createdAt(user: MockUser): string {
    const match = /^(\d{4})\s*年\s*(\d{1,2})\s*月$/.exec(user.joinedAt);
    return match
        ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)).toISOString()
        : new Date(Date.UTC(2024, 0, 1)).toISOString();
}

function toProfileUser(user: MockUser): ProfileUser {
    return {
        id: user.id,
        nickname: user.name,
        avatarUrl: null,
        avatarColor: user.avatarColor,
        bio: user.bio,
        gender: "unknown",
        location: user.location,
        followerCount: count(user.followers),
        followingCount: user.following,
        postCount: user.worksCount,
        isFollowing: followingState.get(user.id) ?? false,
        createdAt: createdAt(user),
    };
}

function cursorOffset(cursor?: string | null): number {
    if (!cursor) return 0;
    const match = /^mock-profile-(\d+)$/.exec(cursor);
    return match ? Number(match[1]) : 0;
}

function profilePosts(user: MockUser, tab: GetProfilePostPageInput["tab"]): Post[] {
    if (tab === "saved") return posts.slice(2, 14);
    if (tab === "liked") return posts.slice(6, 18);
    const authored = posts.filter((post) => post.author === user.name);
    return authored.length > 0 ? authored : posts.slice(0, 10);
}

export function getMockProfileUser(id: string): Promise<ProfileUser> {
    const user = resolveUser(id);
    return user ? delay(toProfileUser(user)) : Promise.reject(new Error("用户不存在"));
}

export function getMockProfilePostPage({
    id,
    tab,
    cursor,
    limit = 20,
}: GetProfilePostPageInput): Promise<ProfilePostPage> {
    const user = resolveUser(id);
    if (!user) return Promise.reject(new Error("用户不存在"));
    if (id !== "me" && !id.startsWith("mock-user-") && tab !== "posts") {
        return Promise.reject(new Error("只能查看其他用户公开发布的笔记"));
    }
    const source = profilePosts(user, tab);
    const offset = cursorOffset(cursor);
    const items = source.slice(offset, offset + limit);
    const nextOffset = offset + items.length;
    const hasMore = nextOffset < source.length;
    return delay({
        items,
        nextCursor: hasMore ? `mock-profile-${nextOffset}` : null,
        hasMore,
    });
}

export function getMockFollowedTopics(limit: number): Promise<ProfileTopic[]> {
    const user = users[0];
    const topicNames = [...user.tags, "复盘", "长期主义"];
    return delay(
        topicNames.slice(0, limit).map((name, index) => ({
            id: `mock-topic-${index + 1}`,
            slug: `mock-topic-${index + 1}`,
            name,
        })),
    );
}

export function setMockProfileFollowing(id: string, following: boolean) {
    const user = resolveUser(id);
    if (!user) return Promise.reject(new Error("用户不存在"));
    const wasFollowing = followingState.get(user.id) ?? false;
    followingState.set(user.id, following);
    const followerCount = Math.max(
        0,
        count(user.followers) + (following ? 1 : 0) - (wasFollowing ? 1 : 0),
    );
    return delay({ following, followerCount });
}
