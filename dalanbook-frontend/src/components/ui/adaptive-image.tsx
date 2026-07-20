import type { ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type AdaptiveImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "alt"> & {
    alt: string;
    fit?: "cover" | "contain";
    fill?: boolean;
    priority?: boolean;
};

/**
 * Shared image defaults for responsive layouts.
 *
 * `fill` is intended for an explicit-sized or aspect-ratio container. Set it
 * to false for article images that should keep their intrinsic proportions.
 */
export function AdaptiveImage({
    alt,
    className,
    decoding = "async",
    fill = true,
    fit = "cover",
    loading,
    priority = false,
    ...props
}: AdaptiveImageProps) {
    return (
        <img
            {...props}
            alt={alt}
            decoding={decoding}
            loading={priority ? "eager" : (loading ?? "lazy")}
            fetchPriority={priority ? "high" : props.fetchPriority}
            className={cn(
                "block max-w-full object-center",
                fill && "h-full w-full min-w-0",
                fit === "contain" ? "object-contain" : "object-cover",
                className,
            )}
        />
    );
}
