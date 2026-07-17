import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { FileText, Flame, LoaderCircle, Search, Users } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
    getSearchSuggestions,
    type SearchSuggestion,
    type SearchSuggestionType,
} from "@/lib/homeApi";

type HomeSearchProps = {
    variant: "desktop" | "mobile";
};

function suggestionLabel(type: SearchSuggestionType) {
    if (type === "hot") return "热门";
    if (type === "circle") return "圈子";
    if (type === "post") return "帖子";
    return "关键词";
}

function SuggestionIcon({ type }: { type: SearchSuggestionType }) {
    const className = "h-4 w-4 shrink-0 text-text-tertiary";
    if (type === "hot") return <Flame className={className} strokeWidth={1.75} />;
    if (type === "circle") return <Users className={className} strokeWidth={1.75} />;
    if (type === "post") return <FileText className={className} strokeWidth={1.75} />;
    return <Search className={className} strokeWidth={1.75} />;
}

function SearchResults({
    query,
    suggestions,
    isLoading,
    isError,
    onSelect,
}: {
    query: string;
    suggestions: SearchSuggestion[];
    isLoading: boolean;
    isError: boolean;
    onSelect: (suggestion: SearchSuggestion) => void;
}) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center gap-2 px-4 py-8 text-[13px] text-text-tertiary">
                <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                正在搜索…
            </div>
        );
    }

    if (isError) {
        return (
            <div className="px-4 py-8 text-center text-[13px] text-text-tertiary">
                搜索建议加载失败
            </div>
        );
    }

    const directResults = suggestions.filter(
        (suggestion) => suggestion.type === "circle" || suggestion.type === "post",
    );

    return (
        <div className="max-h-[360px] overflow-y-auto p-1.5">
            {suggestions.map((suggestion) => {
                const key = `${suggestion.type}-${suggestion.id ?? suggestion.text}`;
                if (suggestion.type === "keyword") {
                    return (
                        <div
                            key={key}
                            className="flex items-start gap-2.5 rounded-[10px] px-3 py-2.5 text-text-secondary"
                            aria-disabled="true"
                        >
                            <SuggestionIcon type={suggestion.type} />
                            <div className="min-w-0">
                                <p className="truncate text-[13px] font-medium text-foreground">
                                    搜索“{suggestion.text}”
                                </p>
                                <p className="mt-0.5 text-[11px] text-text-tertiary">
                                    当前仅展示可直接访问的圈子和帖子建议
                                </p>
                            </div>
                        </div>
                    );
                }

                return (
                    <button
                        key={key}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => onSelect(suggestion)}
                        className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left transition-colors hover:bg-black/[0.04] focus-visible:bg-black/[0.04] focus-visible:outline-none"
                    >
                        <SuggestionIcon type={suggestion.type} />
                        <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
                            {suggestion.text}
                        </span>
                        <span className="text-[11px] text-text-tertiary">
                            {suggestionLabel(suggestion.type)}
                        </span>
                    </button>
                );
            })}

            {suggestions.length === 0 ? (
                <div className="px-4 py-8 text-center text-[13px] text-text-tertiary">
                    {query.trim() ? "未找到匹配的圈子或帖子" : "暂无热门搜索"}
                </div>
            ) : null}

            {query.trim() && directResults.length === 0 && suggestions.length > 0 ? (
                <div className="px-3 pb-3 pt-2 text-center text-[12px] text-text-tertiary">
                    未找到可直接访问的圈子或帖子
                </div>
            ) : null}
        </div>
    );
}

function useHomeSearch(open: boolean, setOpen: (open: boolean) => void) {
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
        return () => window.clearTimeout(timer);
    }, [query]);

    const { data, isLoading, isError } = useQuery({
        queryKey: ["home", "search-suggest", debouncedQuery],
        queryFn: () => getSearchSuggestions(debouncedQuery),
        enabled: open,
        staleTime: 5 * 60_000,
        retry: 1,
    });

    const suggestions = data?.suggestions ?? [];

    function selectSuggestion(suggestion: SearchSuggestion) {
        if (suggestion.type === "hot") {
            setQuery(suggestion.text);
            setOpen(true);
            return;
        }
        if (!suggestion.id) return;

        setOpen(false);
        setQuery("");
        if (suggestion.type === "circle") {
            void navigate({ to: "/circles/$id", params: { id: suggestion.id } });
        } else if (suggestion.type === "post") {
            void navigate({ to: "/posts/$id", params: { id: suggestion.id } });
        }
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === "Escape") {
            setOpen(false);
            return;
        }
        if (event.key !== "Enter") return;

        const firstDirectResult = suggestions.find(
            (suggestion) =>
                (suggestion.type === "circle" || suggestion.type === "post") && suggestion.id,
        );
        const firstHotSuggestion = suggestions.find((suggestion) => suggestion.type === "hot");
        const selection = firstDirectResult ?? firstHotSuggestion;
        if (!selection) return;

        event.preventDefault();
        selectSuggestion(selection);
    }

    return {
        query,
        setQuery,
        suggestions,
        isLoading: isLoading || query.trim() !== debouncedQuery,
        isError,
        selectSuggestion,
        handleKeyDown,
    };
}

function DesktopHomeSearch() {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const search = useHomeSearch(open, setOpen);

    useEffect(() => {
        if (!open) return;

        function handlePointerDown(event: PointerEvent) {
            if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
        }

        document.addEventListener("pointerdown", handlePointerDown);
        return () => document.removeEventListener("pointerdown", handlePointerDown);
    }, [open]);

    return (
        <div ref={containerRef} className="relative ml-2 hidden max-w-[380px] flex-1 md:block">
            <Search
                className="absolute left-3 top-1/2 z-10 h-[15px] w-[15px] -translate-y-1/2 text-text-tertiary"
                strokeWidth={1.75}
            />
            <input
                value={search.query}
                onChange={(event) => {
                    search.setQuery(event.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={search.handleKeyDown}
                type="search"
                placeholder="搜索圈子、经验和问题"
                aria-label="搜索圈子和帖子"
                aria-expanded={open}
                aria-controls="home-search-desktop-results"
                className="h-9 w-full rounded-[12px] border border-[color:var(--border-default)] bg-white/60 pl-9 pr-3 text-[13px] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] placeholder:text-text-tertiary focus:border-black/30 focus:outline-none focus:ring-[3px] focus:ring-black/5"
            />
            {open ? (
                <div
                    id="home-search-desktop-results"
                    className="glass-elevated absolute inset-x-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-[14px] border border-[color:var(--border)]"
                >
                    <SearchResults
                        query={search.query}
                        suggestions={search.suggestions}
                        isLoading={search.isLoading}
                        isError={search.isError}
                        onSelect={search.selectSuggestion}
                    />
                </div>
            ) : null}
        </div>
    );
}

function MobileHomeSearch() {
    const [open, setOpen] = useState(false);
    const search = useHomeSearch(open, setOpen);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] text-text-secondary"
                aria-label="搜索"
            >
                <Search className="h-[17px] w-[17px]" strokeWidth={1.75} />
            </button>
            <DialogContent className="w-[calc(100%_-_24px)] gap-0 overflow-hidden rounded-[18px] p-0">
                <DialogTitle className="sr-only">搜索圈子和帖子</DialogTitle>
                <div className="relative border-b border-[color:var(--border)]">
                    <Search
                        className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
                        strokeWidth={1.75}
                    />
                    <input
                        autoFocus
                        value={search.query}
                        onChange={(event) => search.setQuery(event.target.value)}
                        onKeyDown={search.handleKeyDown}
                        type="search"
                        placeholder="搜索圈子、经验和问题"
                        aria-label="搜索圈子和帖子"
                        className="h-14 w-full bg-transparent pl-11 pr-12 text-[14px] text-foreground placeholder:text-text-tertiary focus:outline-none"
                    />
                </div>
                <SearchResults
                    query={search.query}
                    suggestions={search.suggestions}
                    isLoading={search.isLoading}
                    isError={search.isError}
                    onSelect={search.selectSuggestion}
                />
            </DialogContent>
        </Dialog>
    );
}

export function HomeSearch({ variant }: HomeSearchProps) {
    return variant === "desktop" ? <DesktopHomeSearch /> : <MobileHomeSearch />;
}
