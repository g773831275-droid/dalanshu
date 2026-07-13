import { useSyncExternalStore } from "react";
import type { Circle } from "@/data/mockCircles";
import { circles as baseCircles } from "@/data/mockCircles";

const KEY = "dalanbook.circles.user";

export type UserCircle = Circle & { isMine: true };

const listeners = new Set<() => void>();

function read(): UserCircle[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as UserCircle[]) : [];
  } catch {
    return [];
  }
}

function write(list: UserCircle[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
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
    () => circleStore.get(),
    () => [] as UserCircle[],
  );
}

/** All circles: user-created first, then base mock circles. */
export function useAllCircles(): Circle[] {
  const mine = useUserCircles();
  return [...mine, ...baseCircles];
}
