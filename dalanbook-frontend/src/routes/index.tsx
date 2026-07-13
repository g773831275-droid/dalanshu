import { createFileRoute } from "@tanstack/react-router";
import { TopNav } from "@/components/home/TopNav";
import { CategoryBar } from "@/components/home/CategoryBar";
import { LeftNav } from "@/components/home/LeftNav";
import { MasonryFeed } from "@/components/home/MasonryFeed";
import { MobileTopBar } from "@/components/home/MobileTopBar";
import { MobileBottomNav } from "@/components/home/MobileBottomNav";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* PC 顶部悬浮导航 + 分类栏 */}
      <div className="hidden md:block">
        <TopNav />
        <CategoryBar />
      </div>

      {/* 移动端顶栏 */}
      <MobileTopBar />

      {/* 内容区 */}
      <div className="mx-auto max-w-[1360px] px-3 pt-3 pb-28 md:flex md:gap-8 md:px-6 md:pt-2 md:pb-16">
        <LeftNav />
        <main className="min-w-0 flex-1">
          <MasonryFeed />
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
