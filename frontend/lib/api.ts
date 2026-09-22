import type { DatasetInfo, HistoryItem, ModelInfo, PredictResponse, SamplePreset, ApiErrorBody } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError(0, "network_error", "Can't reach the model service.");
  }

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (body as ApiErrorBody | null)?.error;
    throw new ApiError(
      res.status,
      err?.code ?? "error",
      err?.message ?? `Request failed (${res.status}).`,
      err?.details,
    );
  }
  return body as T;
}

export const api = {
  health: () => request<{ status: string; model_loaded: boolean; version: string }>("/health"),

  datasets: () => request<DatasetInfo[]>("/datasets"),

  model: (dataset = "iris") => request<ModelInfo>(`/model?dataset=${encodeURIComponent(dataset)}`),

  samples: (dataset = "digits") => request<SamplePreset[]>(`/samples?dataset=${encodeURIComponent(dataset)}`),

  /** Returns the prediction plus the client-measured round trip, which is
   *  reported separately from the server's compute time (FR-9). */
  async predict(features: number[], dataset = "iris"): Promise<{ data: PredictResponse; rttMs: number }> {
    const started = performance.now();
    const data = await request<PredictResponse>("/predict", {
      method: "POST",
      body: JSON.stringify({ dataset, features }),
    });
    return { data, rttMs: Math.round(performance.now() - started) };
  },

  history: (limit = 20) => request<HistoryItem[]>(`/history?limit=${limit}`),

  historyItem: (id: number) => request<PredictResponse>(`/history/${id}`),

  clearHistory: () => request<void>("/history", { method: "DELETE" }),
};

export const PRESETS: { label: string; values: number[] }[] = [
  { label: "Setosa", values: [5.1, 3.5, 1.4, 0.2] },
  { label: "Versicolor", values: [6.4, 3.2, 4.5, 1.5] },
  { label: "Virginica", values: [6.3, 3.3, 6.0, 2.5] },
];
