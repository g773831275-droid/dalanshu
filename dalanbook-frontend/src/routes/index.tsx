import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { TopNav } from "@/components/home/TopNav";
import { CategoryBar } from "@/components/home/CategoryBar";
import { LeftNav } from "@/components/home/LeftNav";
import { MasonryFeed } from "@/components/home/MasonryFeed";
import { MobileTopBar } from "@/components/home/MobileTopBar";
import { MobileBottomNav } from "@/components/home/MobileBottomNav";
import { authStore, useAuthUser } from "@/lib/authStore";
import { getHomeCategories } from "@/lib/homeApi";
import { getHomePlacements } from "@/lib/homeApi";
import { HomeOperations } from "@/components/home/HomeOperations";
import type { HomeChannel } from "@/lib/homeUi";

export const Route = createFileRoute("/")({
    component: Home,
});

function Home() {
    const user = useAuthUser();
    const [channel, setChannel] = useState<HomeChannel>("recommend");
    const [categoryId, setCategoryId] = useState("recommend");
    const { data: categoryData, isLoading: categoriesLoading } = useQuery({
        queryKey: ["home", "categories"],
        queryFn: getHomeCategories,
        staleTime: 10 * 60_000,
    });
    const { data: placements } = useQuery({
        queryKey: ["home", "placements"],
        queryFn: getHomePlacements,
        staleTime: 30_000,
        refetchInterval: 60_000,
        retry: false,
    });

    useEffect(() => {
        if (!categoryData) return;
        const categoryExists = categoryData.categories.some(
            (category) => category.id === categoryId,
        );
        if (!categoryExists) setCategoryId(categoryData.defaultId);
    }, [categoryData, categoryId]);

    useEffect(() => {
        if (!user && channel === "following") setChannel("recommend");
    }, [channel, user]);

    const handleChannelChange = (nextChannel: HomeChannel) => {
        if (nextChannel === "following" && !user) {
            authStore.openAuth({ tab: "login", action: "查看关注内容" });
            return;
        }
        setChannel(nextChannel);
    };

    return (
        <div className="min-h-screen bg-background">
            {/* PC 顶部悬浮导航 + 分类栏 */}
            <div className="hidden md:block">
                <TopNav />
                <CategoryBar
                    categories={categoryData?.categories ?? []}
                    activeId={categoryId}
                    isLoading={categoriesLoading}
                    onSelect={setCategoryId}
                />
            </div>

            {/* 移动端顶栏 */}
            <MobileTopBar
                showChannels
                activeChannel={channel}
                onChannelChange={handleChannelChange}
            />

            {/* 内容区 */}
            <div className="mx-auto max-w-[1360px] px-3 pt-3 pb-28 md:flex md:gap-8 md:px-6 md:pt-2 md:pb-16">
                <LeftNav activeChannel={channel} onChannelChange={handleChannelChange} />
                <main className="min-w-0 flex-1">
                    <HomeOperations placements={placements} />
                    <MasonryFeed categoryId={categoryId} channel={channel} />
                </main>
            </div>

            <MobileBottomNav />
        </div>
    );
}
