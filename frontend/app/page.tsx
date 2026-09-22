"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { api } from "@/lib/api";
import { useScene } from "@/store/scene";
import { useSyncReducedMotion } from "@/components/use-reduced-motion";
import { Spotlight } from "@/components/aceternity/Spotlight";
import { CanvasHost } from "@/components/canvas/CanvasHost";
import { Header } from "@/components/panels/Header";
import { InputPanel } from "@/components/panels/InputPanel";
import { ResultCard } from "@/components/panels/ResultCard";
import { DockPanel } from "@/components/panels/DockPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function Page() {
  useSyncReducedMotion();

  const model = useScene((s) => s.model);
  const setModel = useScene((s) => s.setModel);
  const phase = useScene((s) => s.phase);
  const focusMode = useScene((s) => s.focusMode);
  const datasetId = useScene((s) => s.datasetId);
  const { data, refetch } = useQuery({
    queryKey: ["model", datasetId],
    queryFn: () => api.model(datasetId),
  });

  useEffect(() => {
    if (data) setModel(data);
  }, [data, setModel]);

  const hasResult = useScene((s) => s.current !== null);
  const introVisible = phase === "idle" && !hasResult;
  const isInferring = phase !== "idle" && phase !== "complete";

  return (
    <main className="relative h-dvh w-dvw overflow-hidden bg-background">
      {/* 1. HERO 3D CANVAS: Full screen background layer */}
      <div className="fixed inset-0 z-0">
        <CanvasHost />
      </div>

      {/* Spotlight background visual effect */}
      <Spotlight />

      {/* 2. HEADER: Fixed top navigation bar */}
      <div className="fixed top-0 inset-x-0 z-20 border-b border-white/5 bg-slate-950/60 backdrop-blur-md">
        <Header model={model} />
      </div>

      {/* 3. INTRO SUBTITLE: Floating top-center banner */}
      {introVisible && !focusMode && (
        <div className="fixed top-16 inset-x-0 z-10 pointer-events-none flex justify-center px-4">
          <div className="max-w-md text-center bg-slate-950/50 p-3 rounded-xl border border-white/10 backdrop-blur-md shadow-xl">
            <h1 className="text-sm font-medium tracking-tight text-foreground sm:text-base">
              Watch a neural network think
            </h1>
            <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
              Explore model inference propagating live through a 3D architecture. Every glow and pulse represents real activation weights from Python backend.
            </p>
          </div>
        </div>
      )}

      {/* 4. PREDICTION CARD: Floating top-right */}
      {!focusMode && model && (
        <div className="fixed top-16 right-4 z-20 pointer-events-auto">
          <ResultCard model={model} />
        </div>
      )}

      {/* 5. MEASUREMENTS INPUT PANEL: Floating bottom-left */}
      {!focusMode && (
        <div
          className={cn(
            "fixed bottom-14 sm:bottom-4 left-4 z-20 pointer-events-none max-w-[calc(100vw-2rem)] sm:max-w-[20rem] max-h-[calc(100vh-8rem)] overflow-y-auto transition-all duration-300",
            isInferring && "opacity-40 hover:opacity-100",
          )}
        >
          {model ? (
            <InputPanel model={model} />
          ) : (
            <div className="panel space-y-4 p-4 w-72">
              <Skeleton className="h-4 w-24" />
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
              <Skeleton className="h-11 w-full" />
            </div>
          )}
        </div>
      )}

      {/* 6. COLLAPSIBLE BOTTOM DOCK BAR: Floating bottom-right */}
      <DockPanel model={model} onRetryBackend={() => void refetch()} />
    </main>
  );
}
