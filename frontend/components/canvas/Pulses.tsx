"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, InstancedMesh, Object3D, Vector3 } from "three";

import { anim, pulses } from "@/lib/anim";
import type { NetworkLayout } from "@/lib/layout";
import { PALETTE } from "./palette";

interface Props {
  layout: NetworkLayout;
  capacity: number;
}

const HIDDEN_SCALE = 0.0001;

/**
 * Travelling pulses. Brightness is the edge's contribution (activation x
 * weight), so a thick connection carrying a dead ReLU stays dark — which is
 * the whole point of the visualisation.
 */
export function Pulses({ layout, capacity }: Props) {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const color = useMemo(() => new Color(), []);
  const from = useMemo(() => new Vector3(), []);
  const to = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    for (let i = 0; i < capacity; i++) {
      const pulse = pulses.list[i];
      if (!pulse) {
        dummy.scale.setScalar(HIDDEN_SCALE);
        dummy.position.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        continue;
      }

      const wave = anim.edge[pulse.layer] ?? 0;
      const t = wave + pulse.offset - 0.05;

      if (wave <= 0 || t <= 0 || t >= 1) {
        dummy.scale.setScalar(HIDDEN_SCALE);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        continue;
      }

      const edge = layout.edges[pulse.edge];
      if (!edge) continue;

      from.set(edge.a.x, edge.a.y, edge.a.z);
      to.set(edge.b.x, edge.b.y, edge.b.z);
      // Smooth acceleration/deceleration ease curve (PRD 9.4)
      const smoothT = 0.5 - 0.5 * Math.cos(Math.min(1, Math.max(0, t)) * Math.PI);
      dummy.position.lerpVectors(from, to, smoothT);

      // Fade in and out at the ends so pulses do not pop at the neurons.
      const envelope = Math.sin(Math.min(1, Math.max(0, t)) * Math.PI);
      dummy.scale.setScalar(0.038 + pulse.brightness * 0.065 * envelope);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      color
        .copy(pulse.positive ? PALETTE.positive : PALETTE.negative)
        .multiplyScalar(0.9 + pulse.brightness * 2.4 * envelope);
      mesh.setColorAt(i, color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, capacity]} frustumCulled={false}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}
