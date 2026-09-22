"use client";

import { Html } from "@react-three/drei";
import { useMemo } from "react";

import type { NetworkLayout } from "@/lib/layout";
import { contributionLabel, contributions } from "@/lib/normalize";
import type { ModelInfo } from "@/lib/types";
import { formatNumber, neuronLabel } from "@/lib/utils";
import { useScene } from "@/store/scene";

/** Weight, sign and contribution for the connection under the cursor (FR-16). */
export function EdgeTooltip({ model, layout }: { model: ModelInfo; layout: NetworkLayout }) {
  const hovered = useScene((s) => s.hoveredEdge);
  const current = useScene((s) => s.current);

  const contributionMap = useMemo(() => {
    if (!current) return null;
    const map = new Map<string, { value: number; norm: number }>();
    for (const c of contributions(model, current)) {
      map.set(`${c.layer}:${c.from}:${c.to}`, { value: c.value, norm: c.norm });
    }
    return map;
  }, [model, current]);

  if (!hovered) return null;

  const a = layout.positions[hovered.layer][hovered.from];
  const b = layout.positions[hovered.layer + 1][hovered.to];
  const weight = model.weights[hovered.layer][hovered.from][hovered.to];
  const contribution = contributionMap?.get(`${hovered.layer}:${hovered.from}:${hovered.to}`);
  const layerCount = model.architecture.length;

  return (
    <Html
      position={[(a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2]}
      center
      distanceFactor={9}
      zIndexRange={[40, 0]}
      style={{ pointerEvents: "none" }}
    >
      <div className="w-max rounded-md border border-border bg-surface/95 px-3 py-2 font-mono text-[11px] leading-relaxed text-foreground shadow-lg backdrop-blur">
        <div className="text-muted-foreground">
          {neuronLabel(hovered.layer, hovered.from, layerCount)} &rarr;{" "}
          {neuronLabel(hovered.layer + 1, hovered.to, layerCount)}
        </div>
        <div>
          weight{" "}
          <span style={{ color: weight >= 0 ? "var(--accent-positive)" : "var(--accent-negative)" }}>
            {weight >= 0 ? "+" : "−"}
            {formatNumber(Math.abs(weight), 3)}
          </span>
        </div>
        {contribution ? (
          <div>
            contribution {contribution.value >= 0 ? "+" : "−"}
            {formatNumber(Math.abs(contribution.value), 3)}{" "}
            <span className="text-muted-foreground">
              ({contributionLabel(contribution.norm)})
            </span>
          </div>
        ) : (
          <div className="text-muted-foreground">run an inference for contribution</div>
        )}
      </div>
    </Html>
  );
}
