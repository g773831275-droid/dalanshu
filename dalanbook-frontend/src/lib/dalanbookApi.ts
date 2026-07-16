import type { Post, PostTag } from "@/data/mockPosts";
import type { Circle } from "@/data/mockCircles";
import { authRequest } from "@/lib/authApi";
import { useMockApi } from "@/lib/apiMode";
import {
    createMockCircle,
    getMockCircle,
    getMockCirclePage,
    getMockCirclePostPage,
    getMockMyCircles,
    setMockCircleMembership,
} from "@/lib/circleApi.mock";
import {
    createMockPostComment,
    deleteMockPostComment,
    getMockPost,
    getMockPostComments,
    publishMockPost,
    setMockPostReaction,
    uploadMockImage,
} from "@/lib/postApi.mock";

export type Topic = {
    id: string;
    slug: string;
    name: string;
    description: string;
    postCount: number;
    createdAt: string;
};

type Author = { id: string; name: string; avatarUrl?: string; avatarColor: string };
type CircleBrief = { id: string; name: string };
type ImageDto = { ossId?: string; url: string; ratio: Post["ratio"] };
type ImageInput = { ossId: string; url: string; ratio: Post["ratio"] };

export type ApiPost = {
    id: string;
    title: string;
    content: string;
    images: ImageInput[];
    cover: string;
    ratio: Post["ratio"];
    tag?: PostTag;
    topics: Topic[];
    circle: CircleBrief;
    author: Author;
    likeCount: number;
    commentCount: number;
    favoriteCount: number;
    isLiked: boolean;
    isFavorited: boolean;
    createdAt: string;
};

export type PostReactionType = "like" | "favorite";

export type CommentAuthor = {
    id: string;
    name: string;
    avatarUrl?: string;
    avatarColor: string;
};

export type ApiComment = {
    id: string;
    parentId?: string;
    author: CommentAuthor;
    content: string;
    deleted: boolean;
    isMine: boolean;
    createdAt: string;
    replies: ApiComment[];
};

export type CommentPage = {
    items: ApiComment[];
    nextCursor: string | null;
    hasMore: boolean;
};

export type GetPostCommentPageInput = {
    cursor?: string | null;
    limit?: number;
};

type FeedItem = {
    id: string;
    cover: { url: string; ratio: Post["ratio"] };
    tag?: PostTag;
    title: string;
    circle: CircleBrief;
    author: Author;
    useful: { count: number; liked: boolean };
    createdAt: string;
};

type FeedResponse = { items: FeedItem[]; nextCursor?: string; hasMore: boolean };
type CursorPage<T> = { items: T[]; nextCursor?: string | null; hasMore: boolean };

export type ApiCircle = {
    id: string;
    name: string;
    cover: string;
    desc: string;
    category: string;
    tags: string[];
    memberCount: number;
    postCount: number;
    isJoined: boolean;
    isOwner: boolean;
    ownerId: string;
    createdAt: string;
};

export type PublishPostInput = {
    title: string;
    content: string;
    circleId: string;
    images: ImageDto[];
    ratio: Post["ratio"];
    tag: PostTag;
    topics?: string[];
    visibility?: "public" | "circle";
};

export type UploadResult = {
    url: string;
    ossId: string;
    contentType: string;
    size: number;
};

export type CreateCircleInput = Pick<ApiCircle, "name" | "cover" | "desc" | "category" | "tags">;

export type CirclePage = {
    items: Circle[];
    nextCursor: string | null;
    hasMore: boolean;
};

export type GetCirclePageInput = {
    category?: string;
    cursor?: string | null;
    limit?: number;
};

export type CirclePostPage = {
    items: Post[];
    nextCursor: string | null;
    hasMore: boolean;
};

export type GetCirclePostPageInput = {
    id: string;
    cursor?: string | null;
    limit?: number;
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
        author: item.author.name,
        avatarUrl: item.author.avatarUrl,
        avatarColor: item.author.avatarColor,
        useful: item.useful.count,
        usefulLiked: item.useful.liked,
    };
}

function formatMemberCount(count: number): string {
    if (count < 10_000) return String(count);
    const value = count / 10_000;
    return `${Number.isInteger(value) ? value : value.toFixed(1)} 万`;
}

export function toCircle(circle: ApiCircle): Circle {
    return {
        id: circle.id,
        name: circle.name,
        cover: circle.cover,
        desc: circle.desc,
        members: formatMemberCount(circle.memberCount),
        posts: `${new Intl.NumberFormat("zh-CN").format(circle.postCount)} 条讨论`,
        category: circle.category,
        joined: circle.isJoined,
        tags: circle.tags,
    };
}

export async function getPost(id: string): Promise<ApiPost> {
    if (useMockApi) return getMockPost(id);
    return authRequest<ApiPost>(`/api/v1/posts/${encodeURIComponent(id)}`);
}

export async function publishPost(input: PublishPostInput): Promise<ApiPost> {
    if (useMockApi) return publishMockPost(input);
    return authRequest<ApiPost>("/api/v1/posts", {
        method: "POST",
        body: JSON.stringify({
            ...input,
            images: input.images.map(({ ossId, ratio }) => ({ ossId, ratio })),
        }),
    });
}

export async function uploadImage(file: File): Promise<UploadResult> {
    if (useMockApi) return uploadMockImage(file);
    const body = new FormData();
    body.append("file", file);
    return authRequest<UploadResult>("/api/v1/uploads", { method: "POST", body });
}

export async function setPostReaction(id: string, type: PostReactionType, active: boolean) {
    if (useMockApi) return setMockPostReaction(id, type, active);
    return authRequest<{ type: PostReactionType; count: number; active: boolean }>(
        `/api/v1/posts/${encodeURIComponent(id)}/reactions/${type}`,
        {
            method: "POST",
            body: JSON.stringify({ active }),
        },
    );
}

export function getPostComments(
    id: string,
    { cursor, limit = 20 }: GetPostCommentPageInput = {},
): Promise<CommentPage> {
    if (useMockApi) return getMockPostComments(id, { cursor, limit });
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    return authRequest<CommentPage>(
        `/api/v1/posts/${encodeURIComponent(id)}/comments?${params.toString()}`,
    );
}

export function createPostComment(
    id: string,
    content: string,
    parentId?: string,
): Promise<ApiComment> {
    if (useMockApi) return createMockPostComment(id, content, parentId);
    return authRequest<ApiComment>(`/api/v1/posts/${encodeURIComponent(id)}/comments`, {
        method: "POST",
        body: JSON.stringify({ content, parentId }),
    });
}

export function deletePostComment(id: string): Promise<{ deleted: boolean }> {
    if (useMockApi) return deleteMockPostComment(id);
    return authRequest<{ deleted: boolean }>(`/api/v1/comments/${encodeURIComponent(id)}`, {
        method: "DELETE",
    });
}

export async function getCirclePage({
    category,
    cursor,
    limit = 20,
}: GetCirclePageInput = {}): Promise<CirclePage> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (category) params.set("category", category);
    if (cursor) params.set("cursor", cursor);
    const data = useMockApi
        ? await getMockCirclePage({ category, cursor, limit })
        : await authRequest<CursorPage<ApiCircle>>(`/api/v1/circles?${params.toString()}`);
    return {
        items: data.items.map(toCircle),
        nextCursor: data.nextCursor ?? null,
        hasMore: data.hasMore,
    };
}

export async function getCircles(category?: string): Promise<Circle[]> {
    return (await getCirclePage({ category, limit: 50 })).items;
}

export async function getMyCircles(ownedOnly = false): Promise<Circle[]> {
    const data = useMockApi
        ? await getMockMyCircles(ownedOnly)
        : await authRequest<ApiCircle[]>(`/api/v1/circles/mine?ownedOnly=${ownedOnly}`);
    return data.map(toCircle);
}

export async function getCircle(id: string): Promise<Circle> {
    const circle = useMockApi
        ? await getMockCircle(id)
        : await authRequest<ApiCircle>(`/api/v1/circles/${encodeURIComponent(id)}`);
    return toCircle(circle);
}

export async function getCirclePostPage({
    id,
    cursor,
    limit = 20,
}: GetCirclePostPageInput): Promise<CirclePostPage> {
    if (useMockApi) return getMockCirclePostPage({ id, cursor, limit });
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    const data = await authRequest<FeedResponse>(
        `/api/v1/circles/${encodeURIComponent(id)}/posts?${params.toString()}`,
    );
    return {
        items: data.items.map(toPost),
        nextCursor: data.nextCursor ?? null,
        hasMore: data.hasMore,
    };
}

export async function getCirclePosts(id: string): Promise<Post[]> {
    return (await getCirclePostPage({ id, limit: 40 })).items;
}

export async function createCircle(input: CreateCircleInput): Promise<Circle> {
    if (useMockApi) return toCircle(await createMockCircle(input));
    return toCircle(
        await authRequest<ApiCircle>("/api/v1/circles", {
            method: "POST",
            body: JSON.stringify(input),
        }),
    );
}

export async function setCircleMembership(id: string, joined: boolean): Promise<Circle> {
    if (useMockApi) return toCircle(await setMockCircleMembership(id, joined));
    return toCircle(
        await authRequest<ApiCircle>(`/api/v1/circles/${encodeURIComponent(id)}/membership`, {
            method: "PUT",
            body: JSON.stringify({ joined }),
        }),
    );
}

export function getTopics(): Promise<Topic[]> {
    return authRequest<Topic[]>("/api/v1/topics?limit=50");
}

export async function getTopic(slug: string): Promise<{ topic: Topic; posts: Post[] }> {
    const data = await authRequest<{ topic: Topic; posts: CursorPage<FeedItem> }>(
        `/api/v1/topics/${encodeURIComponent(slug)}?limit=40`,
    );
    return { topic: data.topic, posts: data.posts.items.map(toPost) };
}
