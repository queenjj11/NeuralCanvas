import { Color } from "three";

/**
 * Scene colours mirror the OKLCH design tokens in globals.css. three.js cannot
 * parse oklch(), so these are the sRGB equivalents of the same tokens — keep
 * the two in step when the palette changes.
 */
export const PALETTE = {
  /** --accent-positive: positive weights, active neurons */
  positive: new Color("#3fdff2"),
  /** --accent-negative: negative weights */
  negative: new Color("#ff5cc0"),
  /** --accent-signal: ripple, winning neuron */
  signal: new Color("#a486ff"),
  /** Idle neurons and dead ReLUs */
  dim: new Color("#1d2740"),
  /** Edges at rest */
  edgeDim: new Color("#141c30"),
  white: new Color("#eef2ff"),
};

/** Brightness -> emissive colour, mixing the dim base toward an accent. */
export function activationColor(
  target: Color,
  accent: Color,
  brightness: number,
  boost = 1,
) {
  target.copy(PALETTE.dim).lerp(accent, Math.min(1, brightness * 1.35));
  const gain = (0.35 + brightness * 1.9) * boost;
  target.multiplyScalar(gain);
  return target;
}
