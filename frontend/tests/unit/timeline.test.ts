import { describe, expect, it } from "vitest";

import { buildLayout } from "@/lib/layout";
import { buildPulses } from "@/lib/timeline";
import type { ModelInfo, PredictResponse } from "@/lib/types";

const architecture = [2, 3, 2];

const model: ModelInfo = {
  dataset_id: "iris",
  name: "t",
  model_version: "v1",
  architecture,
  activations: ["relu", "softmax"],
  parameters: 0,
  test_accuracy: 1,
  classes: ["a", "b"],
  features: [],
  weights: [
    [
      [1, 2, 3],
      [0.1, 0.2, 0.3],
    ],
    [
      [1, 0.1],
      [2, 0.2],
      [3, 0.3],
    ],
  ],
  biases: [
    [0, 0, 0],
    [0, 0],
  ],
  activation_norm: { hidden_1: [1, 1, 1] },
  max_abs_weight: 3,
};

const prediction: PredictResponse = {
  id: 1,
  timestamp: "2026-09-20T00:00:00Z",
  prediction: "a",
  class_index: 0,
  confidence: 0.9,
  probabilities: [0.9, 0.1],
  features: [1, 1],
  layers: [
    { name: "input", pre_activations: null, activations: [1, 1] },
    { name: "hidden_1", pre_activations: [1, 1, 0], activations: [1, 1, 0] },
    { name: "output", pre_activations: [1, 0], activations: [0.9, 0.1] },
  ],
  compute_ms: 0.2,
  model_version: "v1",
};

describe("pulse selection", () => {
  const layout = buildLayout(architecture);

  it("never exceeds the budget", () => {
    expect(buildPulses(model, prediction, layout, 4).length).toBeLessThanOrEqual(4);
    expect(buildPulses(model, prediction, layout, 120).length).toBeLessThanOrEqual(
      layout.edges.length,
    );
  });

  it("points every pulse at a real edge", () => {
    for (const pulse of buildPulses(model, prediction, layout, 120)) {
      expect(layout.edges[pulse.edge]).toBeDefined();
      expect(layout.edges[pulse.edge].layer).toBe(pulse.layer);
    }
  });

  it("skips edges carrying a dead neuron's zero contribution", () => {
    const pulses = buildPulses(model, prediction, layout, 120);
    const fromDeadHidden = pulses.filter(
      (p) => p.layer === 1 && layout.edges[p.edge].from === 2,
    );
    expect(fromDeadHidden).toHaveLength(0);
  });

  it("keeps the strongest contributors when the budget is tight", () => {
    const pulses = buildPulses(model, prediction, layout, 2);
    expect(pulses[0].brightness).toBeGreaterThanOrEqual(pulses.at(-1)!.brightness);
  });
});
