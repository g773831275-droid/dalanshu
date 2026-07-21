import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronRight, ExternalLink, Megaphone } from "lucide-react";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { HomePinnedNotice, HomePlacementsResponse, HomePopupAd } from "@/lib/homeApi";
import { cn } from "@/lib/utils";

const POPUP_STORAGE_PREFIX = "dalanbook.home-popup.seen";

function popupStorageKey(ad: HomePopupAd) {
    return `${POPUP_STORAGE_PREFIX}.${encodeURIComponent(ad.id)}.${ad.version}`;
}

function hasSeenPopup(ad: HomePopupAd) {
    try {
        return window.localStorage.getItem(popupStorageKey(ad)) === "1";
    } catch {
        return false;
    }
}

function markPopupSeen(ad: HomePopupAd) {
    try {
        window.localStorage.setItem(popupStorageKey(ad), "1");
    } catch {
        // Private browsing and blocked storage should not prevent the ad from opening.
    }
}

function isExternalTarget(targetUrl: string) {
    return /^https:\/\//i.test(targetUrl);
}

function formatPublishedAt(value: string | null) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
}

function PlacementTarget({
    targetUrl,
    label,
    onTarget,
}: {
    targetUrl: string | null;
    label: string;
    onTarget: (targetUrl: string) => void;
}) {
    if (!targetUrl) return null;
    return (
        <button
            type="button"
            className="inline-flex min-h-10 min-w-0 max-w-full items-center justify-center gap-2 break-words rounded-md bg-foreground px-4 text-center text-sm font-medium text-background transition-colors hover:bg-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2"
            onClick={() => onTarget(targetUrl)}
        >
            {label}
            {isExternalTarget(targetUrl) ? (
                <ExternalLink className="size-4" aria-hidden="true" />
            ) : null}
        </button>
    );
}

function NoticeDetails({
    notice,
    open,
    onOpenChange,
    onTarget,
}: {
    notice: HomePinnedNotice;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onTarget: (targetUrl: string) => void;
}) {
    const publishedAt = formatPublishedAt(notice.publishedAt);
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-h-[calc(100dvh-2rem)] max-w-none overflow-y-auto rounded-lg p-6"
                style={{ width: "min(512px, calc(100vw - 2rem))" }}
            >
                <DialogHeader className="pr-6 text-left">
                    <DialogTitle className="text-xl leading-snug">{notice.title}</DialogTitle>
                    {publishedAt ? (
                        <DialogDescription>发布于 {publishedAt}</DialogDescription>
                    ) : (
                        <DialogDescription className="sr-only">公告详情</DialogDescription>
                    )}
                </DialogHeader>
                <div className="whitespace-pre-wrap break-words text-sm leading-7 text-text-secondary">
                    {notice.content}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3">
                    <DialogClose className="inline-flex min-h-10 items-center rounded-md border border-border-default px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2">
                        关闭
                    </DialogClose>
                    <PlacementTarget
                        targetUrl={notice.targetUrl}
                        label={notice.ctaText ?? "查看详情"}
                        onTarget={onTarget}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}

function PopupAdDialog({
    ad,
    open,
    onOpenChange,
    onTarget,
}: {
    ad: HomePopupAd;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onTarget: (targetUrl: string) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-h-[calc(100dvh-2rem)] max-w-none overflow-y-auto rounded-lg border-0 bg-surface p-0 shadow-modal [&>button]:right-3 [&>button]:top-3 [&>button]:z-10 [&>button]:rounded-full [&>button]:bg-black/55 [&>button]:p-2 [&>button]:text-white [&>button]:opacity-100 [&>button]:hover:bg-black/70"
                style={{ width: "min(520px, calc(100vw - 2rem))" }}
                onOpenAutoFocus={() => markPopupSeen(ad)}
            >
                <img
                    src={ad.imageUrl}
                    alt=""
                    className="aspect-[16/10] w-full bg-background-secondary object-contain"
                />
                <div className="space-y-4 p-5 sm:p-6">
                    <DialogHeader className="text-left">
                        <DialogTitle className="pr-8 text-xl leading-snug sm:text-2xl">
                            {ad.title}
                        </DialogTitle>
                        {ad.description ? (
                            <DialogDescription className="pt-1 leading-6">
                                {ad.description}
                            </DialogDescription>
                        ) : (
                            <DialogDescription className="sr-only">活动广告</DialogDescription>
                        )}
                    </DialogHeader>
                    <div className="flex justify-end">
                        <PlacementTarget
                            targetUrl={ad.targetUrl}
                            label={ad.ctaText ?? "查看活动"}
                            onTarget={onTarget}
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function HomeOperations({ placements }: { placements?: HomePlacementsResponse }) {
    const navigate = useNavigate();
    const notice = placements?.pinnedNotice ?? null;
    const ad = placements?.popupAd ?? null;
    const [noticeOpen, setNoticeOpen] = useState(false);
    const [adOpen, setAdOpen] = useState(false);
    const evaluatedAdKey = useRef<string | null>(null);

    useEffect(() => {
        if (!ad || typeof window === "undefined") return;
        const key = popupStorageKey(ad);
        if (evaluatedAdKey.current === key) return;
        evaluatedAdKey.current = key;
        if (hasSeenPopup(ad)) return;
        setAdOpen(true);
    }, [ad]);

    const handleTarget = (targetUrl: string) => {
        setNoticeOpen(false);
        setAdOpen(false);
        if (isExternalTarget(targetUrl)) {
            window.open(targetUrl, "_blank", "noopener,noreferrer");
            return;
        }
        void navigate({ to: targetUrl as never });
    };

    return (
        <>
            {notice ? (
                <div className="mb-3">
                    <button
                        type="button"
                        className={cn(
                            "group flex min-h-[62px] w-full items-center gap-3 rounded-lg border border-border-default bg-surface px-4 py-3 text-left shadow-subtle transition-colors",
                            "hover:border-border-strong hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2",
                        )}
                        onClick={() => setNoticeOpen(true)}
                        aria-label={`查看公告：${notice.title}`}
                    >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-text-secondary">
                            <Megaphone className="size-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <span className="shrink-0">公告</span>
                                <span className="truncate">{notice.title}</span>
                            </span>
                            {notice.summary ? (
                                <span className="mt-1 block truncate text-xs text-text-secondary">
                                    {notice.summary}
                                </span>
                            ) : null}
                        </span>
                        <ChevronRight
                            className="size-4 shrink-0 text-text-tertiary transition-transform group-hover:translate-x-0.5"
                            aria-hidden="true"
                        />
                    </button>
                </div>
            ) : null}

            {notice ? (
                <NoticeDetails
                    notice={notice}
                    open={noticeOpen}
                    onOpenChange={setNoticeOpen}
                    onTarget={handleTarget}
                />
            ) : null}
            {ad ? (
                <PopupAdDialog
                    ad={ad}
                    open={adOpen}
                    onOpenChange={setAdOpen}
                    onTarget={handleTarget}
                />
            ) : null}
        </>
    );
}
