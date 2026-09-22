"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type gsap from "gsap";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

import { anim, resetAnim } from "@/lib/anim";
import { ApiError, api } from "@/lib/api";
import { buildLayout } from "@/lib/layout";
import { buildTimeline, snapToEnd } from "@/lib/timeline";
import type { PredictResponse } from "@/lib/types";
import { pulseBudget, useScene } from "@/store/scene";

/**
 * Owns the one place a prediction turns into motion: request -> store ->
 * GSAP timeline. Both the input panel and history replay go through it, so a
 * replay is byte-for-byte the same animation as a fresh inference (FR-26).
 */
export function useInference() {
  const queryClient = useQueryClient();
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  const model = useScene((s) => s.model);
  const phase = useScene((s) => s.phase);
  const speed = useScene((s) => s.speed);
  const cinematic = useScene((s) => s.cinematic);
  const reducedMotion = useScene((s) => s.reducedMotion);
  const effectiveQuality = useScene((s) => s.effectiveQuality);
  const setCurrent = useScene((s) => s.setCurrent);
  const setPhase = useScene((s) => s.setPhase);

  const isRunning = phase === "loading" || anim.running;

  const play = useCallback(
    (prediction: PredictResponse) => {
      if (!model) return;
      timelineRef.current?.kill();
      resetAnim(model.architecture);

      timelineRef.current = buildTimeline({
        model,
        prediction,
        layout: buildLayout(model.architecture),
        speed,
        reducedMotion,
        cinematic,
        maxPulses: pulseBudget(effectiveQuality),
        onPhase: setPhase,
        onComplete: () => setPhase("complete"),
      });
    },
    [model, speed, reducedMotion, cinematic, effectiveQuality, setPhase],
  );

  const mutation = useMutation({
    mutationFn: (features: number[]) =>
      api.predict(features, model?.dataset_id || "iris"),
    onMutate: () => setPhase("loading"),
    onSuccess: ({ data, rttMs }) => {
      setCurrent(data, rttMs);
      play(data);
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
    onError: (error: unknown, features) => {
      setPhase("idle");
      const message =
        error instanceof ApiError ? error.message : "Inference failed. Try again.";
      toast.error(message, {
        action: { label: "Retry", onClick: () => mutation.mutate(features) },
      });
    },
  });

  const run = useCallback(
    (features: number[]) => {
      if (isRunning) return; // a second click while running is ignored (FR-10)
      mutation.mutate(features);
    },
    [isRunning, mutation],
  );

  const replay = useCallback(
    async (id: number) => {
      if (isRunning) return;
      setPhase("loading");
      try {
        const stored = await api.historyItem(id);
        setCurrent(stored, null);
        play(stored);
      } catch (error) {
        setPhase("idle");
        const message =
          error instanceof ApiError ? error.message : "Couldn't load that inference.";
        toast.error(message);
      }
    },
    [isRunning, play, setCurrent, setPhase],
  );

  const skip = useCallback(() => {
    const current = useScene.getState().current;
    if (!model || !current || !anim.running) return;
    timelineRef.current?.kill();
    snapToEnd(model, current);
    setPhase("complete");
  }, [model, setPhase]);

  // Esc skips to the final state (FR-19).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [skip]);

  useEffect(() => () => {
    timelineRef.current?.kill();
  }, []);

  return { run, replay, skip, isRunning, isPending: mutation.isPending };
}
