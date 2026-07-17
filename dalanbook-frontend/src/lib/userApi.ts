import type { Post } from "@/data/mockPosts";
import { posts } from "@/data/mockPosts";
import { findUser } from "@/data/mockUsers";
import { authRequest } from "@/lib/authApi";
import { useMockApi } from "@/lib/apiMode";

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
  return {
    id: user.id,
    nickname: user.name,
    bio: user.bio,
    gender: "unknown",
    location: user.location,
    followerCount: Number(user.followers.replace(/[^\d]/g, "")) || 0,
    followingCount: user.following,
    postCount: user.worksCount,
    isFollowing: false,
    createdAt: null,
  };
}

function mockPage(user: CommunityUser): UserPostPage {
  return {
    items: posts.filter((post) => post.author === user.nickname),
    nextCursor: null,
    hasMore: false,
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
  if (useMockApi) return Promise.resolve({ ...mockUser(id), isFollowing: following });
  return authRequest<CommunityUser>(`/api/v1/users/${encodeURIComponent(id)}/follow`, {
    method: "PUT",
    body: JSON.stringify({ following }),
  });
}

export async function getUserPostPage(
  id: string,
  cursor?: string | null,
  limit = 40,
): Promise<UserPostPage> {
  if (useMockApi) return mockPage(mockUser(id));
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
  if (useMockApi) return mockPage(mockUser("me"));
  const params = new URLSearchParams({ type, limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  return toPage(await authRequest<FeedResponse>(`/api/v1/me/posts?${params.toString()}`));
}
