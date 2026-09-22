"use client";

import { AnimatePresence, motion } from "motion/react";

import type { ModelInfo } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { useScene } from "@/store/scene";

const percent = (p: number) => `${formatNumber(p * 100, 1)}%`;

/** The payoff: class, confidence, and every class probability (PRD 5.2). */
export function ResultCard({ model }: { model: ModelInfo }) {
  const current = useScene((s) => s.current);
  const phase = useScene((s) => s.phase);
  const reducedMotion = useScene((s) => s.reducedMotion);

  const visible = Boolean(current) && (phase === "complete" || phase === "resolving");

  return (
    <>
      {/* The canvas is decorative; this is the accessible equivalent (PRD 10). */}
      <div aria-live="polite" className="sr-only">
        {current && phase === "complete"
          ? `Prediction: ${current.prediction}, confidence ${formatNumber(
              current.confidence * 100,
              1,
            )} percent`
          : ""}
      </div>

      <AnimatePresence>
        {visible && current && (
          <motion.div
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.15 : 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="panel pointer-events-auto w-[min(22rem,calc(100vw-2rem))] border-indigo-500/30 bg-slate-950/80 p-4 shadow-2xl shadow-indigo-950/50 backdrop-blur-xl"
          >
            <h2 className="micro-label font-medium tracking-[0.2em] text-indigo-300/80">Prediction</h2>

            <div className="mt-1.5 flex items-baseline justify-between gap-3">
              <p className="text-xl font-medium tracking-tight text-foreground">{current.prediction}</p>
              <p className="tabular text-xl font-semibold text-indigo-400">
                {percent(current.confidence)}
              </p>
            </div>

            <ul className="mt-3 space-y-2 max-h-52 overflow-y-auto pr-1">
              {current.probabilities.map((p, i) => {
                const isWinner = i === current.class_index;
                return (
                  <li key={model.classes[i] ?? i} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className={isWinner ? "text-foreground" : "text-muted-foreground"}>
                        {model.classes[i] ?? `Class ${i}`}
                      </span>
                      <span className="tabular text-muted-foreground">{percent(p)}</span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background: isWinner
                            ? "var(--accent-signal)"
                            : "var(--accent-positive)",
                          opacity: isWinner ? 1 : 0.45,
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(p * 100, 1)}%` }}
                        transition={{ duration: reducedMotion ? 0.1 : 0.6, delay: 0.05 * i }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
