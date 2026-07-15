import aiDesk from "@/assets/cover-ai-desk.jpg";
import gym from "@/assets/cover-gym.jpg";
import deskSetup from "@/assets/cover-desk-setup.jpg";
import portraitPm from "@/assets/cover-portrait-pm.jpg";
import charts from "@/assets/cover-charts.jpg";
import outdoor from "@/assets/cover-outdoor.jpg";
import edc from "@/assets/cover-edc.jpg";
import notebook from "@/assets/cover-notebook.jpg";
import meal from "@/assets/cover-meal.jpg";
import gadgets from "@/assets/cover-gadgets.jpg";
import code from "@/assets/cover-code.jpg";

export type PostTag = "经验" | "提问" | "测评" | "复盘" | "大神分享" | "清单";

export type Post = {
  id: string;
  circleId?: string;
  cover: string;
  ratio: "1/1" | "4/5" | "3/4" | "4/3" | "16/9";
  tag?: PostTag;
  circle: string;
  title: string;
  author: string;
  avatarColor: string;
  useful: number;
};

// Simple deterministic avatar color palette (semantic tokens not required for tiny circles)
const c = {
  blue: "#245BDB",
  navy: "#0D1B33",
  teal: "#1F9D6A",
  amber: "#D88B16",
  rose: "#D94B4B",
  slate: "#5E6B7F",
};

export const posts: Post[] = [
  {
    id: "p1",
    cover: aiDesk,
    ratio: "4/5",
    tag: "经验",
    circle: "AI 工具圈",
    title: "我用了 30 天 AI Agent，真正有用的是这 4 个场景",
    author: "林深",
    avatarColor: c.blue,
    useful: 328,
  },
  {
    id: "p2",
    cover: gym,
    ratio: "3/4",
    tag: "复盘",
    circle: "健身减脂圈",
    title: "从 92kg 到 78kg，上班族减脂真实复盘",
    author: "Chris",
    avatarColor: c.teal,
    useful: 486,
  },
  {
    id: "p3",
    cover: deskSetup,
    ratio: "1/1",
    tag: "测评",
    circle: "数码装备圈",
    title: "3000 元预算做一套安静高效的桌搭，我踩过的坑",
    author: "老周的桌面",
    avatarColor: c.navy,
    useful: 188,
  },
  {
    id: "p4",
    cover: portraitPm,
    ratio: "4/5",
    tag: "大神分享",
    circle: "职场成长圈",
    title: "前大厂产品总监：普通人如何判断行业机会？",
    author: "周航",
    avatarColor: c.blue,
    useful: 612,
  },
  {
    id: "p5",
    cover: charts,
    ratio: "4/3",
    tag: "清单",
    circle: "AI 工具圈",
    title: "整理了 12 个真正提升效率的 AI 工具，附使用建议",
    author: "效率笔记",
    avatarColor: c.slate,
    useful: 274,
  },
  {
    id: "p6",
    cover: outdoor,
    ratio: "3/4",
    tag: "经验",
    circle: "户外兴趣圈",
    title: "第一次徒步 30km，我准备了这些装备",
    author: "山野川",
    avatarColor: c.teal,
    useful: 92,
  },
  {
    id: "p7",
    cover: edc,
    ratio: "4/5",
    tag: "清单",
    circle: "男士生活圈",
    title: "工作五年，我留下的日常随身物 8 件",
    author: "简子",
    avatarColor: c.amber,
    useful: 156,
  },
  {
    id: "p8",
    cover: notebook,
    ratio: "4/3",
    tag: "经验",
    circle: "职场成长圈",
    title: "手写复盘坚持 100 天，我总结出的一套模板",
    author: "夜航船",
    avatarColor: c.navy,
    useful: 341,
  },
  {
    id: "p9",
    cover: meal,
    ratio: "1/1",
    tag: "经验",
    circle: "健身减脂圈",
    title: "一周备餐指南：省时、便宜、真的能坚持",
    author: "Kai",
    avatarColor: c.teal,
    useful: 205,
  },
  {
    id: "p10",
    cover: gadgets,
    ratio: "4/5",
    tag: "测评",
    circle: "数码装备圈",
    title: "两年真实使用后，我为什么把耳机换回了有线",
    author: "耳边评测",
    avatarColor: c.rose,
    useful: 89,
  },
  {
    id: "p11",
    cover: code,
    ratio: "3/4",
    tag: "提问",
    circle: "AI 工具圈",
    title: "非程序员想学 Cursor 做小工具，从哪里入门合适？",
    author: "蓝书用户0827",
    avatarColor: c.slate,
    useful: 46,
  },
  {
    id: "p13",
    cover: aiDesk,
    ratio: "1/1",
    tag: "经验",
    circle: "AI 工具圈",
    title: "把每周例会用 AI 自动纪要，我们省了 4 小时",
    author: "阿泽",
    avatarColor: c.blue,
    useful: 134,
  },
  {
    id: "p14",
    cover: outdoor,
    ratio: "4/5",
    tag: "复盘",
    circle: "户外兴趣圈",
    title: "露营三年，我最后只留下了这 6 件装备",
    author: "山野川",
    avatarColor: c.teal,
    useful: 261,
  },
  {
    id: "p15",
    cover: charts,
    ratio: "16/9",
    tag: "大神分享",
    circle: "职场成长圈",
    title: "十年 HR 视角：简历里最容易被忽略的加分项",
    author: "陈老师",
    avatarColor: c.navy,
    useful: 528,
  },
  {
    id: "p16",
    cover: notebook,
    ratio: "1/1",
    tag: "提问",
    circle: "男士生活圈",
    title: "30 岁以后你还坚持写日记吗？会记些什么？",
    author: "蓝书用户0368",
    avatarColor: c.slate,
    useful: 68,
  },
  {
    id: "p17",
    cover: deskSetup,
    ratio: "4/5",
    tag: "清单",
    circle: "数码装备圈",
    title: "小户型也能拥有的高效办公桌搭清单",
    author: "老周的桌面",
    avatarColor: c.navy,
    useful: 173,
  },
  {
    id: "p18",
    cover: meal,
    ratio: "3/4",
    tag: "复盘",
    circle: "健身减脂圈",
    title: "外食党减脂 60 天：便利店也能吃出饱腹感",
    author: "Kai",
    avatarColor: c.teal,
    useful: 219,
  },
];

export const circleRec = {
  name: "AI 工具圈",
  members: "12.8 万人正在讨论",
  desc: "分享 AI 工具、自动化流程与真实效率经验",
};
