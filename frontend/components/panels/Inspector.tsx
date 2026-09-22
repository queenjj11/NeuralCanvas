"use client";

import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";

import type { ModelInfo } from "@/lib/types";
import { contributions, topIncoming } from "@/lib/normalize";
import { formatNumber, layerKey, neuronLabel } from "@/lib/utils";
import { useScene } from "@/store/scene";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useMemo } from "react";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular text-right text-foreground">{value}</span>
    </div>
  );
}

const chartConfig = { p: { label: "Probability" } } satisfies ChartConfig;

/**
 * Model facts, the selected neuron, and the output distribution. Everything
 * the 3D scene says visually is available here as text.
 */
export function Inspector({ model }: { model: ModelInfo }) {
  const current = useScene((s) => s.current);
  const rttMs = useScene((s) => s.rttMs);
  const selected = useScene((s) => s.selectedNeuron);
  const selectNeuron = useScene((s) => s.selectNeuron);

  const layerCount = model.architecture.length;
  const all = useMemo(
    () => (current ? contributions(model, current) : []),
    [model, current],
  );

  const detail = (() => {
    if (!selected || !current) return null;
    const layer = current.layers[selected.layer];
    const activation = layer?.activations[selected.index];
    const pre = layer?.pre_activations?.[selected.index] ?? null;
    const bias =
      selected.layer > 0 ? model.biases[selected.layer - 1]?.[selected.index] ?? null : null;
    const incoming = selected.layer > 0 ? model.architecture[selected.layer - 1] : 0;
    const top =
      selected.layer > 0 ? topIncoming(all, selected.layer - 1, selected.index, 3) : [];
    return { activation, pre, bias, incoming, top };
  })();

  const probabilityData = current
    ? current.probabilities.map((p, i) => ({
        label: model.classes[i] ?? `Class ${i}`,
        p,
        winner: i === current.class_index,
      }))
    : [];

  return (
    <div className="flex h-full flex-col gap-3">
      <section>
        <h3 className="micro-label mb-1">Model</h3>
        <Row label="Architecture" value={model.architecture.join(" → ")} />
        <Row
          label="Activation"
          value={`${model.activations[0] ?? "relu"} / ${model.activations.at(-1) ?? "softmax"}`}
        />
        <Row label="Parameters" value={model.parameters} />
        <Row label="Test accuracy" value={`${formatNumber(model.test_accuracy * 100, 1)}%`} />
        <Row label="Version" value={model.model_version} />
        <Row
          label="Compute"
          value={current ? `${formatNumber(current.compute_ms, 2)} ms` : "—"}
        />
        <Row label="Round trip" value={rttMs !== null ? `${rttMs} ms` : "—"} />
      </section>

      <Separator />

      <section>
        <h3 className="micro-label mb-1">
          {selected ? neuronLabel(selected.layer, selected.index, layerCount) : "Neuron"}
        </h3>

        {!selected && (
          <p className="text-sm text-muted-foreground">
            Select a neuron in the network, or from the list below, to see its numbers.
          </p>
        )}

        {selected && !current && (
          <p className="text-sm text-muted-foreground">
            Run an inference to see this neuron&apos;s activation.
          </p>
        )}

        {selected && detail && current && (
          <>
            <Row label="Layer" value={layerKey(selected.layer, layerCount)} />
            <Row
              label="Activation"
              value={
                detail.activation === 0 && selected.layer > 0 && selected.layer < layerCount - 1
                  ? "0.000 (dead ReLU)"
                  : formatNumber(detail.activation ?? 0, 3)
              }
            />
            <Row
              label="Pre-activation"
              value={detail.pre === null ? "—" : formatNumber(detail.pre, 3)}
            />
            <Row
              label="Bias"
              value={detail.bias === null ? "—" : formatNumber(detail.bias, 3)}
            />
            <Row label="Incoming" value={`${detail.incoming} connections`} />

            {detail.top.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="micro-label">Top contributions</p>
                {detail.top.map((c) => (
                  <div
                    key={`${c.from}-${c.to}`}
                    className="tabular flex justify-between text-xs"
                  >
                    <span className="text-muted-foreground">
                      {neuronLabel(selected.layer - 1, c.from, layerCount)}
                    </span>
                    <span
                      style={{
                        color:
                          c.value >= 0 ? "var(--accent-positive)" : "var(--accent-negative)",
                      }}
                    >
                      {c.value >= 0 ? "+" : "−"}
                      {formatNumber(Math.abs(c.value), 3)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <Separator />

      <section>
        <h3 className="micro-label mb-2">Output distribution</h3>
        {current ? (
          <ChartContainer config={chartConfig} className="h-[110px] w-full">
            <BarChart data={probabilityData} layout="vertical" margin={{ left: 8, right: 8 }}>
              <XAxis type="number" domain={[0, 1]} hide />
              <YAxis
                type="category"
                dataKey="label"
                width={96}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <Bar dataKey="p" radius={3} barSize={12} isAnimationActive={false}>
                {probabilityData.map((entry) => (
                  <Cell
                    key={entry.label}
                    fill={entry.winner ? "var(--accent-signal)" : "var(--accent-positive)"}
                    fillOpacity={entry.winner ? 1 : 0.4}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <p className="text-sm text-muted-foreground">No inference yet.</p>
        )}
      </section>

      <Separator />

      {/* Keyboard path to every neuron, since the canvas itself is not focusable. */}
      <section className="min-h-0 flex-1">
        <h3 className="micro-label mb-2">Neurons by layer</h3>
        <ScrollArea className="h-40 pr-3">
          <div className="space-y-3">
            {model.architecture.map((count, l) => (
              <div key={l}>
                <p className="text-xs text-muted-foreground">
                  {layerKey(l, layerCount)} · {count}
                </p>
                <div role="listbox" aria-label={`${layerKey(l, layerCount)} neurons`} className="mt-1 flex flex-wrap gap-1">
                  {Array.from({ length: count }, (_, i) => {
                    const isSelected = selected?.layer === l && selected.index === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => selectNeuron(isSelected ? null : { layer: l, index: i })}
                        className="tabular rounded border px-1.5 py-0.5 text-[11px] transition-colors"
                        style={{
                          borderColor: isSelected ? "var(--accent-positive)" : "var(--border)",
                          color: isSelected ? "var(--accent-positive)" : "var(--muted-foreground)",
                        }}
                      >
                        {neuronLabel(l, i, layerCount)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </section>
    </div>
  );
}
