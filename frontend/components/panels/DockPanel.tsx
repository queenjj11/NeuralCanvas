"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { ModelInfo } from "@/lib/types";
import { useScene } from "@/store/scene";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Inspector } from "./Inspector";
import { HistoryPanel } from "./HistoryPanel";
import { BackendStatus } from "./BackendStatus";

interface DockPanelProps {
  model: ModelInfo | null;
  onRetryBackend: () => void;
}

export function DockPanel({ model, onRetryBackend }: DockPanelProps) {
  const isDockOpen = useScene((s) => s.isDockOpen);
  const setDockOpen = useScene((s) => s.setDockOpen);
  const toggleDockOpen = useScene((s) => s.toggleDockOpen);
  const focusMode = useScene((s) => s.focusMode);

  const [activeTab, setActiveTab] = useState<string>("inspector");

  if (focusMode) return null;

  return (
    <div className="fixed bottom-4 right-4 z-30 flex flex-col items-end pointer-events-none max-w-[calc(100vw-2rem)]">
      <div
        className={cn(
          "pointer-events-auto rounded-xl border border-white/10 bg-slate-950/90 p-3 shadow-2xl backdrop-blur-xl transition-all duration-300 flex flex-col overflow-hidden",
          isDockOpen ? "w-[min(28rem,calc(100vw-2rem))] h-[24rem]" : "w-auto h-auto",
        )}
      >
        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val);
            if (!isDockOpen) setDockOpen(true);
          }}
          className="flex h-full flex-col min-h-0"
        >
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/10">
            <TabsList className="bg-transparent gap-1 p-0">
              <TabsTrigger
                value="inspector"
                className="h-7 px-3 font-mono text-[11px] uppercase tracking-wider data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300"
              >
                Inspector
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="h-7 px-3 font-mono text-[11px] uppercase tracking-wider data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300"
              >
                History
              </TabsTrigger>
            </TabsList>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDockOpen}
              aria-label={isDockOpen ? "Collapse panel" : "Expand panel"}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              {isDockOpen ? (
                <>
                  <ChevronDown className="size-4 mr-1" />
                  Collapse
                </>
              ) : (
                <ChevronUp className="size-4" />
              )}
            </Button>
          </div>

          {isDockOpen && (
            <div className="flex flex-col flex-1 min-h-0 pt-2">
              <BackendStatus onRetry={onRetryBackend} />
              {model ? (
                <>
                  <TabsContent value="inspector" className="min-h-0 flex-1 overflow-y-auto mt-2">
                    <Inspector model={model} />
                  </TabsContent>
                  <TabsContent value="history" className="min-h-0 flex-1 mt-2">
                    <HistoryPanel model={model} />
                  </TabsContent>
                </>
              ) : (
                <div className="text-xs text-muted-foreground p-4 text-center">
                  Connecting to Python backend...
                </div>
              )}
            </div>
          )}
        </Tabs>
      </div>
    </div>
  );
}
