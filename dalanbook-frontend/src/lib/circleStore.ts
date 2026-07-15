import { useSyncExternalStore } from "react";
import type { Circle } from "@/data/mockCircles";
import { circles as baseCircles } from "@/data/mockCircles";

const KEY = "dalanbook.circles.user";
const EMPTY_USER_CIRCLES: UserCircle[] = [];

export type UserCircle = Circle & { isMine: true };

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedCircles: UserCircle[] = EMPTY_USER_CIRCLES;

function read(): UserCircle[] {
  if (typeof window === "undefined") return EMPTY_USER_CIRCLES;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === cachedRaw) return cachedCircles;
    cachedRaw = raw;
    cachedCircles = raw ? (JSON.parse(raw) as UserCircle[]) : EMPTY_USER_CIRCLES;
    return cachedCircles;
  } catch {
    cachedRaw = null;
    cachedCircles = EMPTY_USER_CIRCLES;
    return cachedCircles;
  }
}

function write(list: UserCircle[]) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(list);
  window.localStorage.setItem(KEY, raw);
  cachedRaw = raw;
  cachedCircles = list;
  listeners.forEach((l) => l());
}

export type CreateCircleInput = {
  name: string;
  desc: string;
  category: string;
  tags: string[];
  cover: string;
};

export const circleStore = {
  get: read,
  create(input: CreateCircleInput): UserCircle {
    const id =
      "u-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 6);
    const c: UserCircle = {
      id,
      name: input.name,
      desc: input.desc,
      category: input.category,
      tags: input.tags,
      cover: input.cover,
      members: "1 人",
      posts: "0 条讨论",
      joined: true,
      isMine: true,
    };
    write([c, ...read()]);
    return c;
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useUserCircles(): UserCircle[] {
  return useSyncExternalStore(
    circleStore.subscribe,
    circleStore.get,
    () => EMPTY_USER_CIRCLES,
  );
}

/** All circles: user-created first, then base mock circles. */
export function useAllCircles(): Circle[] {
  const mine = useUserCircles();
  return [...mine, ...baseCircles];
}
