import type { Post, PostTag } from "@/data/mockPosts";
import type { Circle } from "@/data/mockCircles";
import { authRequest } from "@/lib/authApi";

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
type ImageDto = { url: string; ratio: Post["ratio"] };

export type ApiPost = {
  id: string;
  title: string;
  content: string;
  images: ImageDto[];
  cover: string;
  ratio: Post["ratio"];
  tag?: PostTag;
  topics: Topic[];
  circle: CircleBrief;
  author: Author;
  usefulCount: number;
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
  isUseful: boolean;
  isLiked: boolean;
  isFavorited: boolean;
  createdAt: string;
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
type CursorPage<T> = { items: T[]; nextCursor?: string; hasMore: boolean };

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
  topics: string[];
  visibility: "public" | "circle";
};

export type CreateCircleInput = Pick<ApiCircle, "name" | "cover" | "desc" | "category" | "tags">;

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
    avatarColor: item.author.avatarColor,
    useful: item.useful.count,
  };
}

export function toCircle(circle: ApiCircle): Circle {
  return {
    id: circle.id,
    name: circle.name,
    cover: circle.cover,
    desc: circle.desc,
    members: String(circle.memberCount),
    posts: `${circle.postCount} 条讨论`,
    category: circle.category,
    joined: circle.isJoined,
    tags: circle.tags,
  };
}

export async function getFeed(categoryId = "recommend"): Promise<Post[]> {
  const data = await authRequest<FeedResponse>(
    `/api/v1/home/feed?categoryId=${encodeURIComponent(categoryId)}&limit=40`,
  );
  return data.items.map(toPost);
}

export async function getPost(id: string): Promise<ApiPost> {
  return authRequest<ApiPost>(`/api/v1/posts/${encodeURIComponent(id)}`);
}

export async function publishPost(input: PublishPostInput): Promise<ApiPost> {
  return authRequest<ApiPost>("/api/v1/posts", { method: "POST", body: JSON.stringify(input) });
}

export async function uploadImage(file: File): Promise<{ url: string }> {
  const body = new FormData();
  body.append("file", file);
  return authRequest<{ url: string }>("/api/v1/uploads", { method: "POST", body });
}

export async function setPostUseful(id: string, liked: boolean) {
  return authRequest<{ count: number; liked: boolean }>(
    `/api/v1/posts/${encodeURIComponent(id)}/useful`,
    {
      method: "POST",
      body: JSON.stringify({ liked }),
    },
  );
}

export async function getCircles(category?: string): Promise<Circle[]> {
  const query = category ? `?category=${encodeURIComponent(category)}&limit=50` : "?limit=50";
  const data = await authRequest<CursorPage<ApiCircle>>(`/api/v1/circles${query}`);
  return data.items.map(toCircle);
}

export async function getMyCircles(ownedOnly = false): Promise<Circle[]> {
  const data = await authRequest<ApiCircle[]>(`/api/v1/circles/mine?ownedOnly=${ownedOnly}`);
  return data.map(toCircle);
}

export async function getCircle(id: string): Promise<Circle> {
  return toCircle(await authRequest<ApiCircle>(`/api/v1/circles/${encodeURIComponent(id)}`));
}

export async function getCirclePosts(id: string): Promise<Post[]> {
  const data = await authRequest<FeedResponse>(
    `/api/v1/circles/${encodeURIComponent(id)}/posts?limit=40`,
  );
  return data.items.map(toPost);
}

export async function createCircle(input: CreateCircleInput): Promise<Circle> {
  return toCircle(
    await authRequest<ApiCircle>("/api/v1/circles", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  );
}

export async function setCircleMembership(id: string, joined: boolean): Promise<Circle> {
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
