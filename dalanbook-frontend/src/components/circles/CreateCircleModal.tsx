import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { X, Loader2, Hash } from "lucide-react";
import { AdaptiveImage } from "@/components/ui/adaptive-image";
import { circleCategories } from "@/data/mockCircles";
import aiDesk from "@/assets/cover-ai-desk.jpg";
import gym from "@/assets/cover-gym.jpg";
import deskSetup from "@/assets/cover-desk-setup.jpg";
import outdoor from "@/assets/cover-outdoor.jpg";
import edc from "@/assets/cover-edc.jpg";
import gadgets from "@/assets/cover-gadgets.jpg";
import charts from "@/assets/cover-charts.jpg";
import notebook from "@/assets/cover-notebook.jpg";
import planning from "@/assets/cover-planning.jpg";
import code from "@/assets/cover-code.jpg";
import { createCircle } from "@/lib/dalanbookApi";

const covers = [aiDesk, gym, deskSetup, outdoor, edc, gadgets, charts, notebook, planning, code];

const categoryOptions = circleCategories.filter((c) => c !== "全部");

const schema = z.object({
    name: z.string().trim().min(2, "圈子名称至少 2 个字").max(20, "最多 20 个字"),
    desc: z.string().trim().min(10, "简介至少 10 个字").max(80, "最多 80 个字"),
    category: z.enum(categoryOptions as [string, ...string[]], {
        message: "请选择分类",
    }),
    tags: z.array(z.string().min(1).max(8)).max(5, "最多 5 个标签"),
    cover: z.string().min(1, "请选择封面"),
});

const inputCls =
    "h-11 w-full rounded-[10px] border border-[color:var(--border-default)] bg-white/70 px-3 text-[14px] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] placeholder:text-text-tertiary focus:border-black/30 focus:outline-none focus:ring-[3px] focus:ring-black/5";

export function CreateCircleModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [name, setName] = useState("");
    const [desc, setDesc] = useState("");
    const [category, setCategory] = useState(categoryOptions[0]);
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");
    const [cover, setCover] = useState(covers[0]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    if (!open) return null;

    function reset() {
        setName("");
        setDesc("");
        setCategory(categoryOptions[0]);
        setTags([]);
        setTagInput("");
        setCover(covers[0]);
        setErrors({});
        setLoading(false);
    }

    function addTag(v: string) {
        const t = v.trim().replace(/^#/, "");
        if (!t) return;
        if (tags.includes(t)) return;
        if (tags.length >= 5) return;
        setTags([...tags, t.slice(0, 8)]);
        setTagInput("");
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        const r = schema.safeParse({ name, desc, category, tags, cover });
        if (!r.success) {
            const errs: Record<string, string> = {};
            for (const i of r.error.issues) errs[String(i.path[0])] = i.message;
            setErrors(errs);
            return;
        }
        setErrors({});
        setLoading(true);
        try {
            const c = await createCircle(r.data);
            await queryClient.invalidateQueries({ queryKey: ["dalanbook", "circles"] });
            reset();
            onClose();
            navigate({ to: "/circles/$id", params: { id: c.id } });
        } catch (error) {
            setErrors({ form: error instanceof Error ? error.message : "创建失败，请稍后重试" });
            setLoading(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-[85] flex items-end justify-center bg-black/45 backdrop-blur-sm md:items-center"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="glass-elevated relative w-full max-w-[520px] rounded-t-[20px] border border-[color:var(--border)] p-6 md:rounded-[20px] max-h-[92vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-black/[0.04] hover:text-foreground"
                    aria-label="关闭"
                >
                    <X className="h-4 w-4" strokeWidth={1.75} />
                </button>

                <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-foreground">
                    创建圈子
                </h2>
                <p className="mt-1 text-[13px] text-text-secondary">
                    围绕一件你长期做的事，聚集同路人。
                </p>

                <form onSubmit={submit} className="mt-5 space-y-3.5">
                    <div>
                        <span className="text-[12.5px] font-medium text-text-secondary">
                            圈子封面
                        </span>
                        <div className="mt-1.5 grid grid-cols-5 gap-2">
                            {covers.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setCover(c)}
                                    className={
                                        "aspect-[4/3] overflow-hidden rounded-[10px] border-2 transition-all " +
                                        (cover === c
                                            ? "border-foreground shadow-[var(--shadow-subtle)]"
                                            : "border-transparent opacity-70 hover:opacity-100")
                                    }
                                >
                                    <AdaptiveImage src={c} alt="" sizes="96px" />
                                </button>
                            ))}
                        </div>
                    </div>

                    <Field label="圈子名称" error={errors.name} hint={`${name.length}/20`}>
                        <input
                            className={inputCls}
                            placeholder="例如：独立开发者圈"
                            value={name}
                            maxLength={20}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </Field>

                    <Field label="一句话简介" error={errors.desc} hint={`${desc.length}/80`}>
                        <textarea
                            className={inputCls + " h-[76px] resize-none py-2 leading-relaxed"}
                            placeholder="这个圈子讨论什么？欢迎谁加入？"
                            value={desc}
                            maxLength={80}
                            onChange={(e) => setDesc(e.target.value)}
                        />
                    </Field>

                    <Field label="分类" error={errors.category}>
                        <div className="flex flex-wrap gap-1.5">
                            {categoryOptions.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setCategory(c)}
                                    className={
                                        "h-8 rounded-full px-3 text-[12.5px] font-medium transition-colors " +
                                        (category === c
                                            ? "bg-foreground text-white"
                                            : "border border-[color:var(--border)] bg-white/50 text-text-secondary hover:text-foreground")
                                    }
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </Field>

                    <Field label={`标签（最多 5 个，${tags.length}/5）`} error={errors.tags}>
                        <div className="flex flex-wrap items-center gap-1.5 rounded-[10px] border border-[color:var(--border-default)] bg-white/70 px-2 py-2">
                            {tags.map((t) => (
                                <span
                                    key={t}
                                    className="inline-flex items-center gap-1 rounded-full bg-[color:var(--action-muted)] px-2 py-0.5 text-[12px] text-text-secondary"
                                >
                                    <Hash className="h-3 w-3" strokeWidth={1.75} />
                                    {t}
                                    <button
                                        type="button"
                                        onClick={() => setTags(tags.filter((x) => x !== t))}
                                        className="text-text-tertiary hover:text-foreground"
                                        aria-label="删除"
                                    >
                                        <X className="h-3 w-3" strokeWidth={2} />
                                    </button>
                                </span>
                            ))}
                            {tags.length < 5 && (
                                <input
                                    className="min-w-[100px] flex-1 bg-transparent px-1 text-[13px] focus:outline-none"
                                    placeholder="输入后回车添加"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === ",") {
                                            e.preventDefault();
                                            addTag(tagInput);
                                        } else if (
                                            e.key === "Backspace" &&
                                            !tagInput &&
                                            tags.length
                                        ) {
                                            setTags(tags.slice(0, -1));
                                        }
                                    }}
                                />
                            )}
                        </div>
                    </Field>

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-foreground text-[14px] font-medium text-white transition-colors hover:bg-[color:var(--action-primary-hover)] disabled:opacity-70"
                    >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}
                        创建圈子
                    </button>
                    {errors.form && (
                        <p className="text-center text-[12px] text-[#D94B4B]">{errors.form}</p>
                    )}
                </form>
            </div>
        </div>
    );
}

function Field({
    label,
    error,
    hint,
    children,
}: {
    label: string;
    error?: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block">
            <div className="flex items-baseline justify-between">
                <span className="text-[12.5px] font-medium text-text-secondary">{label}</span>
                {hint && <span className="text-[11px] text-text-tertiary">{hint}</span>}
            </div>
            <div className="mt-1.5">{children}</div>
            {error && <span className="mt-1 block text-[11.5px] text-[#D94B4B]">{error}</span>}
        </label>
    );
}
