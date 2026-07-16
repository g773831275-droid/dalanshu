import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { TopNav } from "@/components/home/TopNav";
import { MobileTopBar } from "@/components/home/MobileTopBar";
import { MobileBottomNav } from "@/components/home/MobileBottomNav";
import { CircleCard } from "@/components/circles/CircleCard";
import { circleCategories } from "@/data/mockCircles";
import { useAuthUser } from "@/lib/authStore";
import { getCirclePage, getMyCircles } from "@/lib/dalanbookApi";

const PAGE_SIZE = 8;

export const Route = createFileRoute("/circles/")({
  head: () => ({
    meta: [
      { title: "圈子发现 · 大蓝书" },
      {
        name: "description",
        content:
          "浏览大蓝书上活跃的兴趣圈层：职场成长、AI 工具、健身运动、数码装备、男士生活与户外兴趣。",
      },
      { property: "og:title", content: "圈子发现 · 大蓝书" },
      {
        property: "og:description",
        content: "找到和你做同一件事的人。",
      },
    ],
  }),
  component: CirclesPage,
});

function CirclesPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("全部");
  const user = useAuthUser();
  const {
    data: circlePages,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["dalanbook", "circles", "collection", cat],
    queryFn: ({ pageParam }) => getCirclePage({
      category: cat === "全部" ? undefined : cat,
      cursor: pageParam,
      limit: PAGE_SIZE,
    }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.hasMore
      ? (lastPage.nextCursor ?? undefined)
      : undefined,
  });
  const { data: myCircles = [] } = useQuery({
    queryKey: ["dalanbook", "circles", "mine"],
    queryFn: () => getMyCircles(true),
    enabled: !!user,
  });

  const allCircles = circlePages?.pages.flatMap((page) => page.items) ?? [];
  const list = allCircles.filter((c) => {
    if (q && !`${c.name} ${c.desc} ${c.tags.join(" ")}`.toLowerCase().includes(q.toLowerCase()))
      return false;
    return true;
  });

  const featured = allCircles.filter((c) => c.joined).slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <TopNav />
      </div>
      <MobileTopBar />

      <main className="mx-auto max-w-[1240px] px-4 pt-6 pb-28 md:px-6 md:pt-8 md:pb-16">
        {/* Header */}
        <header className="mb-6 md:mb-8">
          <div>
            <h1 className="text-[26px] md:text-[30px] font-semibold tracking-[-0.02em] text-foreground">
              圈子发现
            </h1>
            <p className="mt-1.5 text-[14px] text-text-secondary">找到和你做同一件事的人。</p>
          </div>
        </header>

        {/* Search */}
        <div className="relative mb-4 max-w-[520px]">
          <Search
            className="absolute left-3.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-text-tertiary"
            strokeWidth={1.75}
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="text"
            placeholder="搜索圈子名称、话题、标签"
            className="h-11 w-full rounded-[12px] border border-[color:var(--border-default)] bg-white/60 pl-10 pr-3 text-[14px] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] placeholder:text-text-tertiary focus:border-black/30 focus:outline-none focus:ring-[3px] focus:ring-black/5"
          />
        </div>

        {/* Category filters */}
        <div className="no-scrollbar mb-8 flex items-center gap-1.5 overflow-x-auto">
          {circleCategories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={
                "h-8 shrink-0 rounded-full px-3.5 text-[13px] font-medium transition-colors " +
                (cat === c
                  ? "bg-foreground text-white"
                  : "border border-[color:var(--border)] bg-white/50 text-text-secondary hover:text-foreground")
              }
            >
              {c}
            </button>
          ))}
        </div>

        {/* My created circles */}
        {cat === "全部" && !q && myCircles.length > 0 && (
          <section className="mb-10">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                我创建的
              </h2>
              <span className="text-[12px] text-text-tertiary">{myCircles.length} 个圈子</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {myCircles.map((c) => (
                <CircleCard key={c.id} circle={c} compact />
              ))}
            </div>
          </section>
        )}

        {/* Featured / joined strip */}
        {cat === "全部" && !q && featured.length > 0 && (
          <section className="mb-10">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                你已加入
              </h2>
              <span className="text-[12px] text-text-tertiary">{featured.length} 个圈子</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((c) => (
                <CircleCard key={c.id} circle={c} compact />
              ))}
            </div>
          </section>
        )}

        {/* All circles */}
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
              {cat === "全部" ? "推荐圈子" : cat}
            </h2>
            <span className="text-[12px] text-text-tertiary">已加载 {list.length} 个结果</span>
          </div>

          {isLoading ? (
            <div className="rounded-[16px] border border-[color:var(--border)] bg-white/60 p-10 text-center text-[13px] text-text-tertiary">
              正在加载圈子…
            </div>
          ) : error ? (
            <div className="rounded-[16px] border border-[color:var(--border)] bg-white/60 p-10 text-center text-[13px] text-text-secondary">
              圈子加载失败，请稍后重试。
            </div>
          ) : list.length === 0 ? (
            <div className="rounded-[16px] border border-[color:var(--border)] bg-white/60 p-10 text-center text-[13px] text-text-tertiary">
              没有找到匹配的圈子。
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {list.map((c) => (
                  <CircleCard key={c.id} circle={c} />
                ))}
              </div>
              {hasNextPage || isFetchNextPageError ? (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    disabled={isFetchingNextPage}
                    onClick={() => void fetchNextPage()}
                    className="h-10 rounded-[12px] border border-[color:var(--border-default)] bg-white/60 px-5 text-[13px] font-medium text-text-secondary transition-colors hover:text-foreground disabled:opacity-60"
                  >
                    {isFetchingNextPage
                      ? "正在加载更多…"
                      : isFetchNextPageError
                        ? "加载失败，点击重试"
                        : "加载更多圈子"}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>
      </main>

      <MobileBottomNav />
    </div>
  );
}
