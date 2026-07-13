import { useSyncExternalStore } from "react";

const KEY = "dalanbook.auth.user";

export type MockUser = { id: string; name: string };
export type AuthModalState = {
  open: boolean;
  tab: "login" | "register";
  redirect?: string;
  action?: string;
};

const userListeners = new Set<() => void>();
const modalListeners = new Set<() => void>();

let modalState: AuthModalState = { open: false, tab: "login" };

function read(): MockUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as MockUser) : null;
  } catch {
    return null;
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
  set(user: MockUser | null) {
    if (typeof window === "undefined") return;
    if (user) window.localStorage.setItem(KEY, JSON.stringify(user));
    else window.localStorage.removeItem(KEY);
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

export function useAuthUser(): MockUser | null {
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
