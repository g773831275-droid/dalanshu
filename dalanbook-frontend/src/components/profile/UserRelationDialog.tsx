import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Loader2, Users } from "lucide-react";
import type { ReactNode } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { getUserRelationPage, type CommunityUser, type UserRelationType } from "@/lib/userApi";

const PAGE_SIZE = 20;

export function UserRelationDialog({
    open,
    type,
    userId,
    userName,
    onClose,
}: {
    open: boolean;
    type: UserRelationType;
    userId: string;
    userName: string;
    onClose: () => void;
}) {
    const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
        useInfiniteQuery({
            queryKey: ["dalanbook", "user", userId, type],
            queryFn: ({ pageParam }) => getUserRelationPage(userId, type, pageParam, PAGE_SIZE),
            initialPageParam: null as string | null,
            getNextPageParam: (lastPage) =>
                lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
            enabled: open,
        });
    const items = data?.pages.flatMap((page) => page.items) ?? [];
    const label = type === "followers" ? "粉丝" : "关注";

    return (
        <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
            <DialogContent className="max-h-[82vh] gap-0 overflow-hidden border-[color:var(--border)] bg-white p-0 sm:max-w-[520px] sm:rounded-[20px]">
                <DialogHeader className="border-b border-[color:var(--border)] px-5 py-4 text-left">
                    <DialogTitle className="text-[17px]">{label}</DialogTitle>
                    <DialogDescription className="text-[12.5px] text-text-tertiary">
                        {userName}的{label}列表
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[64vh] overflow-y-auto">
                    {isLoading ? (
                        <RelationState icon={<Loader2 className="h-5 w-5 animate-spin" />}>
                            正在加载…
                        </RelationState>
                    ) : isError ? (
                        <RelationState>列表加载失败，请稍后重试。</RelationState>
                    ) : items.length === 0 ? (
                        <RelationState icon={<Users className="h-6 w-6" strokeWidth={1.5} />}>
                            暂时没有{label}
                        </RelationState>
                    ) : (
                        <>
                            <ul className="divide-y divide-[color:var(--border)]">
                                {items.map((user) => (
                                    <RelationRow key={user.id} user={user} onNavigate={onClose} />
                                ))}
                            </ul>
                            {hasNextPage ? (
                                <div className="border-t border-[color:var(--border)] p-3 text-center">
                                    <button
                                        type="button"
                                        onClick={() => void fetchNextPage()}
                                        disabled={isFetchingNextPage}
                                        className="rounded-[10px] px-4 py-2 text-[12.5px] font-medium text-text-secondary transition-colors hover:bg-black/[0.04] hover:text-foreground disabled:opacity-60"
                                    >
                                        {isFetchingNextPage ? "加载中…" : "加载更多"}
                                    </button>
                                </div>
                            ) : null}
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function RelationRow({ user, onNavigate }: { user: CommunityUser; onNavigate: () => void }) {
    return (
        <li>
            <Link
                to="/u/$id"
                params={{ id: user.id }}
                onClick={onNavigate}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-black/[0.025]"
            >
                <UserAvatar user={user} />
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-foreground">
                        {user.nickname}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-text-tertiary">
                        {user.bio || user.location || "还没有填写个人简介"}
                    </span>
                </span>
            </Link>
        </li>
    );
}

function UserAvatar({ user }: { user: CommunityUser }) {
    if (user.avatar) {
        return (
            <img
                src={user.avatar}
                alt=""
                className="h-11 w-11 shrink-0 rounded-full object-cover"
            />
        );
    }
    return (
        <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#245BDB] text-[15px] font-semibold text-white"
            aria-hidden
        >
            {user.nickname.slice(0, 1)}
        </span>
    );
}

function RelationState({ children, icon }: { children: string; icon?: ReactNode }) {
    return (
        <div className="flex min-h-48 flex-col items-center justify-center gap-2 px-5 text-[13px] text-text-tertiary">
            {icon}
            <span>{children}</span>
        </div>
    );
}
