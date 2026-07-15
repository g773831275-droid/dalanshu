import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, X, Hash, Users, MapPin, Globe2, Lock, ChevronRight, Check } from "lucide-react";
import { TopNav } from "@/components/home/TopNav";
import { MobileTopBar } from "@/components/home/MobileTopBar";
import { LoginGateModal, useLoginGate } from "@/components/auth/LoginGate";
import { useAuthUser } from "@/lib/authStore";
import { getCircles, getTopics, publishPost, uploadImage } from "@/lib/dalanbookApi";

export const Route = createFileRoute("/publish")({
  head: () => ({
    meta: [{ title: "发布笔记 · 大蓝书" }, { name: "robots", content: "noindex" }],
  }),
  component: PublishPage,
});

const defaultTopicSuggestions = ["效率", "AI 工具", "复盘", "读书", "自律", "职场", "减脂"];

function PublishPage() {
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const user = useAuthUser();
  const { require, gateProps } = useLoginGate();
  const { data: circles = [] } = useQuery({
    queryKey: ["dalanbook", "circles"],
    queryFn: () => getCircles(),
  });
  const { data: apiTopics = [] } = useQuery({
    queryKey: ["dalanbook", "topics"],
    queryFn: getTopics,
  });
  const topicSuggestions = apiTopics.length
    ? apiTopics.map((topic) => topic.name).slice(0, 12)
    : defaultTopicSuggestions;
  const joinedCircles = circles.filter((circle) => circle.joined);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [topics, setTopics] = useState<string[]>(["复盘"]);
  const [circleId, setCircleId] = useState<string>("");
  const [location, setLocation] = useState("上海 · 徐汇");
  const [pub, setPub] = useState<"public" | "circle">("public");
  const [toast, setToast] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const titleMax = 30;
  const bodyMax = 1000;
  const selectedCircleId = circleId || joinedCircles[0]?.id || "";
  const canPublish =
    title.trim().length > 0 && body.trim().length > 0 && images.length > 0 && !!selectedCircleId;

  function toggleTopic(t: string) {
    setTopics((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function addImages(files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files).slice(0, 9 - images.length);
    setUploading(true);
    setToast("正在上传图片…");
    try {
      const uploaded = await Promise.all(selected.map(uploadImage));
      setImages((prev) => [...prev, ...uploaded.map((item) => item.url)]);
      setToast(null);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "图片上传失败");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  function onPublish() {
    if (!canPublish || publishing) return;
    require("发布笔记", async () => {
      setPublishing(true);
      setToast("正在发布…");
      try {
        const post = await publishPost({
          title: title.trim(),
          content: body.trim(),
          circleId: selectedCircleId,
          images: images.map((url) => ({ url, ratio: "4/5" as const })),
          ratio: "4/5",
          tag: topics.includes("复盘") ? "复盘" : "经验",
          topics,
          visibility: pub,
        });
        setToast("发布成功，正在打开笔记…");
        window.setTimeout(() => navigate({ to: "/posts/$id", params: { id: post.id } }), 500);
      } catch (error) {
        setToast(error instanceof Error ? error.message : "发布失败，请稍后重试");
        setPublishing(false);
      }
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <TopNav />
      </div>
      <MobileTopBar showChannels={false} />

      {toast && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-[13px] text-white shadow-[var(--shadow-floating)]">
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-4 w-4" strokeWidth={2} /> {toast}
          </span>
        </div>
      )}

      <main className="mx-auto max-w-[720px] px-4 pt-4 pb-36 md:px-0 md:pt-8 md:pb-16">
        <div className="glass-elevated rounded-[20px] border border-[color:var(--border)] p-4 md:p-7">
          {/* Bar */}
          <div className="mb-5 flex items-center justify-between">
            <Link to="/" className="text-[13.5px] text-text-secondary hover:text-foreground">
              取消
            </Link>
            <h1 className="text-[16px] font-semibold tracking-[-0.01em] text-foreground">
              发布笔记
            </h1>
            <button className="text-[13.5px] text-text-secondary hover:text-foreground">
              存草稿
            </button>
          </div>

          {/* Images */}
          <div className="grid grid-cols-4 gap-2">
            {images.map((src, i) => (
              <div
                key={src + i}
                className="relative aspect-square overflow-hidden rounded-[12px] border border-[color:var(--border)]"
              >
                <img src={src} alt="" className="h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    封面
                  </span>
                )}
                <button
                  onClick={() => removeImage(i)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                  aria-label="删除"
                >
                  <X className="h-3 w-3" strokeWidth={2} />
                </button>
              </div>
            ))}
            {images.length < 9 && (
              <button
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-[12px] border border-dashed border-[color:var(--border-default)] bg-white/50 text-text-tertiary transition-colors hover:border-foreground/40 hover:text-foreground"
              >
                <Plus className="h-5 w-5" strokeWidth={1.75} />
                <span className="text-[11px]">{uploading ? "上传中" : "添加图片"}</span>
              </button>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={(event) => void addImages(event.target.files)}
            />
          </div>

          {/* Title */}
          <div className="mt-6">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, titleMax))}
              placeholder="填写标题会有更多人看…"
              className="w-full bg-transparent text-[17px] font-semibold tracking-[-0.01em] text-foreground placeholder:font-normal placeholder:text-text-tertiary focus:outline-none"
            />
            <div className="mt-1 flex items-center justify-between border-b border-[color:var(--border)] pb-2 text-[11px] text-text-tertiary">
              <span>好标题让内容更容易被看到</span>
              <span>
                {title.length}/{titleMax}
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="mt-4">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, bodyMax))}
              placeholder="分享真实经验、复盘或提问…尽量具体，别人才能复现。"
              className="min-h-[220px] w-full resize-none bg-transparent text-[15px] leading-[1.85] text-foreground placeholder:text-text-tertiary focus:outline-none"
            />
            <div className="text-right text-[11px] text-text-tertiary">
              {body.length}/{bodyMax}
            </div>
          </div>

          {/* Topics */}
          <div className="mt-4 rounded-[14px] border border-[color:var(--border)] bg-white/50 p-3">
            <div className="mb-2 flex items-center gap-2 text-[13px] text-text-secondary">
              <Hash className="h-4 w-4" strokeWidth={1.75} />
              话题
            </div>
            <div className="flex flex-wrap gap-1.5">
              {topicSuggestions.map((t) => {
                const on = topics.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleTopic(t)}
                    className={
                      "rounded-full border px-2.5 py-1 text-[12px] transition-colors " +
                      (on
                        ? "border-foreground bg-foreground text-white"
                        : "border-[color:var(--border)] bg-white text-text-secondary hover:text-foreground")
                    }
                  >
                    #{t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Circle picker */}
          <div className="mt-3 rounded-[14px] border border-[color:var(--border)] bg-white/50 p-3">
            <div className="mb-2 flex items-center gap-2 text-[13px] text-text-secondary">
              <Users className="h-4 w-4" strokeWidth={1.75} />
              发布到圈子
            </div>
            <div className="flex flex-wrap gap-1.5">
              {joinedCircles.slice(0, 8).map((c) => {
                const on = c.id === selectedCircleId;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCircleId(c.id)}
                    className={
                      "rounded-full border px-2.5 py-1 text-[12px] transition-colors " +
                      (on
                        ? "border-foreground bg-foreground text-white"
                        : "border-[color:var(--border)] bg-white text-text-secondary hover:text-foreground")
                    }
                  >
                    {c.name}
                  </button>
                );
              })}
              {!joinedCircles.length && (
                <Link to="/circles" className="text-[12px] text-text-secondary underline">
                  请先加入一个圈子
                </Link>
              )}
            </div>
          </div>

          {/* Location */}
          <button
            onClick={() => setLocation((l) => (l ? "" : "上海 · 徐汇"))}
            className="mt-3 flex w-full items-center justify-between rounded-[14px] border border-[color:var(--border)] bg-white/50 px-3 py-3 text-[13px] text-text-secondary transition-colors hover:text-foreground"
          >
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4" strokeWidth={1.75} />
              地点
            </span>
            <span className="inline-flex items-center gap-1 text-text-tertiary">
              {location || "添加地点"}
              <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
            </span>
          </button>

          {/* Visibility */}
          <div className="mt-3 flex overflow-hidden rounded-[14px] border border-[color:var(--border)] bg-white/50 p-1 text-[13px]">
            {(
              [
                { key: "public", label: "公开可见", icon: Globe2 },
                { key: "circle", label: "仅圈内可见", icon: Lock },
              ] as const
            ).map((o) => {
              const on = pub === o.key;
              const Icon = o.icon;
              return (
                <button
                  key={o.key}
                  onClick={() => setPub(o.key)}
                  className={
                    "flex flex-1 items-center justify-center gap-1.5 rounded-[10px] py-2 transition-colors " +
                    (on ? "bg-foreground text-white" : "text-text-secondary hover:text-foreground")
                  }
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                  {o.label}
                </button>
              );
            })}
          </div>

          {/* Desktop actions */}
          <div className="mt-6 hidden items-center justify-end gap-2 md:flex">
            <button className="h-10 rounded-[12px] border border-[color:var(--border-default)] bg-white/60 px-4 text-[13.5px] text-text-secondary transition-colors hover:text-foreground">
              预览
            </button>
            <button
              disabled={!canPublish || publishing}
              onClick={onPublish}
              className={
                "h-10 rounded-[12px] px-5 text-[13.5px] font-medium transition-colors " +
                (canPublish
                  ? "bg-foreground text-white hover:bg-[color:var(--action-primary-hover)]"
                  : "cursor-not-allowed bg-[color:var(--action-muted)] text-text-tertiary")
              }
            >
              {publishing ? "发布中…" : "发布"}
            </button>
          </div>
        </div>
      </main>

      {/* Mobile fixed bar */}
      <div className="glass-base fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-[color:var(--border)] px-3 py-2.5 md:hidden">
        <button className="h-10 flex-1 rounded-[12px] border border-[color:var(--border-default)] bg-white/60 text-[13.5px] text-text-secondary">
          预览
        </button>
        <button
          disabled={!canPublish || publishing}
          onClick={onPublish}
          className={
            "h-10 flex-[2] rounded-[12px] text-[14px] font-medium transition-colors " +
            (canPublish
              ? "bg-foreground text-white"
              : "cursor-not-allowed bg-[color:var(--action-muted)] text-text-tertiary")
          }
        >
          {publishing ? "发布中…" : "发布"}
        </button>
      </div>

      {!user && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[70px] z-30 flex justify-center px-4 md:bottom-6">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-foreground/95 px-4 py-2 text-[12.5px] text-white shadow-[var(--shadow-floating)]">
            <span>发布前需要先登录</span>
            <Link
              to="/auth"
              search={{ tab: "login", redirect: "/publish" } as never}
              className="rounded-full bg-white/20 px-2.5 py-0.5 font-medium hover:bg-white/30"
            >
              去登录
            </Link>
          </div>
        </div>
      )}

      <LoginGateModal {...gateProps} />
    </div>
  );
}
