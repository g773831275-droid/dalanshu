import type { AuthUser } from "@/lib/authStore";
import type { MyProfile, UpdateProfileInput } from "@/lib/authApi";

type MockAccount = {
    user: AuthUser;
    email: string;
    password: string;
};

const accounts = new Map<string, MockAccount>();
let currentUser: AuthUser | null = null;
let currentProfile: MyProfile = {
    id: "mock-user-demo",
    nickname: "我",
    avatar: null,
    bio: "记录成长里那些真实的选择与复盘。",
    gender: "unknown",
    ageRange: "25-29",
    provinceCode: "310000",
    provinceName: "上海市",
    cityCode: "310100",
    cityName: "上海市",
    location: "上海市 · 上海市",
    latestDevice: null,
};

accounts.set("demo@dalanbook.com", {
    email: "demo@dalanbook.com",
    password: "dalanbook123",
    user: { id: "mock-user-demo", name: "大蓝书用户" },
});

function delay<T>(value: T): Promise<T> {
    return new Promise((resolve) => globalThis.setTimeout(() => resolve(value), 180));
}

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

export function getMockCaptcha() {
    return delay({ captchaEnabled: false });
}

export function sendMockEmailCode(email: string): Promise<string> {
    const normalized = normalizeEmail(email);
    if (!/^\S+@\S+\.\S+$/.test(normalized)) {
        return Promise.reject(new Error("请输入正确的邮箱"));
    }
    return delay("123456");
}

export function loginMockWithEmail(email: string, password: string): Promise<AuthUser> {
    const account = accounts.get(normalizeEmail(email));
    if (!account || account.password !== password) {
        return Promise.reject(new Error("邮箱或密码错误"));
    }
    currentUser = account.user;
    return delay({ ...account.user });
}

export function registerMockWithEmail(input: {
    email: string;
    emailCode: string;
    password: string;
}): Promise<AuthUser> {
    const email = normalizeEmail(input.email);
    if (!/^\S+@\S+\.\S+$/.test(email)) {
        return Promise.reject(new Error("请输入正确的邮箱"));
    }
    if (accounts.has(email)) return Promise.reject(new Error("该邮箱已被注册"));
    if (input.emailCode !== "123456") return Promise.reject(new Error("邮箱验证码错误"));
    if (input.password.length < 8 || input.password.length > 30) {
        return Promise.reject(new Error("密码长度必须为 8～30 位"));
    }
    const user = {
        id: `mock-user-${Date.now()}`,
        name: email.split("@")[0] || "大蓝书用户",
    };
    accounts.set(email, { email, password: input.password, user });
    currentUser = user;
    return delay({ ...user });
}

export function getMockMe(): Promise<AuthUser> {
    return currentUser ? delay({ ...currentUser }) : Promise.reject(new Error("请先登录"));
}

export function logoutMock(): Promise<void> {
    currentUser = null;
    return delay(undefined);
}

export function getMockMyProfile(): Promise<MyProfile> {
    return delay({ ...currentProfile });
}

export function updateMockMyProfile(input: UpdateProfileInput): Promise<MyProfile> {
    currentProfile = {
        ...currentProfile,
        ...input,
        location: [input.provinceName, input.cityName].filter(Boolean).join(" · "),
    };
    if (currentUser) currentUser = { ...currentUser, name: input.nickname };
    return delay({ ...currentProfile });
}
