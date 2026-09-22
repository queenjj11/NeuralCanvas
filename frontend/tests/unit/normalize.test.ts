import { describe, expect, it } from "vitest";

import {
  brightnessMatrix,
  contributionLabel,
  contributions,
  hiddenBrightness,
  inputBrightness,
  isDeadRelu,
  maxAbsWeight,
  topIncoming,
  weightNorm,
} from "@/lib/normalize";
import type { ModelInfo, PredictResponse } from "@/lib/types";

const model: ModelInfo = {
  dataset_id: "iris",
  name: "test",
  model_version: "v1",
  architecture: [2, 2, 2],
  activations: ["relu", "softmax"],
  parameters: 12,
  test_accuracy: 1,
  classes: ["a", "b"],
  features: [],
  weights: [
    [
      [1, -2],
      [0.5, 4],
    ],
    [
      [-1, 2],
      [3, 0.25],
    ],
  ],
  biases: [
    [0, 0],
    [0, 0],
  ],
  activation_norm: { hidden_1: [2, 4] },
  max_abs_weight: 4,
};

const prediction: PredictResponse = {
  id: 1,
  timestamp: "2026-09-20T00:00:00Z",
  prediction: "a",
  class_index: 0,
  confidence: 0.8,
  probabilities: [0.8, 0.2],
  features: [1, 2],
  layers: [
    { name: "input", pre_activations: null, activations: [1.5, -6] },
    { name: "hidden_1", pre_activations: [1, -1], activations: [1, 0] },
    { name: "output", pre_activations: [0.5, -0.5], activations: [0.8, 0.2] },
  ],
  compute_ms: 0.4,
  model_version: "v1",
};

describe("input brightness", () => {
  it("maps |z| to 0..1 over three standard deviations", () => {
    expect(inputBrightness(0)).toBe(0);
    expect(inputBrightness(1.5)).toBeCloseTo(0.5);
    expect(inputBrightness(3)).toBe(1);
  });

  it("clamps beyond three sigma and ignores sign", () => {
    expect(inputBrightness(-9)).toBe(1);
    expect(inputBrightness(-1.5)).toBeCloseTo(inputBrightness(1.5));
  });
});

describe("hidden brightness", () => {
  it("divides by the fixed per-neuron reference, not the current max", () => {
    expect(hiddenBrightness(1, 2)).toBe(0.5);
    // Same activation, same brightness, regardless of other neurons.
    expect(hiddenBrightness(1, 2)).toBe(hiddenBrightness(1, 2));
  });

  it("clamps activations above the reference", () => {
    expect(hiddenBrightness(10, 2)).toBe(1);
  });

  it("survives a zero or missing reference", () => {
    expect(hiddenBrightness(1, 0)).toBe(0);
    expect(hiddenBrightness(1, Number.NaN)).toBe(0);
  });

  it("renders a dead ReLU as fully dim", () => {
    expect(hiddenBrightness(0, 2)).toBe(0);
    expect(isDeadRelu(0)).toBe(true);
    expect(isDeadRelu(0.0001)).toBe(false);
  });
});

describe("brightness matrix", () => {
  it("uses the right rule for each layer", () => {
    const m = brightnessMatrix(model, prediction);
    expect(m[0]).toEqual([inputBrightness(1.5), 1]); // input: |z| / 3, clamped
    expect(m[1]).toEqual([0.5, 0]); // hidden: a / reference
    expect(m[2]).toEqual([0.8, 0.2]); // output: probability as-is
  });

  it("matches the architecture shape", () => {
    expect(brightnessMatrix(model, prediction).map((l) => l.length)).toEqual(
      model.architecture,
    );
  });
});

describe("weights", () => {
  it("normalises thickness against the largest weight in the whole model", () => {
    expect(maxAbsWeight(model)).toBe(4);
    expect(weightNorm(-4, 4)).toBe(1);
    expect(weightNorm(2, 4)).toBe(0.5);
    expect(weightNorm(1, 0)).toBe(0);
  });
});

describe("contributions", () => {
  const all = contributions(model, prediction);

  it("produces one entry per weight", () => {
    expect(all).toHaveLength(8);
  });

  it("is upstream activation times weight", () => {
    const edge = all.find((c) => c.layer === 0 && c.from === 0 && c.to === 1);
    expect(edge?.value).toBeCloseTo(1.5 * -2);
  });

  it("normalises against the largest magnitude in this inference", () => {
    const max = Math.max(...all.map((c) => Math.abs(c.value)));
    expect(all.some((c) => c.norm === 1)).toBe(true);
    expect(max).toBeGreaterThan(0);
  });

  it("gives a dead upstream neuron zero contribution", () => {
    const fromDead = all.filter((c) => c.layer === 1 && c.from === 1);
    expect(fromDead.every((c) => c.value === 0)).toBe(true);
  });

  it("labels contributions qualitatively", () => {
    expect(contributionLabel(0.9)).toBe("High");
    expect(contributionLabel(0.4)).toBe("Medium");
    expect(contributionLabel(0.1)).toBe("Low");
  });

  it("ranks incoming edges strongest first", () => {
    const top = topIncoming(all, 0, 1, 2);
    expect(Math.abs(top[0].value)).toBeGreaterThanOrEqual(Math.abs(top[1].value));
  });
});
