import { circles } from "@/data/mockCircles";
import { posts } from "@/data/mockPosts";
import type {
    HomeCategoriesResponse,
    HomeCircleRecommendResponse,
    HomeFeedItem,
    HomeFeedResponse,
    HomeLeftNavResponse,
    SearchSuggestion,
    SearchSuggestionsResponse,
    HomePlacementsResponse,
} from "@/lib/homeApi";
import adImage from "@/assets/cover-ai-desk.jpg";

const categories: HomeCategoriesResponse = {
    categories: [
        { id: "recommend", name: "推荐", type: "system" },
        { id: "career", name: "职场成长", type: "topic" },
        { id: "ai", name: "AI 工具", type: "topic" },
        { id: "fitness", name: "健身运动", type: "topic" },
        { id: "digital", name: "数码装备", type: "topic" },
        { id: "lifestyle", name: "男士生活", type: "topic" },
        { id: "outdoor", name: "户外兴趣", type: "topic" },
        { id: "reading", name: "阅读写作", type: "topic" },
        { id: "more", name: "更多", type: "system" },
    ],
    defaultId: "recommend",
};

const categoryNames: Record<string, string> = {
    career: "职场成长",
    ai: "AI 工具",
    fitness: "健身运动",
    digital: "数码装备",
    lifestyle: "男士生活",
    outdoor: "户外兴趣",
    reading: "阅读写作",
};

const circleByName = new Map(circles.map((circle) => [circle.name, circle]));

const feedItems: HomeFeedItem[] = posts.map((post, index) => {
    const circle = circleByName.get(post.circle);
    return {
        id: post.id,
        title: post.title,
        tag: post.tag ?? null,
        cover: {
            url: post.cover,
            ratio: post.ratio,
            blurhash: null,
        },
        video: post.video,
        circle: {
            id: post.circleId ?? circle?.id ?? `mock-circle-${index + 1}`,
            name: post.circle,
        },
        author: {
            id: `mock-author-${index + 1}`,
            name: post.author,
            avatarUrl: post.avatarUrl ?? null,
            avatarColor: post.avatarColor,
        },
        useful: {
            count: post.useful,
            liked: post.usefulLiked ?? false,
        },
        createdAt: new Date(Date.UTC(2026, 6, 16, 8, 0, 0) - index * 60 * 60 * 1000).toISOString(),
    };
});

function delay<T>(value: T): Promise<T> {
    return new Promise((resolve) => globalThis.setTimeout(() => resolve(value), 180));
}

const placements: HomePlacementsResponse = {
    popupAd: {
        id: "mock-ad-summer-2026",
        version: 2,
        title: "把灵感放到桌面上",
        description: "精选桌搭与效率工具，给你的下一次创作留出空间。",
        imageUrl: adImage,
        ctaText: "看看桌搭",
        targetUrl: "/topics",
    },
    pinnedNotice: {
        id: "mock-notice-release",
        title: "大蓝书首页运营位已上线",
        summary: "欢迎用置顶公告和广告弹窗，把重要内容送到首页。",
        content:
            "首页运营位支持排期、优先级和手动上下线。广告图片、公告正文与站内链接都会经过保存校验。",
        ctaText: null,
        targetUrl: null,
        publishedAt: "2026-07-21T08:00:00Z",
    },
};

function memberCount(text: string): number {
    const value = Number.parseFloat(text.replaceAll(",", ""));
    return Number.isFinite(value) ? Math.round(value * (text.includes("万") ? 10_000 : 1)) : 0;
}

function cursorOffset(cursor?: string | null): number {
    if (!cursor) return 0;
    const match = /^mock-(\d+)$/.exec(cursor);
    return match ? Number(match[1]) : 0;
}

export function getMockHomeCategories(): Promise<HomeCategoriesResponse> {
    return delay(categories);
}

export function getMockHomePlacements(): Promise<HomePlacementsResponse> {
    return delay(placements);
}

export function getMockSearchSuggestions(query: string): Promise<SearchSuggestionsResponse> {
    const keyword = query.trim();
    if (!keyword) {
        return delay({
            suggestions: ["AI Agent", "职场复盘", "桌搭"].map((text) => ({
                type: "hot" as const,
                id: null,
                text,
            })),
        });
    }

    const normalizedKeyword = keyword.toLocaleLowerCase("zh-CN");
    const suggestions: SearchSuggestion[] = [
        { type: "keyword", id: null, text: keyword },
        ...circles
            .filter((circle) => circle.name.toLocaleLowerCase("zh-CN").includes(normalizedKeyword))
            .slice(0, 4)
            .map((circle) => ({ type: "circle" as const, id: circle.id, text: circle.name })),
        ...posts
            .filter((post) => post.title.toLocaleLowerCase("zh-CN").includes(normalizedKeyword))
            .slice(0, 5)
            .map((post) => ({ type: "post" as const, id: post.id, text: post.title })),
    ];

    return delay({ suggestions: suggestions.slice(0, 10) });
}

export function getMockHomeFeed(input: {
    categoryId: string;
    cursor?: string | null;
    limit: number;
}): Promise<HomeFeedResponse> {
    const categoryName = categoryNames[input.categoryId];
    const categoryExists = categories.categories.some(
        (category) => category.id === input.categoryId,
    );
    const filtered = !categoryExists
        ? []
        : categoryName
          ? feedItems.filter(
                (item) => circleByName.get(item.circle.name)?.category === categoryName,
            )
          : feedItems;
    const offset = cursorOffset(input.cursor);
    const items = filtered.slice(offset, offset + input.limit);
    const nextOffset = offset + items.length;
    const hasMore = nextOffset < filtered.length;
    return delay({
        items,
        nextCursor: hasMore ? `mock-${nextOffset}` : null,
        hasMore,
    });
}

export function getMockHomeLeftNav(): Promise<HomeLeftNavResponse> {
    return delay({
        shortcuts: [
            { id: "home", label: "首页", icon: "home", href: "/", badge: null },
            { id: "publish", label: "发布", icon: "plus", href: "/publish", badge: null },
        ],
        myCircles: circles
            .filter((circle) => circle.joined)
            .map((circle) => ({
                id: circle.id,
                name: circle.name,
                avatarUrl: circle.cover,
                unread: 0,
            })),
    });
}

export function getMockHomeCircleRecommendation(
    categoryId: string,
): Promise<HomeCircleRecommendResponse> {
    const categoryName = categoryNames[categoryId];
    const circle = circles.find((item) => !categoryName || item.category === categoryName);
    return delay({
        circle: circle
            ? {
                  id: circle.id,
                  name: circle.name,
                  desc: circle.desc,
                  membersText: `${circle.members}人正在讨论`,
                  memberCount: memberCount(circle.members),
                  joined: circle.joined ?? false,
              }
            : null,
        insertAfterIndex: 6,
    });
}
