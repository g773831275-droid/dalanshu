import { authRequest } from "@/lib/authApi";
import { useMockApi } from "@/lib/apiMode";
import {
  getMockHomeCategories,
  getMockHomeCircleRecommendation,
  getMockHomeFeed,
  getMockHomeLeftNav,
} from "@/lib/homeApi.mock";
import type { HomeChannel } from "@/lib/homeUi";

export type HomeCategoryType = "system" | "topic";
export type HomeCoverRatio = "1/1" | "4/5" | "3/4" | "4/3" | "16/9";
export type HomePostTag = "经验" | "提问" | "测评" | "复盘" | "大神分享" | "清单";

export type HomeCategory = {
  id: string;
  name: string;
  type: HomeCategoryType;
};

export type HomeCategoriesResponse = {
  categories: HomeCategory[];
  defaultId: string;
};

export type HomeFeedItem = {
  id: string;
  title: string;
  tag: HomePostTag | null;
  cover: {
    url: string;
    ratio: HomeCoverRatio;
    blurhash: string | null;
  };
  circle: {
    id: string;
    name: string;
  };
  author: {
    id: string;
    name: string;
    avatarUrl: string | null;
    avatarColor: string | null;
  };
  useful: {
    count: number;
    liked: boolean;
  };
  createdAt: string;
};

export type HomeFeedResponse = {
  items: HomeFeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type HomeMyCircle = {
  id: string;
  name: string;
  avatarUrl: string | null;
  unread: number;
};

export type HomeShortcut = {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge: number | null;
};

export type HomeLeftNavResponse = {
  shortcuts: HomeShortcut[];
  myCircles: HomeMyCircle[];
};

export type HomeCircleRecommendation = {
  id: string;
  name: string;
  desc: string;
  membersText: string;
  memberCount: number;
  joined: boolean;
};

export type HomeCircleRecommendResponse = {
  circle: HomeCircleRecommendation | null;
  insertAfterIndex: number;
};

export type GetHomeFeedInput = {
  categoryId: string;
  channel?: HomeChannel;
  cursor?: string | null;
  limit?: number;
};

export function getHomeCategories(): Promise<HomeCategoriesResponse> {
  if (useMockApi) return getMockHomeCategories();
  return authRequest<HomeCategoriesResponse>("/api/v1/home/categories");
}

export function getHomeFeed({
  categoryId,
  channel = "recommend",
  cursor,
  limit = 20,
}: GetHomeFeedInput): Promise<HomeFeedResponse> {
  if (useMockApi) {
    return getMockHomeFeed({ categoryId, cursor, limit });
  }
  const params = new URLSearchParams({
    categoryId,
    channel,
    limit: String(limit),
  });
  if (cursor) params.set("cursor", cursor);
  return authRequest<HomeFeedResponse>(`/api/v1/home/feed?${params.toString()}`);
}

export function getHomeLeftNav(): Promise<HomeLeftNavResponse> {
  if (useMockApi) return getMockHomeLeftNav();
  return authRequest<HomeLeftNavResponse>("/api/v1/home/left-nav");
}

export function getHomeCircleRecommendation(
  categoryId: string,
): Promise<HomeCircleRecommendResponse> {
  if (useMockApi) return getMockHomeCircleRecommendation(categoryId);
  const params = new URLSearchParams({ categoryId });
  return authRequest<HomeCircleRecommendResponse>(
    `/api/v1/home/circle-recommend?${params.toString()}`,
  );
}
