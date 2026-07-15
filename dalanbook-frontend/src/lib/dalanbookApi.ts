import type { Post, PostTag } from "@/data/mockPosts";
import { posts as fallbackPosts } from "@/data/mockPosts";
import aiDesk from "@/assets/cover-ai-desk.jpg";
import gym from "@/assets/cover-gym.jpg";
import deskSetup from "@/assets/cover-desk-setup.jpg";
import portraitPm from "@/assets/cover-portrait-pm.jpg";
import charts from "@/assets/cover-charts.jpg";
import outdoor from "@/assets/cover-outdoor.jpg";
import edc from "@/assets/cover-edc.jpg";
import notebook from "@/assets/cover-notebook.jpg";
import meal from "@/assets/cover-meal.jpg";
import gadgets from "@/assets/cover-gadgets.jpg";
import code from "@/assets/cover-code.jpg";

const coverAssets: Record<string, string> = {
  "cover-ai-desk": aiDesk,
  "cover-gym": gym,
  "cover-desk-setup": deskSetup,
  "cover-portrait-pm": portraitPm,
  "cover-charts": charts,
  "cover-outdoor": outdoor,
  "cover-edc": edc,
  "cover-notebook": notebook,
  "cover-meal": meal,
  "cover-gadgets": gadgets,
  "cover-code": code,
};

type ApiResponse<T> = { code: number; msg: string; data: T };

export type ApiPost = {
  id: string;
  circleId: string;
  circle: string;
  title: string;
  content: string;
  coverKey: string;
  ratio: Post["ratio"];
  tag?: PostTag;
  topics: string[];
  authorId: string;
  author: string;
  avatarColor: string;
  useful: number;
  location?: string;
  visibility: "public" | "circle";
  createTime: string;
};

export type PublishPostInput = {
  title: string;
  content: string;
  circleId: string;
  coverKey: string;
  imageRatio: Post["ratio"];
  postTag: PostTag;
  topics: string[];
  authorId?: string;
  authorName?: string;
  location?: string;
  visibility: "public" | "circle";
};

function toPost(post: ApiPost): Post {
  return {
    id: post.id,
    cover: coverAssets[post.coverKey] ?? aiDesk,
    ratio: post.ratio,
    tag: post.tag,
    circle: post.circle,
    title: post.title,
    author: post.author,
    avatarColor: post.avatarColor,
    useful: post.useful,
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = typeof window === "undefined" ? "http://localhost:8080" : "";
  const response = await fetch(baseUrl + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const result = (await response.json()) as ApiResponse<T>;
  if (!response.ok || result.code !== 200) {
    throw new Error(result.msg || "请求失败");
  }
  return result.data;
}

export async function getPost(id: string): Promise<Post> {
  return toPost(await request<ApiPost>(`/api/dalanbook/posts/${encodeURIComponent(id)}`));
}

export async function getFeed(): Promise<Post[]> {
  if (typeof window === "undefined") return fallbackPosts;
  try {
    const data = await request<ApiPost[]>("/api/dalanbook/feed");
    return data.length ? data.map(toPost) : fallbackPosts;
  } catch {
    return fallbackPosts;
  }
}

export async function publishPost(input: PublishPostInput): Promise<ApiPost> {
  return request<ApiPost>("/api/dalanbook/posts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
