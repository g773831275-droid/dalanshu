const categories = [
  "推荐",
  "职场成长",
  "AI 工具",
  "健身运动",
  "数码装备",
  "男士生活",
  "户外兴趣",
  "更多",
];

export function CategoryBar() {
  return (
    <div className="mx-auto max-w-[1240px] px-4">
      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto py-4">
        {categories.map((c, i) => (
          <button
            key={c}
            className={
              "h-8 shrink-0 rounded-full px-3.5 text-[13px] font-medium transition-colors " +
              (i === 0
                ? "bg-foreground text-white"
                : "border border-[color:var(--border)] bg-white/50 text-text-secondary hover:text-foreground")
            }
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
