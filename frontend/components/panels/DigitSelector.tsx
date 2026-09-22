"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import type { ModelInfo, SamplePreset } from "@/lib/types";
import { Button } from "@/components/ui/button";

interface DigitSelectorProps {
  model: ModelInfo;
  onSelectDigit: (features: number[]) => void;
  selectedDigit?: number;
}

export function DigitSelector({ model, onSelectDigit, selectedDigit }: DigitSelectorProps) {
  const { data: samplePresets } = useQuery({
    queryKey: ["samples", "digits"],
    queryFn: () => api.samples("digits"),
  });

  const samples: SamplePreset[] = samplePresets && samplePresets.length > 0
    ? samplePresets
    : (model.sample_presets ?? []);

  const [activeIdx, setActiveIdx] = useState<number>(selectedDigit ?? 0);

  const handleSelect = (sample: SamplePreset, idx: number) => {
    setActiveIdx(idx);
    const feats = sample.pca_features ?? sample.raw_features ?? sample.values ?? [];
    onSelectDigit(feats);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="micro-label">Handwritten Digit Samples (0-9)</h3>
        <span className="text-[10px] text-cyan-400 font-mono">8x8 Raw Pixels → PCA 8D</span>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {samples.map((sample, idx) => {
          const digit = sample.digit ?? idx;
          const isSelected = activeIdx === idx;
          const rawPx = sample.raw_features ?? [];

          return (
            <button
              key={digit}
              type="button"
              onClick={() => handleSelect(sample, idx)}
              className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all ${
                isSelected
                  ? "border-cyan-400 bg-cyan-500/15 ring-1 ring-cyan-400 shadow-md shadow-cyan-500/20"
                  : "border-white/10 bg-slate-900/60 hover:border-white/20 hover:bg-slate-800/80"
              }`}
            >
              <span className="font-mono text-xs font-bold text-slate-200">
                {digit}
              </span>

              {rawPx.length === 64 ? (
                <div className="grid grid-cols-8 gap-[1px] w-9 h-9 p-[1px] bg-slate-950 rounded border border-white/10">
                  {rawPx.map((val, pIdx) => {
                    const alpha = Math.min(1, val / 16);
                    return (
                      <div
                        key={pIdx}
                        style={{
                          backgroundColor: alpha > 0 ? `rgba(56, 189, 248, ${alpha})` : "transparent",
                        }}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="size-9 bg-slate-950 rounded border border-white/10 flex items-center justify-center font-mono text-[10px] text-slate-500">
                  {digit}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
