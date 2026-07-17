import { circles } from "@/data/mockCircles";
import { posts } from "@/data/mockPosts";
import { getMockCircle } from "@/lib/circleApi.mock";
import type {
    ApiComment,
    ApiPost,
    CommentPage,
    PostReactionType,
    PublishPostInput,
    UploadResult,
    UploadVideoProgress,
    VideoAsset,
    VideoPlaybackSource,
    VideoPostMedia,
} from "@/lib/dalanbookApi";

type MockPostState = {
    post: ApiPost;
    comments: ApiComment[];
};

type MockVideoAssetState = VideoAsset & {
    playbackUrl: string;
    readyAt: number;
};

const mockNow = Date.UTC(2026, 6, 16, 10, 0, 0);
const mockVideoAssets = new Map<string, MockVideoAssetState>();

function delay<T>(value: T): Promise<T> {
    return new Promise((resolve) => globalThis.setTimeout(() => resolve(value), 140));
}

function currentVideoAsset(asset: MockVideoAssetState): MockVideoAssetState {
    if (asset.status === "processing" && Date.now() >= asset.readyAt) {
        asset.status = "ready";
    }
    return asset;
}

function toVideoPostMedia(asset: MockVideoAssetState): VideoPostMedia {
    const {
        id: _id,
        playbackUrl: _playbackUrl,
        readyAt: _readyAt,
        failureReason: _failureReason,
        ...media
    } = currentVideoAsset(asset);
    return { ...media, assetId: asset.id };
}

function toVideoAsset(asset: MockVideoAssetState): VideoAsset {
    const { playbackUrl: _playbackUrl, readyAt: _readyAt, ...media } = currentVideoAsset(asset);
    return { ...media };
}

function requireVideoAsset(id: string): MockVideoAssetState {
    const asset = mockVideoAssets.get(id);
    if (!asset) throw new Error("视频不存在或已过期");
    return currentVideoAsset(asset);
}

function comment(
    id: string,
    name: string,
    content: string,
    minutesAgo: number,
    options: { parentId?: string; isMine?: boolean; replies?: ApiComment[] } = {},
): ApiComment {
    return {
        id,
        parentId: options.parentId,
        author: {
            id: options.isMine ? "mock-current-user" : `mock-user-${id}`,
            name,
            avatarColor: options.isMine ? "#245BDB" : "#5E6B7F",
        },
        content,
        deleted: false,
        isMine: options.isMine ?? false,
        createdAt: new Date(mockNow - minutesAgo * 60_000).toISOString(),
        replies: options.replies ?? [],
    };
}

function seedComments(postId: string, postTitle: string): ApiComment[] {
    if (postId === "p1") {
        const firstId = "mock-comment-p1-1";
        return [
            comment(firstId, "周航", "第 3 个场景很实用，尤其适合需要频繁整理资料的人。", 38, {
                replies: [
                    comment(
                        "mock-comment-p1-reply-1",
                        "林深",
                        "确实，我现在会先让它整理，再人工确认关键结论。",
                        24,
                        { parentId: firstId },
                    ),
                ],
            }),
            comment("mock-comment-p1-2", "我", "期待后续分享完整的工作流配置。", 12, {
                isMine: true,
            }),
        ];
    }
    return [
        comment(`mock-comment-${postId}-1`, "蓝书用户", `这篇《${postTitle}》很有参考价值。`, 52),
    ];
}

const postState = new Map<string, MockPostState>(
    posts.map((post, index) => {
        const circle = circles.find(
            (item) => item.id === post.circleId || item.name === post.circle,
        );
        const comments = seedComments(post.id, post.title);
        const topicName = post.circle.replace(/圈$/, "");
        const apiPost: ApiPost = {
            id: post.id,
            title: post.title,
            content: `这段时间我围绕「${post.title}」做了持续记录。真正有效的并不是一次性尝试，而是先明确问题，再把流程拆成可以重复执行的小步骤。\n\n下面整理的是我目前验证过的方法和踩过的坑。建议先从最耗时间、最容易衡量结果的一个环节开始，连续使用一周后再决定是否扩大范围。`,
            images: [{ url: post.cover, ratio: post.ratio }],
            cover: post.cover,
            ratio: post.ratio,
            tag: post.tag,
            topics: [
                {
                    id: `mock-topic-${circle?.id ?? post.id}`,
                    slug: circle?.id ?? post.id,
                    name: topicName,
                    description: `${topicName}相关经验与讨论`,
                    postCount: circle
                        ? Number.parseInt(circle.posts.replaceAll(",", ""), 10) || 0
                        : 1,
                    createdAt: new Date(mockNow - 90 * 24 * 60 * 60 * 1000).toISOString(),
                },
            ],
            circle: {
                id: circle?.id ?? post.circleId ?? `mock-circle-${index + 1}`,
                name: post.circle,
            },
            author: {
                id: `mock-author-${index + 1}`,
                name: post.author,
                avatarUrl: post.avatarUrl,
                avatarColor: post.avatarColor,
            },
            likeCount: Math.floor(post.useful * 0.46),
            commentCount: comments.reduce((total, item) => total + 1 + item.replies.length, 0),
            favoriteCount: Math.floor(post.useful * 0.31),
            isLiked: false,
            isFavorited: false,
            createdAt: new Date(mockNow - index * 3 * 60 * 60 * 1000).toISOString(),
        };
        return [post.id, { post: apiPost, comments }];
    }),
);

function requirePost(id: string): MockPostState {
    const state = postState.get(id);
    if (!state) throw new Error("帖子不存在");
    return state;
}

function cloneComment(item: ApiComment): ApiComment {
    return {
        ...item,
        author: { ...item.author },
        replies: item.replies.map(cloneComment),
    };
}

function clonePost(post: ApiPost): ApiPost {
    return {
        ...post,
        images: post.images.map((image) => ({ ...image })),
        video: post.video ? toVideoPostMedia(requireVideoAsset(post.video.assetId)) : undefined,
        topics: post.topics.map((topic) => ({ ...topic })),
        circle: { ...post.circle },
        author: { ...post.author },
    };
}

export function getMockPost(id: string): Promise<ApiPost> {
    return delay(clonePost(requirePost(id).post));
}

export function uploadMockImage(file: File): Promise<UploadResult> {
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
    if (!file.size) return Promise.reject(new Error("上传图片不能为空"));
    if (file.size > 10 * 1024 * 1024) return Promise.reject(new Error("图片不能超过 10MB"));
    if (!allowedTypes.has(file.type)) {
        return Promise.reject(new Error("仅支持 JPEG、PNG、WebP、GIF 图片"));
    }
    return delay({
        url: globalThis.URL.createObjectURL(file),
        ossId: String(Date.now()),
        contentType: file.type,
        size: file.size,
    });
}

export function uploadMockVideo(file: File, onProgress?: UploadVideoProgress): Promise<VideoAsset> {
    const allowedTypes = new Set(["video/mp4", "video/quicktime", "video/webm"]);
    if (!file.size) return Promise.reject(new Error("上传视频不能为空"));
    if (file.size > 200 * 1024 * 1024) return Promise.reject(new Error("视频不能超过 200MB"));
    if (!allowedTypes.has(file.type)) {
        return Promise.reject(new Error("仅支持 MP4、MOV、WebM 视频"));
    }
    const asset: MockVideoAssetState = {
        id: `mock-video-${Date.now()}`,
        status: "processing",
        playbackUrl: globalThis.URL.createObjectURL(file),
        readyAt: Date.now() + 1_500,
    };
    mockVideoAssets.set(asset.id, asset);
    onProgress?.(8);
    return new Promise((resolve) => {
        globalThis.setTimeout(() => {
            onProgress?.(100);
            resolve(toVideoAsset(asset));
        }, 180);
    });
}

export function getMockVideoAsset(id: string): Promise<VideoAsset> {
    return delay(toVideoAsset(requireVideoAsset(id)));
}

export function getMockVideoPlayback(postId: string): Promise<VideoPlaybackSource> {
    const video = requirePost(postId).post.video;
    if (!video) return Promise.reject(new Error("该帖子不包含视频"));
    const asset = requireVideoAsset(video.assetId);
    if (asset.status !== "ready") return Promise.reject(new Error("视频仍在处理中"));
    return delay({
        url: asset.playbackUrl,
        expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
        posterUrl: asset.posterUrl,
        durationMs: asset.durationMs,
    });
}

export async function publishMockPost(input: PublishPostInput): Promise<ApiPost> {
    const title = input.title.trim();
    const content = input.content.trim();
    const allowedTags = new Set(["经验", "提问", "测评", "复盘", "大神分享", "清单"]);
    const allowedRatios = new Set(["1/1", "4/5", "3/4", "4/3", "16/9", "9/16"]);
    if (!title || !content || input.images.length > 9) {
        throw new Error("请完整填写标题和正文");
    }
    if (input.images.length && input.videoAssetId) {
        throw new Error("图片和视频不能同时发布");
    }
    if (title.length > 120 || content.length > 10_000) throw new Error("帖子内容超过长度限制");
    if (!allowedTags.has(input.tag)) throw new Error("帖子标签无效");
    if (
        !allowedRatios.has(input.ratio) ||
        input.images.some((image) => !allowedRatios.has(image.ratio))
    ) {
        throw new Error("图片比例无效");
    }
    if ((input.topics?.length ?? 0) > 5) throw new Error("话题数量不能超过 5 个");
    const circle = await getMockCircle(input.circleId);
    const video = input.videoAssetId ? requireVideoAsset(input.videoAssetId) : undefined;
    const id = `mock-post-${Date.now()}`;
    const createdAt = new Date().toISOString();
    const post: ApiPost = {
        id,
        title,
        content,
        images: input.images.map((image) => ({ ...image })),
        video: video ? toVideoPostMedia(video) : undefined,
        cover: video?.posterUrl ?? input.images[0]?.url ?? "",
        ratio: input.ratio,
        tag: input.tag,
        topics: (input.topics ?? []).map((name, index) => ({
            id: `mock-topic-created-${index + 1}`,
            slug: name,
            name,
            description: `${name}相关经验与讨论`,
            postCount: 1,
            createdAt,
        })),
        circle: { id: circle.id, name: circle.name },
        author: {
            id: "mock-current-user",
            name: "我",
            avatarColor: "#245BDB",
        },
        likeCount: 0,
        commentCount: 0,
        favoriteCount: 0,
        isLiked: false,
        isFavorited: false,
        createdAt,
    };
    postState.set(id, { post, comments: [] });
    return delay(clonePost(post));
}

export function setMockPostReaction(
    id: string,
    type: PostReactionType,
    active: boolean,
): Promise<{ type: PostReactionType; count: number; active: boolean }> {
    const { post } = requirePost(id);
    const activeField = type === "like" ? "isLiked" : "isFavorited";
    const countField = type === "like" ? "likeCount" : "favoriteCount";
    if (post[activeField] !== active) {
        post[countField] = Math.max(0, post[countField] + (active ? 1 : -1));
        post[activeField] = active;
    }
    return delay({ type, count: post[countField], active: post[activeField] });
}

function commentCursorOffset(cursor?: string | null): number {
    if (!cursor) return 0;
    const match = /^mock-post-comment-(\d+)$/.exec(cursor);
    return match ? Number(match[1]) : 0;
}

export function getMockPostComments(
    id: string,
    input: { cursor?: string | null; limit: number },
): Promise<CommentPage> {
    const { comments } = requirePost(id);
    const offset = commentCursorOffset(input.cursor);
    const items = comments.slice(offset, offset + input.limit);
    const nextOffset = offset + items.length;
    const hasMore = nextOffset < comments.length;
    return delay({
        items: items.map(cloneComment),
        nextCursor: hasMore ? `mock-post-comment-${nextOffset}` : null,
        hasMore,
    });
}

export function createMockPostComment(
    id: string,
    content: string,
    parentId?: string,
): Promise<ApiComment> {
    const state = requirePost(id);
    const value = content.trim();
    if (!value) return Promise.reject(new Error("评论内容不能为空"));
    const newId = `mock-comment-${Date.now()}`;
    const created = comment(newId, "我", value, 0, {
        parentId,
        isMine: true,
    });
    if (parentId) {
        const parent = state.comments.find((item) => item.id === parentId && !item.deleted);
        if (!parent) return Promise.reject(new Error("要回复的评论不存在"));
        parent.replies.push(created);
    } else {
        state.comments.unshift(created);
    }
    state.post.commentCount += 1;
    return delay(cloneComment(created));
}

export function deleteMockPostComment(id: string): Promise<{ deleted: boolean }> {
    for (const state of postState.values()) {
        const allComments = state.comments.flatMap((item) => [item, ...item.replies]);
        const target = allComments.find((item) => item.id === id);
        if (!target) continue;
        if (!target.isMine) return Promise.reject(new Error("只能删除自己的评论"));
        if (!target.deleted) {
            target.deleted = true;
            target.content = "";
            state.post.commentCount = Math.max(0, state.post.commentCount - 1);
        }
        return delay({ deleted: true });
    }
    return Promise.reject(new Error("评论不存在"));
}
