/**
 * Dependency-free helpers shared by the rendering math and the UI.
 * Kept separate from utils.ts so the scene math never pulls in styling code.
 */
export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

export function formatNumber(v: number, digits = 2) {
  return v.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** "H1-04" / "IN-01" / "OUT-02" — the label used in the inspector and tooltips. */
export function neuronLabel(layerIndex: number, index: number, layerCount: number) {
  const n = String(index + 1).padStart(2, "0");
  if (layerIndex === 0) return `IN-${n}`;
  if (layerIndex === layerCount - 1) return `OUT-${n}`;
  return `H${layerIndex}-${n}`;
}

/** Matches the layer names the API returns, and the activation_norm keys. */
export function layerKey(layerIndex: number, layerCount: number) {
  if (layerIndex === 0) return "input";
  if (layerIndex === layerCount - 1) return "output";
  return `hidden_${layerIndex}`;
}

export function relativeTime(iso: string, now = Date.now()) {
  const secs = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.round(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.round(secs / 3600)}h ago`;
  return `${Math.round(secs / 86400)}d ago`;
}
