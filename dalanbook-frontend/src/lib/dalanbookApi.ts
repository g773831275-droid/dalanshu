import type { Post, PostTag } from "@/data/mockPosts";
import type { Circle } from "@/data/mockCircles";
import { authRequest } from "@/lib/authApi";
import { useMockApi } from "@/lib/apiMode";
import {
    createMockCircle,
    getMockCircle,
    getMockCirclePage,
    getMockCirclePinnedItems,
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
    getMockVideoAsset,
    getMockVideoPlayback,
    uploadMockVideo,
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
type ImageInput = { ossId?: string; url: string; ratio: Post["ratio"] };

export type VideoAssetStatus =
    "uploading" | "uploaded" | "processing" | "ready" | "failed" | "rejected" | "deleted";

export type VideoAsset = {
    id: string;
    status: VideoAssetStatus;
    posterUrl?: string;
    durationMs?: number;
    width?: number;
    height?: number;
    failureReason?: string;
};

export type VideoPostMedia = Omit<VideoAsset, "id" | "failureReason"> & { assetId: string };

export type VideoUploadCredentials = {
    assetId: string;
    uploadUrl?: string;
    uploadMethod?: "PUT";
    uploadHeaders?: Record<string, string>;
    applicationId?: number;
    spaceName?: string;
    workflowTemplateId?: string;
    uploadSts?: {
        accessKeyId: string;
        secretAccessKey: string;
        sessionToken: string;
        expiredTime: string;
        currentTime: string;
        spaceName?: string;
    };
    expiresAt: string;
};

export type VideoPlaybackSource = {
    url?: string;
    vid?: string;
    playAuth?: string;
    expiresAt: string;
    posterUrl?: string;
    durationMs?: number;
};

export type ApiPost = {
    id: string;
    title: string;
    content: string;
    images: ImageInput[];
    video?: VideoPostMedia;
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
    video?: VideoPostMedia;
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

export type CirclePinnedItemKind = "rules" | "announcement" | "activity";
export type CirclePinnedItemStatus = "active" | "ended" | null;

export type CirclePinnedItem = {
    id: string;
    kind: CirclePinnedItemKind;
    title: string;
    content: string;
    images?: Array<{
        ossId: string;
        url: string;
    }>;
    publisher: {
        id: string;
        name: string;
    };
    viewCount: number;
    status: CirclePinnedItemStatus;
    publishedAt: string;
    pinnedAt: string;
};

type CirclePinnedItemsResponse = {
    items: CirclePinnedItem[];
};

export type PublishPostInput = {
    title: string;
    content: string;
    circleId: string;
    images: ImageDto[];
    videoAssetId?: string;
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

export type UploadVideoProgress = (percent: number) => void;

export type CreateCircleInput = Pick<ApiCircle, "name" | "cover" | "desc" | "category" | "tags">;

export type CirclePage = {
    items: Circle[];
    nextCursor: string | null;
    hasMore: boolean;
};

export type GetCirclePageInput = {
    category?: string;
    query?: string;
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
        video: item.video,
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

export async function requestVideoUploadCredentials(file: File): Promise<VideoUploadCredentials> {
    if (useMockApi) {
        return {
            assetId: `mock-video-${Date.now()}`,
            uploadUrl: "mock://vod-upload",
            expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
        };
    }
    return authRequest<VideoUploadCredentials>("/api/v1/media/videos/upload-credentials", {
        method: "POST",
        body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
            size: file.size,
        }),
    });
}

function uploadToSignedUrl(
    file: File,
    credentials: VideoUploadCredentials,
    onProgress?: UploadVideoProgress,
): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!credentials.uploadUrl) {
            reject(new Error("视频服务未返回可用上传地址"));
            return;
        }
        const request = new XMLHttpRequest();
        if (credentials.uploadMethod && credentials.uploadMethod !== "PUT") {
            reject(new Error("当前视频上传凭证不支持此上传方式"));
            return;
        }
        request.open(credentials.uploadMethod ?? "PUT", credentials.uploadUrl);
        Object.entries(credentials.uploadHeaders ?? {}).forEach(([name, value]) => {
            request.setRequestHeader(name, value);
        });
        request.upload.onprogress = (event) => {
            if (event.lengthComputable)
                onProgress?.(Math.round((event.loaded / event.total) * 100));
        };
        request.onerror = () => reject(new Error("视频上传失败，请检查网络后重试"));
        request.onabort = () => reject(new Error("视频上传已取消"));
        request.onload = () => {
            if (request.status >= 200 && request.status < 300) {
                onProgress?.(100);
                resolve();
                return;
            }
            reject(new Error(`视频上传失败（${request.status || "网络错误"}）`));
        };
        request.send(file);
    });
}

function hasVolcengineUploadAuth(credentials: VideoUploadCredentials): boolean {
    const auth = credentials.uploadSts;
    const appId = credentials.applicationId ?? Number(import.meta.env.VITE_VOD_APP_ID);
    return Boolean(
        auth?.accessKeyId &&
        auth.secretAccessKey &&
        auth.sessionToken &&
        auth.expiredTime &&
        auth.currentTime &&
        (credentials.spaceName || auth.spaceName) &&
        Number.isInteger(appId) &&
        appId > 0,
    );
}

async function uploadToVolcengineVod(
    file: File,
    credentials: VideoUploadCredentials,
    userId: string | undefined,
    onProgress?: UploadVideoProgress,
): Promise<string> {
    const auth = credentials.uploadSts;
    const spaceName = credentials.spaceName ?? auth?.spaceName;
    const appId = credentials.applicationId ?? Number(import.meta.env.VITE_VOD_APP_ID);
    if (!auth || !spaceName || !Number.isInteger(appId) || appId <= 0) {
        throw new Error("视频服务未返回有效上传凭证");
    }
    const { default: TTUploader } = await import("tt-uploader");
    const processAction = credentials.workflowTemplateId
        ? [
              { Name: "GetMeta" as const },
              {
                  Name: "StartWorkflow" as const,
                  Input: { TemplateId: credentials.workflowTemplateId },
              },
          ]
        : undefined;
    return new Promise<string>((resolve, reject) => {
        const uploader = new TTUploader({
            userId: userId ?? "anonymous",
            appId,
            videoConfig: { spaceName, processAction },
            useLocalStorage: false,
            useServerCurrentTime: true,
            noLog: true,
        });
        const key = uploader.addFile({
            file,
            fileName: file.name,
            type: "video",
            processAction,
            stsToken: {
                AccessKeyId: auth.accessKeyId,
                SecretAccessKey: auth.secretAccessKey,
                SessionToken: auth.sessionToken,
                ExpiredTime: auth.expiredTime,
                CurrentTime: auth.currentTime,
            },
        });
        const clearListeners = () => {
            uploader.removeAllListeners("progress");
            uploader.removeAllListeners("complete");
            uploader.removeAllListeners("error");
        };
        uploader.on("progress", (info) => {
            const percent = Number(info.percent);
            if (Number.isFinite(percent)) onProgress?.(Math.round(percent));
        });
        uploader.once("complete", (info) => {
            clearListeners();
            const vid = videoIdFromUploadResult(info);
            if (!vid) {
                reject(new Error("视频服务未返回上传结果，请重新选择视频"));
                return;
            }
            onProgress?.(100);
            resolve(vid);
        });
        uploader.once("error", (info) => {
            clearListeners();
            reject(new Error(typeof info.message === "string" ? info.message : "视频上传失败"));
        });
        uploader.start(key);
    });
}

function videoIdFromUploadResult(info: Record<string, unknown>): string | undefined {
    const candidates = [
        info.vid,
        info.Vid,
        (info.data as Record<string, unknown> | undefined)?.vid,
        (info.data as Record<string, unknown> | undefined)?.Vid,
        (info.result as Record<string, unknown> | undefined)?.vid,
        (info.result as Record<string, unknown> | undefined)?.Vid,
    ];
    return candidates.find(
        (candidate): candidate is string => typeof candidate === "string" && candidate.length > 0,
    );
}

export async function uploadVideoFile(
    file: File,
    onProgress?: UploadVideoProgress,
    userId?: string,
): Promise<VideoAsset> {
    if (useMockApi) return uploadMockVideo(file, onProgress);
    const credentials = await requestVideoUploadCredentials(file);
    if (hasVolcengineUploadAuth(credentials)) {
        const vid = await uploadToVolcengineVod(file, credentials, userId, onProgress);
        await completeVideoUpload(credentials.assetId, vid);
    } else {
        await uploadToSignedUrl(file, credentials, onProgress);
    }
    return getVideoAsset(credentials.assetId);
}

export function getVideoAsset(id: string): Promise<VideoAsset> {
    if (useMockApi) return getMockVideoAsset(id);
    return authRequest<VideoAsset>(`/api/v1/media/videos/${encodeURIComponent(id)}`);
}

export async function completeVideoUpload(id: string, vid: string): Promise<void> {
    if (useMockApi) return;
    await authRequest<void>(`/api/v1/media/videos/${encodeURIComponent(id)}/complete`, {
        method: "POST",
        body: JSON.stringify({ vid }),
    });
}

export function getVideoPlayback(postId: string): Promise<VideoPlaybackSource> {
    if (useMockApi) return getMockVideoPlayback(postId);
    return authRequest<VideoPlaybackSource>(
        `/api/v1/posts/${encodeURIComponent(postId)}/video-playback`,
    );
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
    query,
    cursor,
    limit = 20,
}: GetCirclePageInput = {}): Promise<CirclePage> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (category) params.set("category", category);
    if (query?.trim()) params.set("q", query.trim());
    if (cursor) params.set("cursor", cursor);
    let data: CursorPage<ApiCircle>;
    if (useMockApi) {
        data = await getMockCirclePage({ category, cursor, limit });
        if (query?.trim()) {
            const keyword = query.trim().toLowerCase();
            data = {
                ...data,
                items: data.items.filter((circle) =>
                    `${circle.name} ${circle.desc} ${circle.tags.join(" ")}`
                        .toLowerCase()
                        .includes(keyword),
                ),
            };
        }
    } else {
        const endpoint = query?.trim() ? "/api/v1/search/circles" : "/api/v1/circles";
        data = await authRequest<CursorPage<ApiCircle>>(`${endpoint}?${params.toString()}`);
    }
    return {
        items: data.items.map(toCircle),
        nextCursor: data.nextCursor ?? null,
        hasMore: data.hasMore,
    };
}

export async function getCircles(category?: string): Promise<Circle[]> {
    const items: Circle[] = [];
    let cursor: string | null = null;
    do {
        const page = await getCirclePage({ category, cursor, limit: 50 });
        items.push(...page.items);
        cursor = page.hasMore ? page.nextCursor : null;
    } while (cursor);
    return items;
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

export async function getCirclePinnedItems(id: string): Promise<CirclePinnedItem[]> {
    if (useMockApi) return getMockCirclePinnedItems(id);
    const data = await authRequest<CirclePinnedItemsResponse>(
        `/api/v1/circles/${encodeURIComponent(id)}/pinned-items`,
    );
    return data.items;
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

export function getTopicSuggestions(keyword: string, limit = 10): Promise<Topic[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    const normalizedKeyword = keyword.normalize("NFKC").trim();
    if (normalizedKeyword) params.set("keyword", normalizedKeyword);
    return authRequest<Topic[]>(`/api/v1/topics?${params.toString()}`);
}

export async function getTopic(slug: string): Promise<{ topic: Topic; posts: Post[] }> {
    const data = await authRequest<{ topic: Topic; posts: CursorPage<FeedItem> }>(
        `/api/v1/topics/${encodeURIComponent(slug)}?limit=40`,
    );
    return { topic: data.topic, posts: data.posts.items.map(toPost) };
}
