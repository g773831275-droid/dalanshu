import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Hash } from "lucide-react";
import { TopNav } from "@/components/home/TopNav";
import { MobileTopBar } from "@/components/home/MobileTopBar";
import { MobileBottomNav } from "@/components/home/MobileBottomNav";
import { getTopics } from "@/lib/dalanbookApi";

export const Route = createFileRoute("/topics/")({
  head: () => ({ meta: [{ title: "话题广场 · 大蓝书" }] }),
  component: TopicsPage,
});

function TopicsPage() {
  const {
    data: topics = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["dalanbook", "topics"],
    queryFn: getTopics,
  });
  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <TopNav />
      </div>
      <MobileTopBar />
      <main className="mx-auto max-w-[1000px] px-4 pb-28 pt-8 md:px-6 md:pb-16">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em]">话题广场</h1>
        <p className="mt-1 text-sm text-text-secondary">
          从一个具体话题，找到正在实践同一件事的人。
        </p>
        {isLoading ? (
          <p className="py-16 text-center text-sm text-text-tertiary">正在加载话题…</p>
        ) : error ? (
          <p className="py-16 text-center text-sm text-text-secondary">
            话题加载失败，请稍后重试。
          </p>
        ) : topics.length === 0 ? (
          <p className="py-16 text-center text-sm text-text-tertiary">
            发布帖子并添加话题后，这里会自动出现。
          </p>
        ) : (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic) => (
              <Link
                key={topic.id}
                to="/topics/$slug"
                params={{ slug: topic.slug }}
                className="rounded-[16px] border border-[color:var(--border)] bg-white/70 p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-floating)]"
              >
                <div className="flex items-center gap-2 font-semibold">
                  <Hash className="h-4 w-4" />
                  {topic.name}
                </div>
                <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-text-secondary">
                  {topic.description}
                </p>
                <p className="mt-4 text-xs text-text-tertiary">{topic.postCount} 篇帖子</p>
              </Link>
            ))}
          </div>
        )}
      </main>
      <MobileBottomNav />
    </div>
  );
}
