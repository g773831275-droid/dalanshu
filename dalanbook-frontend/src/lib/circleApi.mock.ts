import { circles } from "@/data/mockCircles";
import { posts, type Post } from "@/data/mockPosts";
import type { ApiCircle, CreateCircleInput } from "@/lib/dalanbookApi";

const currentUserId = "mock-current-user";

let circleState: ApiCircle[] = circles.map((circle, index) => ({
    id: circle.id,
    name: circle.name,
    cover: circle.cover,
    desc: circle.desc,
    category: circle.category,
    tags: [...circle.tags],
    memberCount: Number.parseFloat(circle.members) * (circle.members.includes("万") ? 10_000 : 1),
    postCount: Number.parseInt(circle.posts.replaceAll(",", ""), 10) || 0,
    isJoined: circle.joined ?? false,
    isOwner: index === 0,
    ownerId: index === 0 ? currentUserId : `mock-owner-${index + 1}`,
    createdAt: new Date(Date.UTC(2026, 6, 16, 7, 0, 0) - index * 24 * 60 * 60 * 1000).toISOString(),
}));

function delay<T>(value: T): Promise<T> {
    return new Promise((resolve) => globalThis.setTimeout(() => resolve(value), 180));
}

function cursorOffset(cursor?: string | null): number {
    if (!cursor) return 0;
    const match = /^mock-circle-(\d+)$/.exec(cursor);
    return match ? Number(match[1]) : 0;
}

export function getMockCirclePage(input: {
    category?: string;
    cursor?: string | null;
    limit: number;
}): Promise<{ items: ApiCircle[]; nextCursor: string | null; hasMore: boolean }> {
    const filtered = input.category
        ? circleState.filter((circle) => circle.category === input.category)
        : circleState;
    const offset = cursorOffset(input.cursor);
    const items = filtered.slice(offset, offset + input.limit);
    const nextOffset = offset + items.length;
    const hasMore = nextOffset < filtered.length;
    return delay({
        items,
        nextCursor: hasMore ? `mock-circle-${nextOffset}` : null,
        hasMore,
    });
}

export function getMockMyCircles(ownedOnly: boolean): Promise<ApiCircle[]> {
    return delay(circleState.filter((circle) => (ownedOnly ? circle.isOwner : circle.isJoined)));
}

export function getMockCircle(id: string): Promise<ApiCircle> {
    const circle = circleState.find((item) => item.id === id);
    return circle ? delay(circle) : Promise.reject(new Error("圈子不存在"));
}

function circlePostCursorOffset(cursor?: string | null): number {
    if (!cursor) return 0;
    const match = /^mock-circle-post-(\d+)$/.exec(cursor);
    return match ? Number(match[1]) : 0;
}

export function getMockCirclePostPage(input: {
    id: string;
    cursor?: string | null;
    limit: number;
}): Promise<{ items: Post[]; nextCursor: string | null; hasMore: boolean }> {
    const { id, cursor, limit } = input;
    const circle = circleState.find((item) => item.id === id);
    if (!circle) return Promise.reject(new Error("圈子不存在"));
    const filtered = posts.filter((post) => post.circleId === id || post.circle === circle.name);
    const offset = circlePostCursorOffset(cursor);
    const items = filtered.slice(offset, offset + limit);
    const nextOffset = offset + items.length;
    const hasMore = nextOffset < filtered.length;
    return delay({
        items,
        nextCursor: hasMore ? `mock-circle-post-${nextOffset}` : null,
        hasMore,
    });
}

export function createMockCircle(input: CreateCircleInput): Promise<ApiCircle> {
    const now = new Date().toISOString();
    const circle: ApiCircle = {
        ...input,
        id: `mock-created-${Date.now()}`,
        memberCount: 1,
        postCount: 0,
        isJoined: true,
        isOwner: true,
        ownerId: currentUserId,
        createdAt: now,
    };
    circleState = [circle, ...circleState];
    return delay(circle);
}

export function setMockCircleMembership(id: string, joined: boolean): Promise<ApiCircle> {
    const index = circleState.findIndex((circle) => circle.id === id);
    if (index < 0) return Promise.reject(new Error("圈子不存在"));
    const current = circleState[index];
    if (current.isOwner && !joined) return Promise.reject(new Error("圈主不能退出自己的圈子"));
    const updated = {
        ...current,
        isJoined: joined,
        memberCount: Math.max(0, current.memberCount + (joined ? 1 : -1)),
    };
    circleState = circleState.map((circle, itemIndex) => (itemIndex === index ? updated : circle));
    return delay(updated);
}
