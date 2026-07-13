import logoAsset from "@/assets/logo-dalanbook.jpg.asset.json";

export function Logo({
  size = 28,
  showWordmark = true,
  className = "",
}: {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <a href="/" className={`flex items-center gap-2 ${className}`}>
      <img
        src={logoAsset.url}
        alt="大蓝书"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="rounded-[8px] object-cover"
      />
      {showWordmark && (
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          大蓝书
        </span>
      )}
    </a>
  );
}
