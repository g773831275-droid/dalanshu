import { useQuery } from "@tanstack/react-query";
import { circleRec } from "@/data/mockPosts";
import { getFeed } from "@/lib/dalanbookApi";
import { PostCard } from "./PostCard";
import { CircleRecCard } from "./CircleRecCard";

export function MasonryFeed() {
  const {
    data: posts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["dalanbook", "feed"],
    queryFn: getFeed,
    staleTime: 30_000,
  });

  if (isLoading)
    return <div className="py-16 text-center text-sm text-text-tertiary">正在加载帖子…</div>;
  if (error)
    return (
      <div className="rounded-2xl border border-[color:var(--border)] bg-white/60 p-8 text-center text-sm text-text-secondary">
        帖子加载失败，请确认后端服务与数据库迁移已启动。
      </div>
    );
  if (!posts.length)
    return (
      <div className="py-16 text-center text-sm text-text-tertiary">
        还没有帖子，去发布第一篇吧。
      </div>
    );

  return (
    <div className="columns-2 gap-2.5 md:columns-3 md:gap-4 xl:columns-4 2xl:columns-5">
      {posts.map((post, i) => (
        <div key={post.id} className="contents">
          <PostCard post={post} />
          {i === 6 && (
            <CircleRecCard
              name={circleRec.name}
              desc={circleRec.desc}
              members={circleRec.members}
            />
          )}
        </div>
      ))}
    </div>
  );
}
