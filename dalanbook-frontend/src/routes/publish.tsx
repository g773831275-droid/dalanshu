import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, X, Users, Check } from "lucide-react";
import { TopNav } from "@/components/home/TopNav";
import { MobileTopBar } from "@/components/home/MobileTopBar";
import { LoginGateModal, useLoginGate } from "@/components/auth/LoginGate";
import { useAuthUser } from "@/lib/authStore";
import { getCircles, publishPost, uploadImage, type UploadResult } from "@/lib/dalanbookApi";

export const Route = createFileRoute("/publish")({
  head: () => ({
    meta: [{ title: "发布笔记 · 大蓝书" }, { name: "robots", content: "noindex" }],
  }),
  component: PublishPage,
});

function PublishPage() {
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const user = useAuthUser();
  const { require, gateProps } = useLoginGate();
  const { data: circles = [] } = useQuery({
    queryKey: ["dalanbook", "circles"],
    queryFn: () => getCircles(),
  });
  const joinedCircles = circles.filter((circle) => circle.joined);
  const [images, setImages] = useState<UploadResult[]>([]);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [circleId, setCircleId] = useState<string>("");
  const [toast, setToast] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const titleMax = 30;
  const bodyMax = 1000;
  const selectedCircleId = circleId || joinedCircles[0]?.id || "";
  const canPublish =
    !uploading &&
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    images.length > 0 &&
    !!selectedCircleId;

  async function addImages(files: FileList | null) {
    if (!files?.length) return;
    if (!require("上传图片", () => {})) {
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    const selected = Array.from(files).slice(0, 9 - images.length);
    setUploading(true);
    setToast("正在上传图片…");
    const results = await Promise.allSettled(selected.map(uploadImage));
    const uploaded = results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);
    if (uploaded.length) setImages((prev) => [...prev, ...uploaded]);
    const failed = results.find((result) => result.status === "rejected");
    setToast(
      failed
        ? failed.reason instanceof Error
          ? failed.reason.message
          : "部分图片上传失败"
        : null,
    );
    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";
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
          images: images.map((image) => ({
            ossId: image.ossId,
            url: image.url,
            ratio: "4/5" as const,
          })),
          ratio: "4/5",
          tag: "经验",
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
            <span className="w-[52px]" aria-hidden />
          </div>

          {/* Images */}
          <div className="grid grid-cols-4 gap-2">
            {images.map((image, i) => (
              <div
                key={image.ossId}
                className="relative aspect-square overflow-hidden rounded-[12px] border border-[color:var(--border)]"
              >
                <img src={image.url} alt="" className="h-full w-full object-cover" />
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

          {/* Desktop actions */}
          <div className="mt-6 hidden items-center justify-end gap-2 md:flex">
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
        <button
          disabled={!canPublish || publishing}
          onClick={onPublish}
          className={
            "h-10 w-full rounded-[12px] text-[14px] font-medium transition-colors " +
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
