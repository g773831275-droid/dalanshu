import type { AuthUser } from "@/lib/authStore";
import type { MyProfile, UpdateProfileInput } from "@/lib/authApi";

type MockAccount = {
    user: AuthUser;
    phonenumber: string;
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

accounts.set("13800138000", {
    phonenumber: "13800138000",
    password: "dalanbook123",
    user: { id: "mock-user-demo", name: "大蓝岛用户" },
});

function delay<T>(value: T): Promise<T> {
    return new Promise((resolve) => globalThis.setTimeout(() => resolve(value), 180));
}

function normalizePhone(phonenumber: string): string {
    return phonenumber.trim();
}

export function getMockCaptcha() {
    return delay({ captchaEnabled: false });
}

export function sendMockSmsCode(phonenumber: string): Promise<string> {
    const normalized = normalizePhone(phonenumber);
    if (!/^1[3-9]\d{9}$/.test(normalized)) {
        return Promise.reject(new Error("请输入正确的手机号"));
    }
    return delay("123456");
}

export function loginMockWithPhone(phonenumber: string, password: string): Promise<AuthUser> {
    const account = accounts.get(normalizePhone(phonenumber));
    if (!account || account.password !== password) {
        return Promise.reject(new Error("手机号或密码错误"));
    }
    currentUser = account.user;
    return delay({ ...account.user });
}

export function registerMockWithPhone(input: {
    phonenumber: string;
    smsCode: string;
    password: string;
}): Promise<AuthUser> {
    const phonenumber = normalizePhone(input.phonenumber);
    if (!/^1[3-9]\d{9}$/.test(phonenumber)) {
        return Promise.reject(new Error("请输入正确的手机号"));
    }
    if (accounts.has(phonenumber)) return Promise.reject(new Error("该手机号已被注册"));
    if (input.smsCode !== "123456") return Promise.reject(new Error("短信验证码错误"));
    if (input.password.length < 8 || input.password.length > 30) {
        return Promise.reject(new Error("密码长度必须为 8～30 位"));
    }
    const user = {
        id: `mock-user-${Date.now()}`,
        name: `蓝岛用户${phonenumber.slice(-4)}`,
    };
    accounts.set(phonenumber, { phonenumber, password: input.password, user });
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
