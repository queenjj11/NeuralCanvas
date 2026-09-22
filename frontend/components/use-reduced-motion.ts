"use client";

import { useEffect } from "react";

import { useScene } from "@/store/scene";

/** Keeps the store in sync with the OS setting (FR-20). */
export function useSyncReducedMotion() {
  const setReducedMotion = useScene((s) => s.setReducedMotion);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [setReducedMotion]);
}
