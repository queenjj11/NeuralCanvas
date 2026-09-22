"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import type { ModelInfo } from "@/lib/types";
import { formatNumber, relativeTime } from "@/lib/utils";
import { useInference } from "@/hooks/use-inference";
import { useScene } from "@/store/scene";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

export function HistoryPanel({ model }: { model: ModelInfo }) {
  const queryClient = useQueryClient();
  const { replay, isRunning } = useInference();
  const currentId = useScene((s) => s.current?.id);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["history"],
    queryFn: () => api.history(20),
  });

  const clear = useMutation({
    mutationFn: api.clearHistory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
      toast.success("History cleared");
    },
    onError: () => toast.error("Couldn't clear the history."),
  });

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="micro-label">Recent inferences from this demo</h3>
        {data && data.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
                <Trash2 className="size-3" aria-hidden />
                Clear
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear the inference history?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes every stored inference for everyone viewing this demo.
                  It can&apos;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep history</AlertDialogCancel>
                <AlertDialogAction onClick={() => clear.mutate()}>Clear history</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-sm text-muted-foreground">
          History is unavailable while the service is unreachable.
        </p>
      )}

      {data?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nothing here yet. Run your first inference and it will appear for replay.
        </p>
      )}

      {data && data.length > 0 && (
        <ScrollArea className="h-full max-h-72 pr-3">
          <ul className="space-y-1">
            {data.map((item) => {
              const stale = item.model_version !== model.model_version;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={isRunning}
                    onClick={() => replay(item.id)}
                    aria-label={`Replay inference ${item.id}: ${item.prediction}`}
                    className="group flex w-full items-center gap-3 rounded-md border border-transparent px-2 py-2 text-left transition-colors hover:border-border hover:bg-white/[0.03] disabled:opacity-50"
                    style={
                      item.id === currentId
                        ? { borderColor: "var(--border)", background: "rgba(255,255,255,0.03)" }
                        : undefined
                    }
                  >
                    <RotateCcw
                      className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm">{item.prediction}</span>
                        <span className="tabular text-xs text-muted-foreground">
                          {formatNumber(item.confidence * 100, 1)}%
                        </span>
                      </div>
                      <div className="tabular flex justify-between gap-2 text-[11px] text-muted-foreground">
                        <span className="truncate">{item.features.join(" · ")}</span>
                        <span>{relativeTime(item.timestamp)}</span>
                      </div>
                      {stale && (
                        <p className="text-[11px]" style={{ color: "var(--accent-negative)" }}>
                          Recorded on model {item.model_version} — replays with the stored values.
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      )}
    </div>
  );
}
