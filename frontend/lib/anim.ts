/**
 * Mutable animation state, deliberately outside React.
 *
 * GSAP writes into this object and `useFrame` reads from it, so a 60 fps
 * animation never triggers a React render (PRD 7.3). Only coarse changes —
 * phase, selection, hover — go through the Zustand store.
 */
export interface AnimState {
  /** Current brightness per neuron, per layer. Tweened by GSAP. */
  neuron: number[][];
  /** Progress 0..1 of the pulse wave for each layer transition. */
  edge: number[];
  /** Ripple progress 0..1 from the winning output neuron. */
  ripple: number;
  winner: number;
  progress: number;
  running: boolean;
  /** Camera targets the rig eases toward while the cinematic sequence runs. */
  camera: { x: number; y: number; z: number };
  lookAt: { x: number; y: number; z: number };
}

export const anim: AnimState = {
  neuron: [],
  edge: [],
  ripple: 0,
  winner: -1,
  progress: 0,
  running: false,
  camera: { x: 0, y: 2.5, z: 12 },
  lookAt: { x: 0, y: 0, z: 0 },
};

export const IDLE_BRIGHTNESS = 0.06;

/** Reset to the dim idle baseline for a given architecture (FR-13). */
export function resetAnim(architecture: number[]) {
  anim.neuron = architecture.map((count) => new Array(count).fill(IDLE_BRIGHTNESS));
  anim.edge = new Array(Math.max(0, architecture.length - 1)).fill(0);
  anim.ripple = 0;
  anim.winner = -1;
  anim.progress = 0;
  anim.running = false;
}

/** Pulses are rebuilt per inference; capacity is fixed so nothing allocates mid-flight. */
export interface Pulse {
  edge: number;
  layer: number;
  brightness: number;
  /** Negative weights travel the same path but render in the negative colour. */
  positive: boolean;
  /** Small per-pulse offset so a bundle does not move as one rigid block. */
  offset: number;
}

export const pulses: { list: Pulse[] } = { list: [] };
