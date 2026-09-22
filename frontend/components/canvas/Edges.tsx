"use client";

import { useEffect, useMemo, useRef } from "react";
import { Color, InstancedMesh, Object3D, Quaternion, Vector3 } from "three";

import type { NetworkLayout } from "@/lib/layout";
import { weightNorm } from "@/lib/normalize";
import type { ModelInfo } from "@/lib/types";
import { useScene } from "@/store/scene";
import { PALETTE } from "./palette";

const UP = new Vector3(0, 1, 0);
const MIN_WIDTH = 0.006;
const MAX_WIDTH = 0.05;
/** Invisible proxy radius so thin edges are still easy to hover (PRD 9.5). */
const PICK_RADIUS = 0.07;

interface Props {
  model: ModelInfo;
  layout: NetworkLayout;
  maxAbs: number;
}

/**
 * Connections as instanced cylinders: one instance per weight, with thickness
 * from |w| and colour from the sign of w. A second, invisible mesh with a
 * fatter radius does the raycasting.
 */
export function Edges({ model, layout, maxAbs }: Props) {
  const meshRef = useRef<InstancedMesh>(null);
  const pickRef = useRef<InstancedMesh>(null);
  const selected = useScene((s) => s.selectedNeuron);
  const hoverEdge = useScene((s) => s.hoverEdge);

  const count = layout.edges.length;

  const transforms = useMemo(() => {
    const dummy = new Object3D();
    const dir = new Vector3();
    const mid = new Vector3();
    const quat = new Quaternion();

    return layout.edges.map((edge) => {
      const a = new Vector3(edge.a.x, edge.a.y, edge.a.z);
      const b = new Vector3(edge.b.x, edge.b.y, edge.b.z);
      dir.subVectors(b, a);
      const length = dir.length();
      mid.addVectors(a, b).multiplyScalar(0.5);
      quat.setFromUnitVectors(UP, dir.clone().normalize());

      dummy.position.copy(mid);
      dummy.quaternion.copy(quat);

      const w = model.weights[edge.layer][edge.from][edge.to];
      const thickness = MIN_WIDTH + weightNorm(w, maxAbs) * (MAX_WIDTH - MIN_WIDTH);

      dummy.scale.set(thickness, length, thickness);
      dummy.updateMatrix();
      const matrix = dummy.matrix.clone();

      dummy.scale.set(PICK_RADIUS, length, PICK_RADIUS);
      dummy.updateMatrix();

      return { matrix, pickMatrix: dummy.matrix.clone(), weight: w };
    });
  }, [layout, model, maxAbs]);

  // Geometry is static, so matrices are written once.
  useEffect(() => {
    const mesh = meshRef.current;
    const pick = pickRef.current;
    if (!mesh || !pick) return;
    transforms.forEach((t, i) => {
      mesh.setMatrixAt(i, t.matrix);
      pick.setMatrixAt(i, t.pickMatrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    pick.instanceMatrix.needsUpdate = true;
  }, [transforms]);

  // Colours only change when the selection does, so this stays out of useFrame.
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const color = new Color();

    layout.edges.forEach((edge, i) => {
      const w = transforms[i].weight;
      const strength = 0.25 + weightNorm(w, maxAbs) * 0.75;
      const accent = w >= 0 ? PALETTE.positive : PALETTE.negative;

      const connected =
        !selected ||
        (selected.layer === edge.layer + 1 && selected.index === edge.to) ||
        (selected.layer === edge.layer && selected.index === edge.from);

      color.copy(PALETTE.edgeDim).lerp(accent, strength * (connected ? 1 : 0.12));
      color.multiplyScalar(connected ? (selected ? 1.6 : 0.85) : 0.25);
      mesh.setColorAt(i, color);
    });

    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [layout, transforms, maxAbs, selected]);

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <cylinderGeometry args={[1, 1, 1, 6, 1, true]} />
        <meshBasicMaterial toneMapped={false} transparent opacity={0.9} />
      </instancedMesh>

      <instancedMesh
        ref={pickRef}
        args={[undefined, undefined, count]}
        onPointerMove={(e) => {
          e.stopPropagation();
          if (e.instanceId === undefined) return;
          const edge = layout.edges[e.instanceId];
          hoverEdge({ layer: edge.layer, from: edge.from, to: edge.to });
        }}
        onPointerOut={() => hoverEdge(null)}
      >
        <cylinderGeometry args={[1, 1, 1, 4, 1, true]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </instancedMesh>
    </group>
  );
}
