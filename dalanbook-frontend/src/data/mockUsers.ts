export type MockUser = {
  id: string;
  name: string;
  avatarColor: string;
  bio: string;
  location: string;
  joinedAt: string;
  followers: string;
  following: number;
  worksCount: number;
  tags: string[];
  joinedCircleIds: string[];
};

export const users: MockUser[] = [
  {
    id: "me",
    name: "我",
    avatarColor: "#245BDB",
    bio: "记录成长里那些真实的选择与复盘。",
    location: "上海 · 徐汇",
    joinedAt: "2024 年 3 月",
    followers: "1,286",
    following: 132,
    worksCount: 24,
    tags: ["产品", "效率", "AI", "阅读"],
    joinedCircleIds: ["ai-tools", "career-growth", "desk-setup"],
  },
  {
    id: "lin-shen",
    name: "林深",
    avatarColor: "#245BDB",
    bio: "AI 工具重度用户 · 每周复盘一次。",
    location: "北京 · 海淀",
    joinedAt: "2023 年 11 月",
    followers: "4.2k",
    following: 86,
    worksCount: 128,
    tags: ["AI", "自动化", "写作"],
    joinedCircleIds: ["ai-tools", "vibe-coding", "reading-writing"],
  },
  {
    id: "zhou-hang",
    name: "周航",
    avatarColor: "#245BDB",
    bio: "前大厂产品总监，现在做一件更小但更长的事。",
    location: "杭州 · 西湖",
    joinedAt: "2024 年 1 月",
    followers: "8.9k",
    following: 45,
    worksCount: 76,
    tags: ["产品", "职场", "方法论"],
    joinedCircleIds: ["career-growth", "product-manager"],
  },
  {
    id: "kai",
    name: "Kai",
    avatarColor: "#1F9D6A",
    bio: "外食党减脂中，只吃能坚持的东西。",
    location: "深圳 · 南山",
    joinedAt: "2024 年 5 月",
    followers: "2.1k",
    following: 210,
    worksCount: 41,
    tags: ["减脂", "饮食", "外食"],
    joinedCircleIds: ["fitness-cut", "fat-loss-meal"],
  },
  {
    id: "ye-hang-chuan",
    name: "夜航船",
    avatarColor: "#0D1B33",
    bio: "手写复盘 · 长期主义 · 读书笔记。",
    location: "南京 · 鼓楼",
    joinedAt: "2023 年 8 月",
    followers: "3.4k",
    following: 68,
    worksCount: 152,
    tags: ["阅读", "写作", "复盘"],
    joinedCircleIds: ["reading-writing", "career-growth", "solo-planning"],
  },
];

export function findUser(id: string): MockUser | undefined {
  return users.find((u) => u.id === id);
}
