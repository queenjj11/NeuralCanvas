import { describe, expect, it } from "vitest";
import { useScene } from "@/store/scene";
import type { ModelInfo } from "@/lib/types";

const mockIrisModel: ModelInfo = {
  dataset_id: "iris",
  name: "Iris Classification",
  model_version: "v1",
  architecture: [4, 6, 4, 3],
  activations: ["relu", "relu", "softmax"],
  parameters: 73,
  test_accuracy: 0.9667,
  classes: ["Iris-setosa", "Iris-versicolor", "Iris-virginica"],
  features: [
    { name: "Sepal length", unit: "cm", min: 4.3, max: 7.9, mean: 5.84, std: 0.83 },
    { name: "Sepal width", unit: "cm", min: 2.0, max: 4.4, mean: 3.05, std: 0.43 },
  ],
  weights: [],
  biases: [],
  activation_norm: {},
  max_abs_weight: 1.5,
};

const mockWineModel: ModelInfo = {
  dataset_id: "wine",
  name: "Wine Classification",
  model_version: "v2",
  architecture: [13, 16, 10, 3],
  activations: ["relu", "relu", "softmax"],
  parameters: 427,
  test_accuracy: 0.9722,
  classes: ["Class 1", "Class 2", "Class 3"],
  features: [
    { name: "Alcohol", unit: "unit", min: 11.0, max: 15.0, mean: 13.0, std: 0.8 },
  ],
  weights: [],
  biases: [],
  activation_norm: {},
  max_abs_weight: 2.1,
};

describe("Multi-dataset scene store state", () => {
  it("defaults to iris dataset", () => {
    const state = useScene.getState();
    expect(state.datasetId).toBe("iris");
  });

  it("updates datasetId and model cleanly when switching datasets", () => {
    useScene.getState().setDatasetId("wine");
    expect(useScene.getState().datasetId).toBe("wine");

    useScene.getState().setModel(mockWineModel);
    const updated = useScene.getState();

    expect(updated.datasetId).toBe("wine");
    expect(updated.model?.architecture).toEqual([13, 16, 10, 3]);
    expect(updated.model?.parameters).toBe(427);
    expect(updated.layout?.bounds.width).toBeGreaterThan(0);
    expect(updated.current).toBeNull();
  });

  it("resets inference state when new model is loaded", () => {
    useScene.getState().setModel(mockIrisModel);
    expect(useScene.getState().model?.architecture).toEqual([4, 6, 4, 3]);
    expect(useScene.getState().phase).toBe("idle");
  });
});
