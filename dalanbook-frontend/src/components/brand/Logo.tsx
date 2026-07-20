import logoAsset from "@/assets/logo-dalanbook-blue.png";
import { AdaptiveImage } from "@/components/ui/adaptive-image";

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
            <AdaptiveImage
                src={logoAsset}
                alt="大蓝树"
                width={size}
                height={size}
                fill={false}
                priority
                style={{ width: size, height: size }}
                className="shrink-0 rounded-[8px]"
            />
            {showWordmark && (
                <span className="text-[15px] font-semibold tracking-tight text-foreground">
                    大蓝树
                </span>
            )}
        </a>
    );
}
