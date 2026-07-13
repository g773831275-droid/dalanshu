import aiDesk from "@/assets/cover-ai-desk.jpg";
import gym from "@/assets/cover-gym.jpg";
import deskSetup from "@/assets/cover-desk-setup.jpg";
import outdoor from "@/assets/cover-outdoor.jpg";
import edc from "@/assets/cover-edc.jpg";
import gadgets from "@/assets/cover-gadgets.jpg";
import charts from "@/assets/cover-charts.jpg";
import meal from "@/assets/cover-meal.jpg";
import notebook from "@/assets/cover-notebook.jpg";
import portraitPm from "@/assets/cover-portrait-pm.jpg";
import planning from "@/assets/cover-planning.jpg";
import code from "@/assets/cover-code.jpg";

export type Circle = {
  id: string;
  name: string;
  cover: string;
  desc: string;
  members: string;
  posts: string;
  category: string;
  joined?: boolean;
  tags: string[];
};

export const circleCategories = [
  "全部",
  "职场成长",
  "AI 工具",
  "健身运动",
  "数码装备",
  "男士生活",
  "户外兴趣",
  "阅读写作",
];

export const circles: Circle[] = [
  {
    id: "ai-tools",
    name: "AI 工具圈",
    cover: aiDesk,
    desc: "分享 AI 工具、自动化流程、Prompt 与真实的效率经验。",
    members: "12.8 万",
    posts: "3,240 条讨论",
    category: "AI 工具",
    joined: true,
    tags: ["AI", "效率", "自动化"],
  },
  {
    id: "career-growth",
    name: "职场成长圈",
    cover: portraitPm,
    desc: "从入职到晋升，聊聊真实的选择、复盘与反常识经验。",
    members: "8.6 万",
    posts: "5,102 条讨论",
    category: "职场成长",
    joined: true,
    tags: ["职场", "晋升", "复盘"],
  },
  {
    id: "fitness-cut",
    name: "健身减脂圈",
    cover: gym,
    desc: "训练计划、饮食安排与身材数据，只讲能被复现的方法。",
    members: "6.2 万",
    posts: "2,880 条讨论",
    category: "健身运动",
    tags: ["减脂", "训练", "饮食"],
  },
  {
    id: "desk-setup",
    name: "数码装备圈",
    cover: deskSetup,
    desc: "键鼠、显示器、耳机、桌搭。真实使用一年后再评价。",
    members: "9.4 万",
    posts: "4,650 条讨论",
    category: "数码装备",
    joined: true,
    tags: ["桌搭", "外设", "评测"],
  },
  {
    id: "gentlemen-life",
    name: "男士生活圈",
    cover: edc,
    desc: "穿搭、护理、EDC 与生活方式。克制、耐用、不猎奇。",
    members: "4.1 万",
    posts: "1,920 条讨论",
    category: "男士生活",
    tags: ["穿搭", "EDC", "护理"],
  },
  {
    id: "outdoor",
    name: "户外兴趣圈",
    cover: outdoor,
    desc: "徒步、露营、骑行的路线笔记与装备清单。",
    members: "3.7 万",
    posts: "1,410 条讨论",
    category: "户外兴趣",
    tags: ["徒步", "露营", "装备"],
  },
  {
    id: "gadget-lab",
    name: "小众数码实验室",
    cover: gadgets,
    desc: "偏冷门的电子产品与实用小工具的实测报告。",
    members: "2.3 万",
    posts: "860 条讨论",
    category: "数码装备",
    tags: ["小众", "评测"],
  },
  {
    id: "product-manager",
    name: "产品经理成长",
    cover: charts,
    desc: "需求判断、方案权衡、跨团队协作的真实案例复盘。",
    members: "5.8 万",
    posts: "2,240 条讨论",
    category: "职场成长",
    tags: ["产品", "方法论"],
  },
  {
    id: "fat-loss-meal",
    name: "减脂饮食日记",
    cover: meal,
    desc: "工作日的减脂餐、便利店选品与外食策略。",
    members: "3.0 万",
    posts: "1,180 条讨论",
    category: "健身运动",
    tags: ["饮食", "外食"],
  },
  {
    id: "reading-writing",
    name: "阅读与写作",
    cover: notebook,
    desc: "读书笔记、写作训练、思维方法的长期实践。",
    members: "2.7 万",
    posts: "1,540 条讨论",
    category: "阅读写作",
    tags: ["阅读", "写作", "笔记"],
  },
  {
    id: "solo-planning",
    name: "个人年度规划",
    cover: planning,
    desc: "OKR、复盘、时间账、系统化目标管理的真实模板。",
    members: "1.9 万",
    posts: "710 条讨论",
    category: "职场成长",
    tags: ["规划", "OKR"],
  },
  {
    id: "vibe-coding",
    name: "独立开发者圈",
    cover: code,
    desc: "副业、SaaS、AI 编程与从 0 到 1 的产品实践。",
    members: "3.4 万",
    posts: "1,660 条讨论",
    category: "AI 工具",
    tags: ["开发", "副业", "SaaS"],
  },
];
