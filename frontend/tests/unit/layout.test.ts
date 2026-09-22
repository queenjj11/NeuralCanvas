import { describe, expect, it } from "vitest";

import {
  buildLayout,
  edgeIndex,
  neuronFromIndex,
  neuronIndex,
  totalNeurons,
} from "@/lib/layout";

describe("layout builder", () => {
  it("handles an arbitrary architecture", () => {
    for (const architecture of [[4, 6, 4, 3], [4, 8, 8, 3], [2, 3], [1, 1, 1]]) {
      const layout = buildLayout(architecture);
      expect(layout.positions.map((l) => l.length)).toEqual(architecture);
    }
  });

  it("connects every neuron pair in adjacent layers", () => {
    const architecture = [4, 6, 4, 3];
    const layout = buildLayout(architecture);
    const expected = 4 * 6 + 6 * 4 + 4 * 3;
    expect(layout.edges).toHaveLength(expected);
  });

  it("orders edges so edgeIndex can find them in O(1)", () => {
    const architecture = [4, 6, 4, 3];
    const layout = buildLayout(architecture);
    layout.edges.forEach((edge, i) => {
      expect(edgeIndex(architecture, layout.edgeOffsets, edge.layer, edge.from, edge.to)).toBe(i);
    });
  });

  it("spaces layers along x in order", () => {
    const layout = buildLayout([2, 2, 2]);
    const xs = layout.positions.map((layer) => layer[0].x);
    expect(xs[0]).toBeLessThan(xs[1]);
    expect(xs[1]).toBeLessThan(xs[2]);
  });

  it("is deterministic", () => {
    expect(buildLayout([4, 6, 3])).toEqual(buildLayout([4, 6, 3]));
  });

  it("places a single neuron on the axis", () => {
    const layout = buildLayout([1, 1]);
    expect(layout.positions[0][0].y).toBe(0);
    expect(layout.positions[0][0].z).toBe(0);
  });
});

describe("neuron indexing", () => {
  const architecture = [4, 6, 4, 3];

  it("counts every neuron once", () => {
    expect(totalNeurons(architecture)).toBe(17);
  });

  it("round-trips flat indices", () => {
    for (let l = 0; l < architecture.length; l++) {
      for (let i = 0; i < architecture[l]; i++) {
        expect(neuronFromIndex(architecture, neuronIndex(architecture, l, i))).toEqual({
          layer: l,
          index: i,
        });
      }
    }
  });
});
