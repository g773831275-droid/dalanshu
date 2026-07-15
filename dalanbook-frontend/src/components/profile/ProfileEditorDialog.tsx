import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Laptop, Loader2, Smartphone, X } from "lucide-react";
import { AGE_RANGE_OPTIONS, CHINA_PROVINCES } from "@/data/regions";
import { updateMyProfile, type MyProfile, type UpdateProfileInput } from "@/lib/authApi";

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(toForm(profile));
      setError("");
    }
  }, [open, profile]);

  if (!open) return null;
  const device = profile.latestDevice;
  const deviceTitle = [device?.brand, device?.model].filter(Boolean).join(" ") || device?.deviceType || "网页设备";

  async function save() {
    if (!form.nickname.trim()) {
      setError("昵称不能为空");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const saved = await updateMyProfile(form);
      onSaved(saved);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/35 p-0 backdrop-blur-[2px] md:items-center md:p-6" role="dialog" aria-modal="true" aria-label="编辑个人资料">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[24px] bg-white p-5 shadow-2xl md:max-w-[620px] md:rounded-[24px] md:p-7">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[20px] font-semibold text-foreground">编辑个人资料</h2>
            <p className="mt-1 text-[12.5px] text-text-tertiary">年龄段和地域用于优化内容推荐，可选择不透露。</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5" aria-label="关闭">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="昵称" className="md:col-span-2">
            <input value={form.nickname} maxLength={30} onChange={(e) => setForm({ ...form, nickname: e.target.value })} className={inputClass} />
          </Field>
          <Field label="个人简介" className="md:col-span-2">
            <textarea value={form.bio} maxLength={300} rows={3} onChange={(e) => setForm({ ...form, bio: e.target.value })} className={`${inputClass} h-auto resize-none py-3`} placeholder="介绍一下自己和关注的方向" />
          </Field>
          <Field label="年龄段">
            <select value={form.ageRange} onChange={(e) => setForm({ ...form, ageRange: e.target.value as UpdateProfileInput["ageRange"] })} className={inputClass}>
              {AGE_RANGE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="性别">
            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as UpdateProfileInput["gender"] })} className={inputClass}>
              <option value="unknown">不愿透露</option><option value="male">男</option><option value="female">女</option><option value="other">其他</option>
            </select>
          </Field>
          <Field label="省份 / 地区">
            <select
              value={form.provinceCode}
              onChange={(e) => {
                const selected = CHINA_PROVINCES.find(([code]) => code === e.target.value);
                setForm({ ...form, provinceCode: e.target.value, provinceName: selected?.[1] ?? "" });
              }}
              className={inputClass}
            >
              <option value="">暂不填写</option>
              {CHINA_PROVINCES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </select>
          </Field>
          <Field label="城市">
            <input value={form.cityName} maxLength={40} onChange={(e) => setForm({ ...form, cityCode: "", cityName: e.target.value })} className={inputClass} placeholder="例如：杭州市" />
          </Field>
        </div>

        {device && (
          <div className="mt-5 rounded-[16px] border border-[color:var(--border)] bg-black/[0.025] p-4">
            <div className="flex items-center gap-3">
              {device.deviceType === "desktop" ? <Laptop className="h-5 w-5 text-text-secondary" /> : <Smartphone className="h-5 w-5 text-text-secondary" />}
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-foreground">当前设备：{deviceTitle}</p>
                <p className="mt-0.5 text-[11.5px] text-text-tertiary">{[device.os, device.osVersion, device.browser, device.browserVersion].filter(Boolean).join(" · ")}</p>
              </div>
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-[12.5px] text-red-600">{error}</p>}
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="h-11 flex-1 rounded-[13px] border border-[color:var(--border-default)] text-[13.5px] font-medium">取消</button>
          <button onClick={() => void save()} disabled={saving} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[13px] bg-foreground text-[13.5px] font-medium text-white disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}保存
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

function Field({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
  return <label className={`block ${className}`}><span className="mb-1.5 block text-[12.5px] font-medium text-text-secondary">{label}</span>{children}</label>;
}

const inputClass = "h-11 w-full rounded-[13px] border border-[color:var(--border-default)] bg-white px-3 text-[14px] text-foreground outline-none transition focus:border-black/35 focus:ring-4 focus:ring-black/5";
