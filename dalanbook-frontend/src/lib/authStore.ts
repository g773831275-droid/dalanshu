import { useSyncExternalStore } from "react";

const KEY = "dalanbook.auth.user";

export type AuthUser = { id: string; name: string; avatar?: string };
export type AuthModalState = {
  open: boolean;
  tab: "login" | "register";
  redirect?: string;
  action?: string;
};

const userListeners = new Set<() => void>();
const modalListeners = new Set<() => void>();
let cachedUserRaw: string | null | undefined;
let cachedUser: AuthUser | null = null;

let modalState: AuthModalState = { open: false, tab: "login" };

function read(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === cachedUserRaw) return cachedUser;
    cachedUserRaw = raw;
    cachedUser = raw ? (JSON.parse(raw) as AuthUser) : null;
    return cachedUser;
  } catch {
    cachedUserRaw = null;
    cachedUser = null;
    return cachedUser;
  }
}

function emitUser() {
  userListeners.forEach((l) => l());
}
function emitModal() {
  modalListeners.forEach((l) => l());
}

export const authStore = {
  get: read,
  set(user: AuthUser | null) {
    if (typeof window === "undefined") return;
    if (user) {
      const raw = JSON.stringify(user);
      window.localStorage.setItem(KEY, raw);
      cachedUserRaw = raw;
      cachedUser = user;
    } else {
      window.localStorage.removeItem(KEY);
      cachedUserRaw = null;
      cachedUser = null;
    }
    emitUser();
  },
  subscribe(l: () => void) {
    userListeners.add(l);
    return () => userListeners.delete(l);
  },
  openAuth(opts?: Partial<Omit<AuthModalState, "open">>) {
    modalState = {
      open: true,
      tab: opts?.tab ?? "login",
      redirect: opts?.redirect,
      action: opts?.action,
    };
    emitModal();
  },
  closeAuth() {
    modalState = { ...modalState, open: false };
    emitModal();
  },
  getModal(): AuthModalState {
    return modalState;
  },
  subscribeModal(l: () => void) {
    modalListeners.add(l);
    return () => modalListeners.delete(l);
  },
};

export function useAuthUser(): AuthUser | null {
  return useSyncExternalStore(
    authStore.subscribe,
    () => authStore.get(),
    () => null,
  );
}

const CLOSED: AuthModalState = { open: false, tab: "login" };
export function useAuthModal(): AuthModalState {
  return useSyncExternalStore(
    authStore.subscribeModal,
    () => authStore.getModal(),
    () => CLOSED,
  );
}
