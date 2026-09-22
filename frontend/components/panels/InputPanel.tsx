"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Play } from "lucide-react";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { PRESETS } from "@/lib/api";
import type { ModelInfo, SamplePreset } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useScene } from "@/store/scene";
import { useInference } from "@/hooks/use-inference";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { DigitSelector } from "./DigitSelector";

const HARD_MIN = 0;
const HARD_MAX = 10;

interface FormValues {
  features: number[];
}

function sliderBounds(feature: ModelInfo["features"][number]) {
  const range = Math.abs(feature.max - feature.min);
  const pad = range > 0 ? range * 0.15 : 1.0;
  return {
    min: Number((feature.min - pad).toFixed(2)),
    max: Number((feature.max + pad).toFixed(2)),
  };
}

export function InputPanel({ model }: { model: ModelInfo }) {
  const { run, isRunning } = useInference();
  const phase = useScene((s) => s.phase);
  const isDigits = model.dataset_id === "digits";

  const schema = useMemo(() => {
    if (isDigits) {
      return z.object({
        features: z.array(z.number({ invalid_type_error: "Enter a number" })).length(8),
      });
    }
    if (model.features.length === 4) {
      return z.object({
        features: z
          .array(
            z
              .number({ invalid_type_error: "Enter a number" })
              .min(HARD_MIN, `Must be at least ${HARD_MIN} cm`)
              .max(HARD_MAX, `Must be at most ${HARD_MAX} cm`),
          )
          .length(4),
      });
    }
    return z.object({
      features: z
        .array(z.number({ invalid_type_error: "Enter a number" }))
        .length(model.features.length),
    });
  }, [model.features.length, isDigits]);

  const defaultValues = useMemo(() => {
    if (isDigits && model.sample_presets?.[0]) {
      const sp = model.sample_presets[0];
      return sp.pca_features ?? sp.raw_features ?? sp.values ?? [];
    }
    const presets = model.sample_presets && model.sample_presets.length > 0
      ? model.sample_presets
      : PRESETS;
    const firstValues = presets[0]?.values ?? model.features.map((f) => f.mean);
    return firstValues;
  }, [model, isDigits]);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    values: { features: defaultValues },
  });

  const values = watch("features");

  const submit = handleSubmit(({ features }) => {
    run(features);
  });

  const presetsToRender: SamplePreset[] = model.sample_presets && model.sample_presets.length > 0
    ? model.sample_presets
    : PRESETS;

  return (
    <form
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (isValid && !isRunning) void submit();
        }
      }}
      className="panel pointer-events-auto flex flex-col gap-4 p-4 border border-white/10 bg-slate-950/80 backdrop-blur-xl shadow-2xl rounded-xl"
    >
      <h2 className="micro-label">
        {isDigits ? "Digit Selection" : "Measurements"}
      </h2>

      {isDigits ? (
        <DigitSelector
          model={model}
          onSelectDigit={(feats) => {
            setValue("features", feats, { shouldValidate: true });
          }}
        />
      ) : (
        <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-1">
          {model.features.map((feature, i) => {
            const bounds = sliderBounds(feature);
            const value = values?.[i] ?? feature.mean;
            const outsideTraining = value < feature.min || value > feature.max;
            const error = errors.features?.[i]?.message;

            return (
              <div key={feature.name || i} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <Label htmlFor={`feature-${i}`} className="text-xs font-normal text-slate-300">
                    {feature.name}
                    {feature.unit && feature.unit !== "unit" && (
                      <span className="ml-1 text-muted-foreground">({feature.unit})</span>
                    )}
                  </Label>
                  <Controller
                    control={control}
                    name={`features.${i}` as const}
                    render={({ field }) => (
                      <Input
                        id={`feature-${i}`}
                        type="number"
                        inputMode="decimal"
                        step={0.1}
                        min={HARD_MIN}
                        max={HARD_MAX}
                        value={Number.isFinite(field.value) ? field.value : ""}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? `feature-${i}-error` : undefined}
                        className="tabular h-7 w-20 text-right text-xs"
                      />
                    )}
                  />
                </div>

                <Controller
                  control={control}
                  name={`features.${i}` as const}
                  render={({ field }) => (
                    <Slider
                      value={[Number.isFinite(field.value) ? field.value : bounds.min]}
                      min={bounds.min}
                      max={bounds.max}
                      step={0.1}
                      onValueChange={([v]) => field.onChange(v)}
                      aria-label={`${feature.name}`}
                    />
                  )}
                />

                {error ? (
                  <p id={`feature-${i}-error`} className="text-[10px] text-destructive">{error}</p>
                ) : outsideTraining ? (
                  <p className="text-[10px] text-muted-foreground/80">
                    Outside training range ({feature.min}–{feature.max}).
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {!isDigits && presetsToRender.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="micro-label">Sample Presets</h3>
          <div className="flex flex-wrap gap-1.5">
            {presetsToRender.map((preset, idx) => {
              const presetVals = preset.values ?? preset.pca_features ?? preset.raw_features;
              if (!presetVals) return null;
              return (
                <Button
                  key={preset.label || idx}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 border-white/10 bg-white/[0.03] px-2 text-[11px] transition-all hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-300"
                  onClick={() =>
                    setValue("features", presetVals.slice(0, model.features.length), {
                      shouldValidate: true,
                    })
                  }
                >
                  {preset.label || `Preset ${idx + 1}`}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      <Button
        type="submit"
        disabled={!isValid || isRunning}
        className={cn(
          "mt-auto h-10 w-full gap-2 rounded-lg border border-cyan-400/30 bg-gradient-to-r from-cyan-600 to-indigo-600 text-xs font-medium tracking-wide text-white shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/35 hover:brightness-110 active:scale-[0.99] disabled:opacity-50",
        )}
      >
        {isRunning ? (
          <>
            <Loader2 className="size-4 animate-spin text-cyan-200" aria-hidden />
            <span>{phase === "loading" ? "Running inference..." : "Visualizing..."}</span>
          </>
        ) : (
          <>
            <Play className="size-4 fill-white/20 text-white" aria-hidden />
            <span>Run inference</span>
          </>
        )}
      </Button>
    </form>
  );
}
