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
        <a href="/" aria-label="大蓝岛" className={`flex items-center gap-2 ${className}`}>
            <svg
                viewBox="0 0 48 48"
                width={size}
                height={size}
                style={{ width: size, height: size }}
                className="shrink-0"
                aria-hidden="true"
                focusable="false"
            >
                <rect width="48" height="48" rx="13" fill="#A8DDF4" />
                <circle cx="34" cy="14" r="4" fill="#E7FBF5" />
                <path
                    d="M10 31c3-7 9-11 16-11 5 0 9 2 12 6-3 0-6 2-8 4-4-2-8-2-12 0-3 2-5 2-8 1Z"
                    fill="#0876B9"
                />
                <path
                    d="M10 34c4 2 8 2 12 0 4-2 8-2 12 0 2 1 3 1 4 1"
                    fill="none"
                    stroke="#F4FFFD"
                    strokeLinecap="round"
                    strokeWidth="2.5"
                />
            </svg>
            {showWordmark && (
                <span className="text-[15px] font-semibold text-foreground">大蓝岛</span>
            )}
        </a>
    );
}
