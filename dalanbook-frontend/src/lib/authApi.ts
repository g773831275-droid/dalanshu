import type { AuthUser } from "@/lib/authStore";

const ACCESS_TOKEN_KEY = "dalanbook.auth.accessToken";
const REFRESH_TOKEN_KEY = "dalanbook.auth.refreshToken";
const CLIENT_ID = "e5cd7e4891bf95d1d19206ce24a7b32e";

type R<T> = { code: number; msg?: string; message?: string; data: T };

type LoginData = {
  access_token: string;
  refresh_token?: string;
  expire_in?: number;
  refresh_expire_in?: number;
};

export type Captcha = {
  captchaEnabled: boolean;
  uuid?: string;
  img?: string;
};

export class AuthApiError extends Error {
  constructor(
    message: string,
    readonly code?: number | string,
  ) {
    super(message);
  }
}

function storage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

export function getAccessToken() {
  return storage()?.getItem(ACCESS_TOKEN_KEY) ?? null;
}

export function clearTokens() {
  storage()?.removeItem(ACCESS_TOKEN_KEY);
  storage()?.removeItem(REFRESH_TOKEN_KEY);
}

function saveTokens(data: LoginData) {
  const store = storage();
  if (!store) return;
  store.setItem(ACCESS_TOKEN_KEY, data.access_token);
  if (data.refresh_token) store.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
}

async function readJson(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    throw new AuthApiError("服务响应格式不正确", response.status);
  }
}

function unwrap<T>(payload: any, response: Response): T {
  if (!response.ok) {
    throw new AuthApiError(payload?.message || payload?.msg || "请求失败", response.status);
  }
  if (typeof payload?.code === "number") {
    if (payload.code !== 200) {
      throw new AuthApiError(payload.msg || payload.message || "请求失败", payload.code);
    }
    return payload.data as T;
  }
  if (payload?.code && payload?.message) {
    throw new AuthApiError(payload.message, payload.code);
  }
  return payload as T;
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = storage()?.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return false;
  const response = await fetch("/api/v1/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json", clientid: CLIENT_ID },
    body: JSON.stringify({ refreshToken }),
  });
  const payload = await readJson(response);
  try {
    saveTokens(unwrap<LoginData>(payload, response));
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

export async function authRequest<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = getAccessToken();
  const url = typeof window === "undefined" && path.startsWith("/") ? `http://localhost:8080${path}` : path;
  const response = await fetch(url, {
    ...init,
    headers: {
      clientid: CLIENT_ID,
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const payload = await readJson(response);
  const unauthorized = response.status === 401 || payload?.code === 401;
  if (unauthorized && retry && (await refreshAccessToken())) {
    return authRequest<T>(path, init, false);
  }
  return unwrap<T>(payload, response);
}

export async function getCaptcha(): Promise<Captcha> {
  const captcha = await authRequest<Captcha>("/api/v1/auth/code");
  return {
    ...captcha,
    img: captcha.img && !captcha.img.startsWith("data:")
      ? `data:image/gif;base64,${captcha.img}`
      : captcha.img,
  };
}

export async function sendEmailCode(input: {
  email: string;
  purpose: "register" | "recover";
  uuid?: string;
  code?: string;
}): Promise<string | undefined> {
  const params = new URLSearchParams({ email: input.email, purpose: input.purpose });
  if (input.uuid) params.set("uuid", input.uuid);
  if (input.code) params.set("code", input.code);
  const result = await authRequest<{ devCode?: string }>(`/api/v1/auth/email/code?${params.toString()}`);
  return result?.devCode;
}

export async function loginWithPassword(account: string, password: string, captcha?: {
  uuid?: string;
  code?: string;
}): Promise<AuthUser> {
  const data = await authRequest<LoginData>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({
      account: account.trim(),
      password,
      clientId: CLIENT_ID,
      grantType: "password",
      uuid: captcha?.uuid,
      code: captcha?.code,
    }),
  });
  saveTokens(data);
  const user = await getMe();
  await reportWebDevice().catch(() => undefined);
  return user;
}

export async function registerWithEmail(input: {
  email: string;
  emailCode: string;
  password: string;
}): Promise<AuthUser> {
  const data = await authRequest<LoginData>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
      emailCode: input.emailCode,
      password: input.password,
      clientId: CLIENT_ID,
      grantType: "password",
    }),
  });
  saveTokens(data);
  const user = await getMe();
  await reportWebDevice().catch(() => undefined);
  return user;
}

export async function getMe(): Promise<AuthUser> {
  const user = await authRequest<{
    id: string;
    nickname: string;
    avatar?: string | null;
    bio?: string;
  }>("/api/v1/auth/me");
  return { id: user.id, name: user.nickname || "我", avatar: user.avatar ?? undefined };
}

export async function logout(): Promise<void> {
  try {
    if (getAccessToken()) {
      await authRequest<void>("/api/v1/auth/logout", { method: "POST" }, false);
    }
  } finally {
    clearTokens();
  }
}

export type AgeRange = "unknown" | "under18" | "18-24" | "25-29" | "30-34" | "35-39" | "40-49" | "50plus";

export type DeviceSummary = {
  deviceType: string;
  brand: string;
  model: string;
  os: string;
  osVersion: string;
  browser: string;
  browserVersion: string;
  lastSeenAt: string;
};

export type MyProfile = {
  id: string;
  nickname: string;
  avatar?: string | null;
  bio: string;
  gender: "unknown" | "male" | "female" | "other";
  ageRange: AgeRange;
  provinceCode: string;
  provinceName: string;
  cityCode: string;
  cityName: string;
  location: string;
  latestDevice?: DeviceSummary | null;
};

export type UpdateProfileInput = Pick<MyProfile,
  "nickname" | "bio" | "gender" | "ageRange" | "provinceCode" | "provinceName" | "cityCode" | "cityName"
>;

export function getMyProfile() {
  return authRequest<MyProfile>("/api/v1/me/profile");
}

export function updateMyProfile(input: UpdateProfileInput) {
  return authRequest<MyProfile>("/api/v1/me/profile", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

type UserAgentData = {
  mobile?: boolean;
  platform?: string;
  brands?: Array<{ brand: string; version: string }>;
  getHighEntropyValues?: (hints: string[]) => Promise<Record<string, unknown>>;
};

function matchVersion(ua: string, pattern: RegExp) {
  return ua.match(pattern)?.[1]?.replaceAll("_", ".") ?? "";
}

function browserInfo(ua: string) {
  if (/Edg\//.test(ua)) return { browser: "Edge", version: matchVersion(ua, /Edg\/([\d.]+)/) };
  if (/Firefox\//.test(ua)) return { browser: "Firefox", version: matchVersion(ua, /Firefox\/([\d.]+)/) };
  if (/Chrome\//.test(ua)) return { browser: "Chrome", version: matchVersion(ua, /Chrome\/([\d.]+)/) };
  if (/Safari\//.test(ua)) return { browser: "Safari", version: matchVersion(ua, /Version\/([\d.]+)/) };
  return { browser: "Unknown", version: "" };
}

function osInfo(ua: string, platform?: string) {
  if (/Android/.test(ua)) return { os: "Android", version: matchVersion(ua, /Android\s([\d.]+)/) };
  if (/iPhone|iPad|iPod/.test(ua)) return { os: "iOS", version: matchVersion(ua, /OS\s([\d_]+)/) };
  if (/Windows/.test(ua) || platform === "Windows") return { os: "Windows", version: matchVersion(ua, /Windows NT\s([\d.]+)/) };
  if (/Mac OS X/.test(ua) || platform === "macOS") return { os: "macOS", version: matchVersion(ua, /Mac OS X\s([\d_]+)/) };
  if (/Linux/.test(ua)) return { os: "Linux", version: "" };
  return { os: platform || "Unknown", version: "" };
}

function deviceInfo(ua: string, mobileHint?: boolean, highEntropyModel?: string) {
  const tablet = /iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua));
  const mobile = mobileHint ?? /Mobile|iPhone|Android/.test(ua);
  let brand = "";
  let model = highEntropyModel ?? "";
  if (/iPhone|iPad|iPod/.test(ua)) {
    brand = "Apple";
    model = /iPad/.test(ua) ? "iPad" : "iPhone";
  } else if (/Android/.test(ua)) {
    model ||= ua.match(/;\s*([^;)]+?)\s+Build\//)?.[1]?.trim() ?? "";
    if (/HUAWEI|HarmonyOS/i.test(ua + model)) brand = "Huawei";
    else if (/HONOR/i.test(ua + model)) brand = "Honor";
    else if (/Xiaomi|Redmi|Mi\s/i.test(ua + model)) brand = "Xiaomi";
    else if (/OPPO/i.test(ua + model)) brand = "OPPO";
    else if (/vivo/i.test(ua + model)) brand = "vivo";
    else if (/Samsung|SM-/i.test(ua + model)) brand = "Samsung";
  }
  return { deviceType: tablet ? "tablet" : mobile ? "mobile" : "desktop", brand, model };
}

function deviceId() {
  const key = "dalanbook.deviceId";
  let id = storage()?.getItem(key);
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    storage()?.setItem(key, id);
  }
  return id;
}

export async function reportWebDevice(): Promise<DeviceSummary | undefined> {
  if (typeof window === "undefined" || !getAccessToken()) return undefined;
  const ua = navigator.userAgent;
  const uaData = (navigator as Navigator & { userAgentData?: UserAgentData }).userAgentData;
  let highEntropy: Record<string, unknown> = {};
  try {
    highEntropy = await uaData?.getHighEntropyValues?.(["model", "platformVersion"]) ?? {};
  } catch {
    // Some browsers intentionally withhold high entropy device values.
  }
  const os = osInfo(ua, uaData?.platform);
  const browser = browserInfo(ua);
  const device = deviceInfo(ua, uaData?.mobile, typeof highEntropy.model === "string" ? highEntropy.model : "");
  return authRequest<DeviceSummary>("/api/v1/me/device", {
    method: "POST",
    body: JSON.stringify({
      deviceId: deviceId(),
      source: "web",
      deviceType: device.deviceType,
      brand: device.brand,
      model: device.model,
      os: os.os,
      osVersion: typeof highEntropy.platformVersion === "string" ? highEntropy.platformVersion : os.version,
      browser: browser.browser,
      browserVersion: browser.version,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      pixelRatio: window.devicePixelRatio,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  });
}
