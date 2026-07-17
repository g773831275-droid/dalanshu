import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ImageIcon, Plus, Users, Video, X } from "lucide-react";
import { LoginGateModal, useLoginGate } from "@/components/auth/LoginGate";
import { MobileTopBar } from "@/components/home/MobileTopBar";
import { TopNav } from "@/components/home/TopNav";
import { authStore, useAuthUser } from "@/lib/authStore";
import {
    getCircles,
    getVideoAsset,
    publishPost,
    uploadImage,
    uploadVideoFile,
    type VideoAsset,
} from "@/lib/dalanbookApi";

type LocalImage = {
    id: string;
    file: File;
    previewUrl: string;
};

type SelectedVideo = Omit<VideoAsset, "status"> & {
    status: VideoAsset["status"] | "local";
    file: File | null;
    fileName: string;
    previewUrl: string;
    progress: number;
};

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const maxImageSize = 10 * 1024 * 1024;
const maxVideoSize = 200 * 1024 * 1024;
const maxVideoDurationSeconds = 180;
const supportedVideoTypes = new Set(["video/mp4", "video/quicktime", "video/webm"]);

function getVideoDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
        const previewUrl = URL.createObjectURL(file);
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = () => {
            URL.revokeObjectURL(previewUrl);
            resolve(video.duration);
        };
        video.onerror = () => {
            URL.revokeObjectURL(previewUrl);
            reject(new Error("无法读取视频时长，请更换文件后重试"));
        };
        video.src = previewUrl;
    });
}

export const Route = createFileRoute("/publish")({
    head: () => ({
        meta: [{ title: "发布帖子 · 大蓝书" }, { name: "robots", content: "noindex" }],
    }),
    component: PublishPage,
});

function PublishPage() {
    const navigate = useNavigate();
    const imageInput = useRef<HTMLInputElement>(null);
    const videoInput = useRef<HTMLInputElement>(null);
    const user = useAuthUser();
    const { require, gateProps } = useLoginGate();
    const { data: circles = [] } = useQuery({
        queryKey: ["dalanbook", "circles", user?.id ?? "anonymous"],
        queryFn: () => getCircles(),
    });
    const [images, setImages] = useState<LocalImage[]>([]);
    const imagesRef = useRef<LocalImage[]>([]);
    const [mediaMode, setMediaMode] = useState<"images" | "video">("images");
    const [uploadingImages, setUploadingImages] = useState(false);
    const [video, setVideo] = useState<SelectedVideo | null>(null);
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [circleId, setCircleId] = useState<string>("");
    const [toast, setToast] = useState<string | null>(null);
    const [publishing, setPublishing] = useState(false);

    const titleMax = 30;
    const bodyMax = 1000;
    const selectedCircleId = circleId || circles[0]?.id || "";
    const isMediaUploading = uploadingImages || video?.status === "uploading";

    useEffect(() => {
        imagesRef.current = images;
    }, [images]);

    useEffect(
        () => () => {
            imagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
        },
        [],
    );

    useEffect(() => {
        if (!video || !["uploaded", "processing"].includes(video.status)) return;
        const timer = window.setInterval(() => {
            void getVideoAsset(video.id)
                .then((asset) => {
                    setVideo((current) =>
                        current?.id === asset.id ? { ...current, ...asset } : current,
                    );
                })
                .catch(() => undefined);
        }, 3_000);
        return () => window.clearInterval(timer);
    }, [video?.id, video?.status]);

    useEffect(() => {
        const previewUrl = video?.previewUrl;
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [video?.previewUrl]);

    function addImages(files: FileList | null) {
        if (!files?.length) return;
        const remaining = 9 - images.length;
        const selected = Array.from(files).slice(0, remaining);
        const accepted = selected.filter(
            (file) =>
                file.size > 0 && file.size <= maxImageSize && allowedImageTypes.has(file.type),
        );
        if (accepted.length) {
            setImages((current) => [
                ...current,
                ...accepted.map((file) => ({
                    id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
                    file,
                    previewUrl: URL.createObjectURL(file),
                })),
            ]);
        }
        if (files.length > remaining) {
            setToast("最多上传 9 张图片");
        } else if (accepted.length !== selected.length) {
            setToast("仅支持不超过 10MB 的 JPEG、PNG、WebP、GIF 图片");
        } else {
            setToast(user ? "图片已添加，将在发布时上传" : "图片已保存在当前页面，登录后再上传");
        }
        if (imageInput.current) imageInput.current.value = "";
    }

    function removeImage(index: number) {
        setImages((current) => {
            const removed = current[index];
            if (removed) URL.revokeObjectURL(removed.previewUrl);
            return current.filter((_, currentIndex) => currentIndex !== index);
        });
    }

    function selectMediaMode(nextMode: "images" | "video") {
        if (nextMode === mediaMode || isMediaUploading || publishing) return;
        if (nextMode === "video" && images.length) {
            setImages((current) => {
                current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
                return [];
            });
            setToast("已移除图片，请选择一条视频");
        }
        if (nextMode === "images" && video) {
            setVideo(null);
            setToast("已移除视频，可以添加图片");
        }
        setMediaMode(nextMode);
    }

    async function addVideo(files: FileList | null) {
        const file = files?.[0];
        if (!file) return;
        if (!supportedVideoTypes.has(file.type)) {
            setToast("仅支持 MP4、MOV、WebM 视频");
            if (videoInput.current) videoInput.current.value = "";
            return;
        }
        if (file.size > maxVideoSize) {
            setToast("视频不能超过 200MB");
            if (videoInput.current) videoInput.current.value = "";
            return;
        }
        try {
            const duration = await getVideoDuration(file);
            if (!Number.isFinite(duration) || duration > maxVideoDurationSeconds) {
                setToast("短视频不能超过 3 分钟");
                return;
            }
            setVideo({
                id: `local-video-${Date.now()}`,
                status: "local",
                file,
                fileName: file.name,
                previewUrl: URL.createObjectURL(file),
                progress: 0,
                durationMs: Math.round(duration * 1_000),
            });
            setToast(user ? "视频已添加，将在发布时上传" : "视频已保存在当前页面，登录后再上传");
        } catch (error) {
            setToast(error instanceof Error ? error.message : "无法读取视频，请稍后重试");
        } finally {
            if (videoInput.current) videoInput.current.value = "";
        }
    }

    function onPublish() {
        if (publishing || isMediaUploading) return;
        require("发布帖子", async () => {
            if (!title.trim() || !body.trim()) {
                setToast("请填写标题和正文");
                return;
            }
            if (!selectedCircleId) {
                setToast("暂无可发布的圈子");
                return;
            }
            if (mediaMode === "video" && !video) {
                setToast("请先添加视频");
                return;
            }
            if (video?.status === "failed" || video?.status === "rejected") {
                setToast(video.failureReason ?? "视频处理失败，请重新选择视频");
                return;
            }

            setPublishing(true);
            let uploadedVideoId = mediaMode === "video" ? video?.id : undefined;
            try {
                let uploadedImages: Awaited<ReturnType<typeof uploadImage>>[] = [];
                if (mediaMode === "images" && images.length) {
                    setUploadingImages(true);
                    setToast("正在上传图片…");
                    uploadedImages = await Promise.all(
                        images.map((image) => uploadImage(image.file)),
                    );
                    setUploadingImages(false);
                }

                if (mediaMode === "video" && video?.status === "local" && video.file) {
                    const localVideoId = video.id;
                    setVideo((current) =>
                        current?.id === localVideoId
                            ? { ...current, status: "uploading", progress: 0 }
                            : current,
                    );
                    setToast("正在上传视频…");
                    const asset = await uploadVideoFile(
                        video.file,
                        (progress) => {
                            setVideo((current) =>
                                current?.id === localVideoId ? { ...current, progress } : current,
                            );
                        },
                        user?.id,
                    );
                    uploadedVideoId = asset.id;
                    setVideo((current) =>
                        current?.id === localVideoId
                            ? { ...current, ...asset, progress: 100 }
                            : current,
                    );
                }

                setToast("正在发布…");
                const post = await publishPost({
                    title: title.trim(),
                    content: body.trim(),
                    circleId: selectedCircleId,
                    images:
                        mediaMode === "images"
                            ? uploadedImages.map((image) => ({
                                  ossId: image.ossId,
                                  url: image.url,
                                  ratio: "4/5" as const,
                              }))
                            : [],
                    videoAssetId: mediaMode === "video" ? uploadedVideoId : undefined,
                    ratio: mediaMode === "video" ? "9/16" : "4/5",
                    tag: "经验",
                });
                images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
                setImages([]);
                setVideo(null);
                setToast("发布成功，正在打开帖子…");
                window.setTimeout(
                    () => navigate({ to: "/posts/$id", params: { id: post.id } }),
                    500,
                );
            } catch (error) {
                setVideo((current) =>
                    current?.status === "uploading"
                        ? { ...current, status: "local", progress: 0 }
                        : current,
                );
                setToast(error instanceof Error ? error.message : "发布失败，请稍后重试");
                setPublishing(false);
            } finally {
                setUploadingImages(false);
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
                    <div className="mb-5 flex items-center justify-between">
                        <Link
                            to="/"
                            className="text-[13.5px] text-text-secondary hover:text-foreground"
                        >
                            取消
                        </Link>
                        <h1 className="text-[16px] font-semibold tracking-[-0.01em] text-foreground">
                            发布帖子
                        </h1>
                        <span className="w-[52px]" aria-hidden />
                    </div>

                    <div
                        className="mb-3 flex rounded-[10px] bg-[color:var(--action-muted)] p-1"
                        role="tablist"
                        aria-label="媒体类型"
                    >
                        <button
                            type="button"
                            role="tab"
                            aria-selected={mediaMode === "images"}
                            disabled={isMediaUploading || publishing}
                            onClick={() => selectMediaMode("images")}
                            className={
                                "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[8px] text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 " +
                                (mediaMode === "images"
                                    ? "bg-white text-foreground shadow-[var(--shadow-subtle)]"
                                    : "text-text-secondary hover:text-foreground")
                            }
                        >
                            <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
                            图片
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={mediaMode === "video"}
                            disabled={isMediaUploading || publishing}
                            onClick={() => selectMediaMode("video")}
                            className={
                                "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[8px] text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 " +
                                (mediaMode === "video"
                                    ? "bg-white text-foreground shadow-[var(--shadow-subtle)]"
                                    : "text-text-secondary hover:text-foreground")
                            }
                        >
                            <Video className="h-3.5 w-3.5" strokeWidth={1.75} />
                            视频
                        </button>
                    </div>

                    {mediaMode === "images" ? (
                        <div className="grid grid-cols-4 gap-2">
                            {images.map((image, index) => (
                                <div
                                    key={image.id}
                                    className="relative aspect-square overflow-hidden rounded-[12px] border border-[color:var(--border)]"
                                >
                                    <img
                                        src={image.previewUrl}
                                        alt=""
                                        className="h-full w-full object-cover"
                                    />
                                    {index === 0 && (
                                        <span className="absolute bottom-1 left-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                                            封面
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        disabled={publishing}
                                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50"
                                        aria-label="删除图片"
                                    >
                                        <X className="h-3 w-3" strokeWidth={2} />
                                    </button>
                                </div>
                            ))}
                            {images.length < 9 && (
                                <button
                                    type="button"
                                    onClick={() => imageInput.current?.click()}
                                    disabled={isMediaUploading || publishing}
                                    className="flex aspect-square flex-col items-center justify-center gap-1 rounded-[12px] border border-dashed border-[color:var(--border-default)] bg-white/50 text-text-tertiary transition-colors hover:border-foreground/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Plus className="h-5 w-5" strokeWidth={1.75} />
                                    <span className="text-[11px]">
                                        {uploadingImages ? "上传中" : "添加图片"}
                                    </span>
                                </button>
                            )}
                        </div>
                    ) : video ? (
                        <div className="relative aspect-[9/16] max-w-[260px] overflow-hidden rounded-[12px] border border-[color:var(--border)] bg-black">
                            <video
                                src={video.previewUrl}
                                muted
                                playsInline
                                className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-10 text-white">
                                <p className="truncate text-[12px] font-medium">{video.fileName}</p>
                                <p className="mt-0.5 text-[11px] text-white/75">
                                    {video.status === "local"
                                        ? "等待发布"
                                        : video.status === "uploading"
                                          ? `上传中 ${video.progress}%`
                                          : video.status === "ready"
                                            ? "视频已就绪"
                                            : video.status === "failed" ||
                                                video.status === "rejected"
                                              ? "视频处理失败"
                                              : "视频处理中"}
                                </p>
                            </div>
                            {video.status === "uploading" ? (
                                <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
                                    <div
                                        className="h-full bg-white transition-[width]"
                                        style={{ width: `${video.progress}%` }}
                                    />
                                </div>
                            ) : null}
                            <button
                                type="button"
                                onClick={() => setVideo(null)}
                                disabled={video.status === "uploading" || publishing}
                                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label="删除视频"
                            >
                                <X className="h-3.5 w-3.5" strokeWidth={2} />
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => videoInput.current?.click()}
                            disabled={publishing}
                            className="flex aspect-[9/16] w-[160px] flex-col items-center justify-center gap-1.5 rounded-[12px] border border-dashed border-[color:var(--border-default)] bg-white/50 text-text-tertiary transition-colors hover:border-foreground/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Plus className="h-5 w-5" strokeWidth={1.75} />
                            <span className="text-[11px]">添加视频</span>
                        </button>
                    )}
                    <input
                        ref={imageInput}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        className="hidden"
                        onChange={(event) => addImages(event.target.files)}
                    />
                    <input
                        ref={videoInput}
                        type="file"
                        accept="video/mp4,video/quicktime,video/webm"
                        className="hidden"
                        onChange={(event) => void addVideo(event.target.files)}
                    />

                    <div className="mt-6">
                        <input
                            value={title}
                            onChange={(event) => setTitle(event.target.value.slice(0, titleMax))}
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

                    <div className="mt-4">
                        <textarea
                            value={body}
                            onChange={(event) => setBody(event.target.value.slice(0, bodyMax))}
                            placeholder="分享真实经验、复盘或提问…尽量具体，别人才能复现。"
                            className="min-h-[220px] w-full resize-none bg-transparent text-[15px] leading-[1.85] text-foreground placeholder:text-text-tertiary focus:outline-none"
                        />
                        <div className="text-right text-[11px] text-text-tertiary">
                            {body.length}/{bodyMax}
                        </div>
                    </div>

                    <div className="mt-3 rounded-[14px] border border-[color:var(--border)] bg-white/50 p-3">
                        <div className="mb-2 flex items-center gap-2 text-[13px] text-text-secondary">
                            <Users className="h-4 w-4" strokeWidth={1.75} />
                            发布到圈子
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {circles.map((circle) => {
                                const selected = circle.id === selectedCircleId;
                                return (
                                    <button
                                        type="button"
                                        key={circle.id}
                                        onClick={() => setCircleId(circle.id)}
                                        disabled={publishing}
                                        className={
                                            "rounded-full border px-2.5 py-1 text-[12px] transition-colors disabled:cursor-not-allowed disabled:opacity-60 " +
                                            (selected
                                                ? "border-foreground bg-foreground text-white"
                                                : "border-[color:var(--border)] bg-white text-text-secondary hover:text-foreground")
                                        }
                                    >
                                        {circle.name}
                                    </button>
                                );
                            })}
                            {!circles.length && (
                                <Link
                                    to="/circles"
                                    className="text-[12px] text-text-secondary underline"
                                >
                                    暂无可发布圈子，去圈子页面看看
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 hidden items-center justify-end gap-2 md:flex">
                        <button
                            type="button"
                            disabled={publishing || isMediaUploading}
                            onClick={onPublish}
                            className="h-10 rounded-[12px] bg-foreground px-5 text-[13.5px] font-medium text-white transition-colors hover:bg-[color:var(--action-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {publishing ? "发布中…" : "发布"}
                        </button>
                    </div>
                </div>
            </main>

            <div className="glass-base fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-[color:var(--border)] px-3 py-2.5 md:hidden">
                <button
                    type="button"
                    disabled={publishing || isMediaUploading}
                    onClick={onPublish}
                    className="h-10 w-full rounded-[12px] bg-foreground text-[14px] font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {publishing ? "发布中…" : "发布"}
                </button>
            </div>

            {!user && (
                <div className="pointer-events-none fixed inset-x-0 bottom-[70px] z-30 flex justify-center px-4 md:bottom-6">
                    <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-foreground/95 px-4 py-2 text-[12.5px] text-white shadow-[var(--shadow-floating)]">
                        <span>发布前需要先登录</span>
                        <button
                            type="button"
                            onClick={() =>
                                authStore.openAuth({
                                    tab: "login",
                                    redirect: "/publish",
                                    action: "发布帖子",
                                })
                            }
                            className="rounded-full bg-white/20 px-2.5 py-0.5 font-medium hover:bg-white/30"
                        >
                            去登录
                        </button>
                    </div>
                </div>
            )}

            <LoginGateModal {...gateProps} />
        </div>
    );
}
