import { useEffect, useState } from "react";

export function useLocalList<T>(key: string, initial: T[] = []): [T[], (next: T[] | ((prev: T[]) => T[])) => void] {
  const [val, setVal] = useState<T[]>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T[]) : initial;
    } catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
  }, [key, val]);
  return [val, setVal];
}

export function useLocalValue<T>(key: string, initial: T): [T, (next: T | ((prev: T) => T)) => void] {
  const [val, setVal] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
  }, [key, val]);
  return [val, setVal];
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
