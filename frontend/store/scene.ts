"use client";

import { create } from "zustand";

import type { ModelInfo, PredictResponse } from "@/lib/types";
import { buildLayout, type NetworkLayout } from "@/lib/layout";
import { resetAnim } from "@/lib/anim";

export type Phase =
  | "idle"
  | "loading"
  | "priming"
  | "propagating"
  | "resolving"
  | "complete";

export type Quality = "auto" | "high" | "low";

export interface NeuronRef {
  layer: number;
  index: number;
}
export interface EdgeRef {
  layer: number;
  from: number;
  to: number;
}

interface SceneState {
  datasetId: string;
  datasetLoading: boolean;
  model: ModelInfo | null;
  layout: NetworkLayout | null;
  current: PredictResponse | null;
  /** Client-measured round trip, kept separate from the server compute time. */
  rttMs: number | null;
  phase: Phase;
  speed: 0.5 | 1 | 2;
  selectedNeuron: NeuronRef | null;
  hoveredEdge: EdgeRef | null;
  quality: Quality;
  /** Resolved tier after the auto measurement — what the scene actually renders. */
  effectiveQuality: "high" | "low";
  cinematic: boolean;
  reducedMotion: boolean;
  bloom: boolean;
  focusMode: boolean;
  isDockOpen: boolean;

  setDatasetId: (id: string) => void;
  setDatasetLoading: (loading: boolean) => void;
  setModel: (model: ModelInfo) => void;
  setCurrent: (p: PredictResponse, rttMs: number | null) => void;
  setPhase: (phase: Phase) => void;
  setSpeed: (speed: 0.5 | 1 | 2) => void;
  selectNeuron: (n: NeuronRef | null) => void;
  hoverEdge: (e: EdgeRef | null) => void;
  setQuality: (q: Quality) => void;
  setEffectiveQuality: (q: "high" | "low") => void;
  toggleCinematic: () => void;
  toggleBloom: () => void;
  setReducedMotion: (v: boolean) => void;
  toggleFocusMode: () => void;
  setDockOpen: (open: boolean) => void;
  toggleDockOpen: () => void;
}

export const useScene = create<SceneState>((set) => ({
  datasetId: "iris",
  datasetLoading: false,
  model: null,
  layout: null,
  current: null,
  rttMs: null,
  phase: "idle",
  speed: 1,
  selectedNeuron: null,
  hoveredEdge: null,
  quality: "auto",
  effectiveQuality: "high",
  cinematic: true,
  reducedMotion: false,
  bloom: true,
  focusMode: false,
  isDockOpen: false,

  setDatasetId: (datasetId) => set({ datasetId }),
  setDatasetLoading: (datasetLoading) => set({ datasetLoading }),
  setModel: (model) => {
    resetAnim(model.architecture);
    set({
      model,
      datasetId: model.dataset_id || "iris",
      current: null,
      selectedNeuron: null,
      phase: "idle",
      layout: buildLayout(model.architecture),
    });
  },
  setCurrent: (current, rttMs) => set({ current, rttMs, selectedNeuron: null }),
  setPhase: (phase) => set({ phase }),
  setSpeed: (speed) => set({ speed }),
  selectNeuron: (selectedNeuron) => set({ selectedNeuron }),
  hoverEdge: (hoveredEdge) => set({ hoveredEdge }),
  setQuality: (quality) => set({ quality }),
  setEffectiveQuality: (effectiveQuality) => set({ effectiveQuality }),
  toggleCinematic: () => set((s) => ({ cinematic: !s.cinematic })),
  toggleBloom: () => set((s) => ({ bloom: !s.bloom })),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
  setDockOpen: (isDockOpen) => set({ isDockOpen }),
  toggleDockOpen: () => set((s) => ({ isDockOpen: !s.isDockOpen })),
}));

/** Pulse budget per tier (PRD 9.6). */
export function pulseBudget(quality: "high" | "low") {
  return quality === "high" ? 120 : 40;
}
