/**
 * Display normalisation — the contract in PRD 8.4.
 *
 * The API never rescales values to look nicer, so every mapping from a real
 * number to a brightness happens here and only here.
 */
import type { ModelInfo, PredictResponse } from "./types";
import { clamp, layerKey } from "./format";

/** Input layer: |z| capped at 3 standard deviations. Sign picks the colour. */
export function inputBrightness(z: number) {
  return clamp(Math.abs(z) / 3);
}

/**
 * Hidden layers: divided by a *fixed* per-neuron reference (95th percentile
 * over the training set), not by the current maximum, so a neuron looks the
 * same brightness for the same activation across different inferences.
 */
export function hiddenBrightness(a: number, reference: number) {
  if (!Number.isFinite(reference) || reference <= 0) return 0;
  return clamp(a / reference);
}

/** A dead ReLU is exactly zero and must stay visibly dim. */
export const isDeadRelu = (a: number) => a === 0;

/** Brightness for every neuron in every layer, in layer order. */
export function brightnessMatrix(model: ModelInfo, p: PredictResponse): number[][] {
  const count = model.architecture.length;
  return p.layers.map((layer, l) => {
    if (l === 0) return layer.activations.map(inputBrightness);
    if (l === count - 1) return layer.activations.map((v) => clamp(v));
    const refs = model.activation_norm[layerKey(l, count)] ?? [];
    return layer.activations.map((a, i) => hiddenBrightness(a, refs[i] ?? 1));
  });
}

/** Connection thickness: |w| relative to the largest weight in the whole model. */
export function weightNorm(w: number, maxAbsWeight: number) {
  if (maxAbsWeight <= 0) return 0;
  return clamp(Math.abs(w) / maxAbsWeight);
}

export function maxAbsWeight(model: ModelInfo) {
  if (model.max_abs_weight) return model.max_abs_weight;
  let max = 0;
  for (const layer of model.weights)
    for (const row of layer) for (const w of row) max = Math.max(max, Math.abs(w));
  return max;
}

export interface Contribution {
  layer: number;
  from: number;
  to: number;
  value: number;
  /** |value| relative to the largest contribution in this inference. */
  norm: number;
}

/**
 * Contribution of edge (i -> j) = upstream activation x weight.
 * Normalised by the largest absolute contribution in *this* inference, so the
 * brightest pulse in a run is always legible.
 */
export function contributions(model: ModelInfo, p: PredictResponse): Contribution[] {
  const out: Contribution[] = [];
  let max = 0;

  model.weights.forEach((matrix, l) => {
    const upstream = p.layers[l]?.activations ?? [];
    matrix.forEach((row, i) => {
      row.forEach((w, j) => {
        const value = (upstream[i] ?? 0) * w;
        max = Math.max(max, Math.abs(value));
        out.push({ layer: l, from: i, to: j, value, norm: 0 });
      });
    });
  });

  if (max > 0) for (const c of out) c.norm = Math.abs(c.value) / max;
  return out;
}

/** Qualitative label shown next to a hovered connection (FR-16). */
export function contributionLabel(norm: number): "Low" | "Medium" | "High" {
  if (norm >= 0.66) return "High";
  if (norm >= 0.33) return "Medium";
  return "Low";
}

/** Top-K incoming edges for a neuron, strongest first (FR-22 and pulse budget). */
export function topIncoming(
  all: Contribution[],
  layer: number,
  to: number,
  k: number,
): Contribution[] {
  return all
    .filter((c) => c.layer === layer && c.to === to)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, k);
}
