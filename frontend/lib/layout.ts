/**
 * Scene geometry, derived purely from `architecture` (FR-11).
 * Nothing here knows that the model happens to be [4, 6, 4, 3].
 */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface NetworkLayout {
  /** positions[layer][neuron] */
  positions: Vec3[][];
  /** Flat list of edges in the same order the weight matrices are traversed. */
  edges: { layer: number; from: number; to: number; a: Vec3; b: Vec3 }[];
  /** Index of the first edge of each layer transition, for O(1) lookups. */
  edgeOffsets: number[];
  bounds: { width: number; radius: number };
}

const LAYER_SPACING = 3.4;
const RING_SPACING = 1.25;

/** Deterministic, seeded jitter so the network never looks machine-perfect. */
function jitter(seed: number) {
  const s = Math.sin(seed * 12.9898) * 43758.5453;
  return (s - Math.floor(s) - 0.5) * 0.18;
}

export function ringRadius(count: number) {
  if (count <= 1) return 0;
  return Math.max(1, (RING_SPACING * count) / (2 * Math.PI));
}

export function buildLayout(architecture: number[]): NetworkLayout {
  const layerCount = architecture.length;

  const positions: Vec3[][] = architecture.map((count, l) => {
    const x = (l - (layerCount - 1) / 2) * LAYER_SPACING;
    const radius = ringRadius(count);

    return Array.from({ length: count }, (_, i) => {
      if (count === 1) return { x, y: 0, z: 0 };
      // Neurons sit on a circle in the YZ plane, rotated per layer so adjacent
      // layers do not line up edge-on.
      const angle = (i / count) * Math.PI * 2 + l * 0.35;
      return {
        x: x + jitter(l * 31 + i),
        y: Math.cos(angle) * radius + jitter(l * 17 + i * 7),
        z: Math.sin(angle) * radius + jitter(l * 53 + i * 3),
      };
    });
  });

  const edges: NetworkLayout["edges"] = [];
  const edgeOffsets: number[] = [];

  for (let l = 0; l < layerCount - 1; l++) {
    edgeOffsets.push(edges.length);
    for (let i = 0; i < architecture[l]; i++) {
      for (let j = 0; j < architecture[l + 1]; j++) {
        edges.push({ layer: l, from: i, to: j, a: positions[l][i], b: positions[l + 1][j] });
      }
    }
  }

  return {
    positions,
    edges,
    edgeOffsets,
    bounds: {
      width: (layerCount - 1) * LAYER_SPACING,
      radius: Math.max(...architecture.map(ringRadius), 1),
    },
  };
}

/** Position of a single edge within the flat edge array. */
export function edgeIndex(
  architecture: number[],
  offsets: number[],
  layer: number,
  from: number,
  to: number,
) {
  return offsets[layer] + from * architecture[layer + 1] + to;
}

export function totalNeurons(architecture: number[]) {
  return architecture.reduce((sum, n) => sum + n, 0);
}

/** Flat instance index for a neuron, used by the instanced mesh. */
export function neuronIndex(architecture: number[], layer: number, index: number) {
  let base = 0;
  for (let l = 0; l < layer; l++) base += architecture[l];
  return base + index;
}

/** Inverse of `neuronIndex`. */
export function neuronFromIndex(architecture: number[], flat: number) {
  let remaining = flat;
  for (let l = 0; l < architecture.length; l++) {
    if (remaining < architecture[l]) return { layer: l, index: remaining };
    remaining -= architecture[l];
  }
  return { layer: architecture.length - 1, index: 0 };
}
