"use client";

import { Html } from "@react-three/drei";
import { useMemo } from "react";
import { ringRadius } from "@/lib/layout";
import type { ModelInfo } from "@/lib/types";

export function LayerLabels({ model }: { model: ModelInfo }) {
  const layerInfo = useMemo(() => {
    const layerCount = model.architecture.length;
    const LAYER_SPACING = 3.4;
    return model.architecture.map((count, l) => {
      const x = (l - (layerCount - 1) / 2) * LAYER_SPACING;
      const radius = ringRadius(count);
      const y = -(radius + 1.2);
      const label =
        l === 0
          ? "INPUT"
          : l === layerCount - 1
            ? "OUTPUT"
            : `HIDDEN ${l}`;
      return { l, count, x, y, label };
    });
  }, [model.architecture]);

  return (
    <group>
      {layerInfo.map(({ l, count, x, y, label }) => (
        <Html
          key={l}
          position={[x, y, 0]}
          center
          distanceFactor={15}
          className="pointer-events-none select-none"
        >
          <div className="flex flex-col items-center gap-0.5 text-center">
            <span className="font-mono text-[10px] font-semibold tracking-widest text-cyan-400/80 uppercase">
              {label}
            </span>
            <span className="font-mono text-[9px] text-slate-500">
              {count} {count === 1 ? "neuron" : "neurons"}
            </span>
          </div>
        </Html>
      ))}
    </group>
  );
}
