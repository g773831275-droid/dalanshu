import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { AdaptiveImage } from "@/components/ui/adaptive-image";
import { AGE_RANGE_OPTIONS, CHINA_PROVINCES } from "@/data/regions";
import { updateMyProfile, type MyProfile, type UpdateProfileInput } from "@/lib/authApi";
import { uploadImage } from "@/lib/dalanbookApi";

const AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_AVATAR_SIZE = 10 * 1024 * 1024;

export function ProfileEditorDialog({
    open,
    profile,
    onClose,
    onSaved,
}: {
    open: boolean;
    profile: MyProfile;
    onClose: () => void;
    onSaved: (profile: MyProfile) => void;
}) {
    const [form, setForm] = useState<UpdateProfileInput>(() => toForm(profile));
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState(profile.avatar ?? "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (open) {
            setForm(toForm(profile));
            setAvatarFile(null);
            setAvatarPreview(profile.avatar ?? "");
            setError("");
        }
    }, [open, profile]);

    useEffect(
        () => () => {
            if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
        },
        [avatarPreview],
    );

    if (!open) return null;

    async function save() {
        if (!form.nickname.trim()) {
            setError("昵称不能为空");
            return;
        }
        setSaving(true);
        setError("");
        try {
            const input = { ...form };
            if (avatarFile) {
                const uploaded = await uploadImage(avatarFile);
                input.avatarOssId = uploaded.ossId;
            }
            const saved = await updateMyProfile(input);
            onSaved(avatarFile && !saved.avatar ? { ...saved, avatar: avatarPreview } : saved);
            onClose();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "保存失败，请稍后重试");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/35 p-0 backdrop-blur-[2px] md:items-center md:p-6"
            role="dialog"
            aria-modal="true"
            aria-label="编辑个人资料"
        >
            <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[24px] bg-white p-5 shadow-2xl md:max-w-[620px] md:rounded-[24px] md:p-7">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-[20px] font-semibold text-foreground">编辑个人资料</h2>
                        <p className="mt-1 text-[12.5px] text-text-tertiary">
                            年龄段和地域用于优化内容推荐，可选择不透露。
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5"
                        aria-label="关闭"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="mt-6 flex items-center gap-4 rounded-[16px] border border-[color:var(--border)] bg-black/[0.015] p-4">
                    <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#245BDB] text-[24px] font-semibold text-white shadow-[var(--shadow-subtle)]">
                        {avatarPreview ? (
                            <AdaptiveImage
                                src={avatarPreview}
                                alt="头像预览"
                                sizes="80px"
                            />
                        ) : (
                            form.nickname.trim().slice(0, 1) || "我"
                        )}
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-medium text-foreground">个人头像</div>
                        <p className="mt-1 text-[12px] leading-5 text-text-tertiary">
                            支持 JPEG、PNG、WebP、GIF，文件不超过 10MB。
                        </p>
                        <label className="mt-2 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border border-[color:var(--border-default)] bg-white px-3 text-[12.5px] font-medium text-text-secondary transition-colors hover:text-foreground">
                            <Camera className="h-3.5 w-3.5" strokeWidth={1.75} />
                            {avatarFile ? "重新选择" : "选择头像"}
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                className="sr-only"
                                disabled={saving}
                                onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    event.target.value = "";
                                    if (!file) return;
                                    if (!AVATAR_TYPES.has(file.type)) {
                                        setError("头像仅支持 JPEG、PNG、WebP、GIF 图片");
                                        return;
                                    }
                                    if (!file.size || file.size > MAX_AVATAR_SIZE) {
                                        setError("头像图片不能为空且不能超过 10MB");
                                        return;
                                    }
                                    setError("");
                                    setAvatarFile(file);
                                    setAvatarPreview(URL.createObjectURL(file));
                                }}
                            />
                        </label>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <Field label="昵称" className="md:col-span-2">
                        <input
                            value={form.nickname}
                            maxLength={30}
                            onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="个人简介" className="md:col-span-2">
                        <textarea
                            value={form.bio}
                            maxLength={300}
                            rows={3}
                            onChange={(e) => setForm({ ...form, bio: e.target.value })}
                            className={`${inputClass} h-auto resize-none py-3`}
                            placeholder="介绍一下自己和关注的方向"
                        />
                    </Field>
                    <Field label="年龄段">
                        <select
                            value={form.ageRange}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    ageRange: e.target.value as UpdateProfileInput["ageRange"],
                                })
                            }
                            className={inputClass}
                        >
                            {AGE_RANGE_OPTIONS.map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="性别">
                        <select
                            value={form.gender}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    gender: e.target.value as UpdateProfileInput["gender"],
                                })
                            }
                            className={inputClass}
                        >
                            <option value="unknown">不愿透露</option>
                            <option value="male">男</option>
                            <option value="female">女</option>
                            <option value="other">其他</option>
                        </select>
                    </Field>
                    <Field label="省份 / 地区">
                        <select
                            value={form.provinceCode}
                            onChange={(e) => {
                                const selected = CHINA_PROVINCES.find(
                                    ([code]) => code === e.target.value,
                                );
                                setForm({
                                    ...form,
                                    provinceCode: e.target.value,
                                    provinceName: selected?.[1] ?? "",
                                });
                            }}
                            className={inputClass}
                        >
                            <option value="">暂不填写</option>
                            {CHINA_PROVINCES.map(([code, name]) => (
                                <option key={code} value={code}>
                                    {name}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="城市">
                        <input
                            value={form.cityName}
                            maxLength={40}
                            onChange={(e) =>
                                setForm({ ...form, cityCode: "", cityName: e.target.value })
                            }
                            className={inputClass}
                            placeholder="例如：杭州市"
                        />
                    </Field>
                </div>

                {error && <p className="mt-4 text-[12.5px] text-red-600">{error}</p>}
                <div className="mt-6 flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="h-11 flex-1 rounded-[13px] border border-[color:var(--border-default)] text-[13.5px] font-medium"
                    >
                        取消
                    </button>
                    <button
                        onClick={() => void save()}
                        disabled={saving}
                        className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[13px] bg-foreground text-[13.5px] font-medium text-white disabled:opacity-60"
                    >
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {saving && avatarFile ? "上传并保存中…" : saving ? "保存中…" : "保存"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function toForm(profile: MyProfile): UpdateProfileInput {
    return {
        nickname: profile.nickname,
        bio: profile.bio ?? "",
        gender: profile.gender ?? "unknown",
        ageRange: profile.ageRange ?? "unknown",
        provinceCode: profile.provinceCode ?? "",
        provinceName: profile.provinceName ?? "",
        cityCode: profile.cityCode ?? "",
        cityName: profile.cityName ?? "",
    };
}

function Field({
    label,
    className = "",
    children,
}: {
    label: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <label className={`block ${className}`}>
            <span className="mb-1.5 block text-[12.5px] font-medium text-text-secondary">
                {label}
            </span>
            {children}
        </label>
    );
}

const inputClass =
    "h-11 w-full rounded-[13px] border border-[color:var(--border-default)] bg-white px-3 text-[14px] text-foreground outline-none transition focus:border-black/35 focus:ring-4 focus:ring-black/5";
