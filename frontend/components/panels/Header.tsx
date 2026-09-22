"use client";

import { Maximize2, Minimize2, Sparkles } from "lucide-react";

import type { ModelInfo } from "@/lib/types";
import { useScene } from "@/store/scene";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Legend } from "./Legend";
import { DatasetSelector } from "./DatasetSelector";

const SPEEDS = [0.5, 1, 2] as const;

export function Header({ model }: { model: ModelInfo | null }) {
  const speed = useScene((s) => s.speed);
  const setSpeed = useScene((s) => s.setSpeed);
  const cinematic = useScene((s) => s.cinematic);
  const toggleCinematic = useScene((s) => s.toggleCinematic);
  const reducedMotion = useScene((s) => s.reducedMotion);
  const phase = useScene((s) => s.phase);
  const focusMode = useScene((s) => s.focusMode);
  const toggleFocusMode = useScene((s) => s.toggleFocusMode);

  const phaseLabel = (() => {
    switch (phase) {
      case "loading":
        return "COMPUTING FORWARD PASS...";
      case "priming":
      case "propagating":
        return "PROPAGATING ACTIVATION...";
      case "resolving":
        return "RESOLVING OUTPUT...";
      case "complete":
        return "INFERENCE COMPLETE";
      default:
        return null;
    }
  })();

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col">
          <span className="font-mono text-xs font-semibold tracking-[0.25em] text-foreground">
            NEURALCANVAS
          </span>
          <span className="text-[10px] text-muted-foreground">
            Interactive Neural Network Visualization
          </span>
        </div>

        <DatasetSelector />

        {model && (
          <Badge
            variant="outline"
            className="tabular border-white/10 bg-white/[0.03] font-mono text-[11px] font-normal text-slate-300"
          >
            {model.name} · {model.architecture.join(" → ")} ({model.parameters} params)
          </Badge>
        )}

        {phaseLabel && (
          <Badge
            variant="outline"
            className="animate-pulse border-cyan-500/40 bg-cyan-500/10 font-mono text-[10px] tracking-wider text-cyan-300"
          >
            {phaseLabel}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-1">
        {!reducedMotion && (
          <>
            <div
              role="radiogroup"
              aria-label="Animation speed"
              className="mr-1 flex items-center rounded-md border border-border p-0.5"
            >
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={speed === s}
                  onClick={() => setSpeed(s)}
                  className="tabular rounded px-2 py-1 text-[11px] transition-colors"
                  style={{
                    background: speed === s ? "rgba(255,255,255,0.08)" : "transparent",
                    color: speed === s ? "var(--foreground)" : "var(--muted-foreground)",
                  }}
                >
                  {s}×
                </button>
              ))}
            </div>

            <Button
              variant="ghost"
              size="sm"
              aria-pressed={cinematic}
              onClick={toggleCinematic}
              className="h-8 gap-1.5 text-xs"
              style={{ color: cinematic ? "var(--accent-positive)" : undefined }}
            >
              <Sparkles className="size-3.5" aria-hidden />
              Cinematic camera
            </Button>

            <Button
              variant="outline"
              size="sm"
              aria-pressed={focusMode}
              onClick={toggleFocusMode}
              className="h-8 gap-1.5 border-white/10 text-xs hover:bg-white/5"
              style={{ color: focusMode ? "var(--accent-positive)" : undefined }}
            >
              {focusMode ? (
                <>
                  <Minimize2 className="size-3.5" aria-hidden />
                  Exit Focus
                </>
              ) : (
                <>
                  <Maximize2 className="size-3.5" aria-hidden />
                  Focus Network
                </>
              )}
            </Button>
          </>
        )}
        <Legend />
      </div>
    </header>
  );
}
