import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Hash } from "lucide-react";
import { TopNav } from "@/components/home/TopNav";
import { MobileTopBar } from "@/components/home/MobileTopBar";
import { MobileBottomNav } from "@/components/home/MobileBottomNav";
import { PostCard } from "@/components/home/PostCard";
import { getTopic } from "@/lib/dalanbookApi";

export const Route = createFileRoute("/topics/$slug")({ component: TopicPage });

function TopicPage() {
  const { slug } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["dalanbook", "topic", slug],
    queryFn: () => getTopic(slug),
  });
  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <TopNav />
      </div>
      <MobileTopBar />
      <main className="mx-auto max-w-[1200px] px-4 pb-28 pt-8 md:px-6 md:pb-16">
        <Link to="/topics" className="inline-flex items-center gap-1 text-sm text-text-secondary">
          <ArrowLeft className="h-4 w-4" />
          全部话题
        </Link>
        {isLoading ? (
          <p className="py-16 text-center text-sm text-text-tertiary">正在加载话题…</p>
        ) : error || !data ? (
          <p className="py-16 text-center text-sm text-text-secondary">话题不存在或加载失败。</p>
        ) : (
          <>
            <header className="mt-5 rounded-[20px] border border-[color:var(--border)] bg-white/70 p-6">
              <h1 className="flex items-center gap-2 text-[26px] font-semibold">
                <Hash className="h-6 w-6" />
                {data.topic.name}
              </h1>
              <p className="mt-2 text-sm text-text-secondary">{data.topic.description}</p>
              <p className="mt-4 text-xs text-text-tertiary">{data.topic.postCount} 篇帖子</p>
            </header>
            <div className="mt-6 columns-2 gap-2.5 md:columns-3 md:gap-4 xl:columns-4">
              {data.posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </>
        )}
      </main>
      <MobileBottomNav />
    </div>
  );
}
