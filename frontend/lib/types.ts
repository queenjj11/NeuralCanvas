export interface FeatureMeta {
  name: string;
  unit: string;
  min: number;
  max: number;
  mean: number;
  std: number;
}

export interface DatasetInfo {
  id: string;
  name: string;
  description: string;
  architecture: number[];
  task: string;
}

export interface SamplePreset {
  label?: string;
  digit?: number;
  values?: number[];
  raw_features?: number[];
  pca_features?: number[];
}

export interface ModelInfo {
  dataset_id?: string;
  name: string;
  model_version: string;
  architecture: number[];
  activations: string[];
  parameters: number;
  test_accuracy: number;
  classes: string[];
  features: FeatureMeta[];
  weights: number[][][];
  biases: number[][];
  activation_norm: Record<string, number[]>;
  max_abs_weight: number;
  sample_presets?: SamplePreset[];
}

export interface Layer {
  name: string;
  pre_activations: number[] | null;
  activations: number[];
}

export interface PredictResponse {
  id: number;
  timestamp: string;
  prediction: string;
  class_index: number;
  confidence: number;
  probabilities: number[];
  features: number[];
  layers: Layer[];
  compute_ms: number;
  model_version: string;
}

export interface HistoryItem {
  id: number;
  timestamp: string;
  features: number[];
  prediction: string;
  class_index: number;
  confidence: number;
  compute_ms: number;
  model_version: string;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}
