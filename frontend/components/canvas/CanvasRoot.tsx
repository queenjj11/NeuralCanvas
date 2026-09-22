"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";

import type { ModelInfo } from "@/lib/types";
import { useScene } from "@/store/scene";
import { NetworkScene } from "./NetworkScene";

/** Dim stand-in shown while /model is still in flight (PRD 9.8). */
function placeholderModel(): ModelInfo {
  const architecture = [4, 6, 4, 3];
  return {
    dataset_id: "iris",
    name: "—",
    model_version: "—",
    architecture,
    activations: [],
    parameters: 0,
    test_accuracy: 0,
    classes: [],
    features: [],
    weights: architecture.slice(0, -1).map((n, l) =>
      Array.from({ length: n }, () => new Array(architecture[l + 1]).fill(0.35)),
    ),
    biases: architecture.slice(1).map((n) => new Array(n).fill(0)),
    activation_norm: {},
    max_abs_weight: 1,
  };
}

export function CanvasRoot() {
  const model = useScene((s) => s.model);
  const effectiveQuality = useScene((s) => s.effectiveQuality);
  const [visible, setVisible] = useState(true);

  const fallback = useMemo(placeholderModel, []);

  // Stop rendering entirely when the tab is hidden (PRD 9.6).
  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const dpr: [number, number] =
    effectiveQuality === "high" ? [1, 2] : [1, 1.5];

  return (
    <Canvas
      frameloop={visible ? "always" : "never"}
      dpr={dpr}
      gl={{ antialias: effectiveQuality === "high", powerPreference: "high-performance" }}
      camera={{ fov: 45, near: 0.1, far: 200, position: [0, 2.2, 12] }}
      /* Decorative: the accessible equivalent lives in the inspector (PRD 10). */
      aria-hidden="true"
      style={{ position: "absolute", inset: 0 }}
    >
      <color attach="background" args={["#08090f"]} />
      <NetworkScene model={model ?? fallback} />
    </Canvas>
  );
}
