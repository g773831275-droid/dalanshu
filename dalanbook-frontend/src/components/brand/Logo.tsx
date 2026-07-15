import logoAsset from "@/assets/logo-dalanbook-blue.png";

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
        src={logoAsset}
        alt="大蓝树"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="rounded-[8px] object-cover"
      />
      {showWordmark && (
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          大蓝树
        </span>
      )}
    </a>
  );
}
