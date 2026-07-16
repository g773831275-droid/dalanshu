import { useEffect, useRef } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useAuthUser } from "@/lib/authStore";
import {
  getHomeCircleRecommendation,
  getHomeFeed,
  type HomeFeedItem,
} from "@/lib/homeApi";
import type { Post } from "@/data/mockPosts";
import { PostCard } from "./PostCard";
import { CircleRecCard } from "./CircleRecCard";

function toPost(item: HomeFeedItem): Post {
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
    avatarColor: item.author.avatarColor ?? "#5E6B7F",
    useful: item.useful.count,
    usefulLiked: item.useful.liked,
  };
}

export function MasonryFeed({ categoryId }: { categoryId: string }) {
  const user = useAuthUser();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const {
    data,
    isLoading,
    isError,
    isFetchingNextPage,
    isFetchNextPageError,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["home", "feed", categoryId, user?.id ?? "anonymous"],
    queryFn: ({ pageParam }) =>
      getHomeFeed({
        categoryId,
        cursor: pageParam,
        limit: 20,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
    staleTime: 30_000,
  });
  const { data: recommendation } = useQuery({
    queryKey: ["home", "circle-recommend", categoryId, user?.id ?? "anonymous"],
    queryFn: () => getHomeCircleRecommendation(categoryId),
    staleTime: 5 * 60_000,
  });

  const posts = (data?.pages.flatMap((page) => page.items) ?? []).map(toPost);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  if (isLoading) {
    return <div className="py-16 text-center text-sm text-text-tertiary">正在加载帖子…</div>;
  }
  if (isError && posts.length === 0) {
    return (
      <div className="rounded-2xl border border-[color:var(--border)] bg-white/60 p-8 text-center text-sm text-text-secondary">
        <p>帖子加载失败，请稍后重试。</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-4 rounded-[10px] bg-foreground px-4 py-2 text-xs font-medium text-white"
        >
          重新加载
        </button>
      </div>
    );
  }
  if (posts.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-text-tertiary">
        这个频道暂时没有帖子。
      </div>
    );
  }

  return (
    <>
      <div className="columns-2 gap-2.5 md:columns-3 md:gap-4 xl:columns-4 2xl:columns-5">
        {posts.map((post, index) => (
          <div key={post.id} className="contents">
            <PostCard post={post} />
            {recommendation?.circle && index === recommendation.insertAfterIndex ? (
              <CircleRecCard
                id={recommendation.circle.id}
                name={recommendation.circle.name}
                desc={recommendation.circle.desc}
                members={recommendation.circle.membersText}
              />
            ) : null}
          </div>
        ))}
      </div>
      <div ref={loadMoreRef} className="py-6 text-center text-xs text-text-tertiary">
        {isFetchingNextPage ? "正在加载更多…" : null}
        {isFetchNextPageError ? (
          <button
            type="button"
            onClick={() => void fetchNextPage()}
            className="rounded-[10px] border border-[color:var(--border)] bg-white/60 px-3 py-1.5 text-text-secondary"
          >
            加载失败，点击重试
          </button>
        ) : null}
        {!hasNextPage && !isFetchNextPageError ? "已经到底了" : null}
      </div>
    </>
  );
}
