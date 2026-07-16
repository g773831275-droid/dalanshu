import type { HomeCategory } from "@/lib/homeApi";

export function CategoryBar({
  categories,
  activeId,
  isLoading,
  onSelect,
}: {
  categories: HomeCategory[];
  activeId: string;
  isLoading: boolean;
  onSelect: (categoryId: string) => void;
}) {
  return (
    <div className="mx-auto max-w-[1240px] px-4">
      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto py-4">
        {isLoading && categories.length === 0 ? (
          <div className="h-8 w-64 animate-pulse rounded-full bg-black/[0.05]" aria-label="正在加载分类" />
        ) : null}
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category.id)}
            className={
              "h-8 shrink-0 rounded-full px-3.5 text-[13px] font-medium transition-colors " +
              (category.id === activeId
                ? "bg-foreground text-white"
                : "border border-[color:var(--border)] bg-white/50 text-text-secondary hover:text-foreground")
            }
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
}
