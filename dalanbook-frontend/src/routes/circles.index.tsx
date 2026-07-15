import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Plus } from "lucide-react";
import { TopNav } from "@/components/home/TopNav";
import { MobileTopBar } from "@/components/home/MobileTopBar";
import { MobileBottomNav } from "@/components/home/MobileBottomNav";
import { CircleCard } from "@/components/circles/CircleCard";
import { circleCategories } from "@/data/mockCircles";
import { authStore, useAuthUser } from "@/lib/authStore";
import { CreateCircleModal } from "@/components/circles/CreateCircleModal";
import { getCircles, getMyCircles } from "@/lib/dalanbookApi";

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
  const [createOpen, setCreateOpen] = useState(false);
  const user = useAuthUser();
  const {
    data: allCircles = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["dalanbook", "circles"],
    queryFn: () => getCircles(),
  });
  const { data: myCircles = [] } = useQuery({
    queryKey: ["dalanbook", "circles", "mine"],
    queryFn: () => getMyCircles(true),
    enabled: !!user,
  });

  const list = allCircles.filter((c) => {
    if (cat !== "全部" && c.category !== cat) return false;
    if (q && !`${c.name} ${c.desc} ${c.tags.join(" ")}`.toLowerCase().includes(q.toLowerCase()))
      return false;
    return true;
  });

  const featured = allCircles.filter((c) => c.joined).slice(0, 3);

  function handleCreate() {
    if (!user) {
      authStore.openAuth({ tab: "login", action: "创建圈子" });
      return;
    }
    setCreateOpen(true);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <TopNav />
      </div>
      <MobileTopBar />

      <main className="mx-auto max-w-[1240px] px-4 pt-6 pb-28 md:px-6 md:pt-8 md:pb-16">
        {/* Header */}
        <header className="mb-6 flex items-start justify-between gap-4 md:mb-8">
          <div>
            <h1 className="text-[26px] md:text-[30px] font-semibold tracking-[-0.02em] text-foreground">
              圈子发现
            </h1>
            <p className="mt-1.5 text-[14px] text-text-secondary">找到和你做同一件事的人。</p>
          </div>
          <button
            onClick={handleCreate}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[12px] bg-foreground px-3.5 text-[13.5px] font-medium text-white transition-colors hover:bg-[color:var(--action-primary-hover)]"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            创建圈子
          </button>
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
            <span className="text-[12px] text-text-tertiary">{list.length} 个结果</span>
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {list.map((c) => (
                <CircleCard key={c.id} circle={c} />
              ))}
            </div>
          )}
        </section>
      </main>

      <CreateCircleModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <MobileBottomNav />
    </div>
  );
}
