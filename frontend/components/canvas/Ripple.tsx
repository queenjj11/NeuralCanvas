"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { Group, Mesh, MeshBasicMaterial } from "three";

import { anim } from "@/lib/anim";
import type { NetworkLayout } from "@/lib/layout";
import { useScene } from "@/store/scene";
import { PALETTE } from "./palette";

const RINGS = [0, 0.13, 0.26];
const MAX_RADIUS = 3.2;

/** Three concentric rings expanding from the winning output neuron (FR-18). */
export function Ripple({ layout }: { layout: NetworkLayout }) {
  const groupRef = useRef<Group>(null);
  const camera = useThree((s) => s.camera);
  const current = useScene((s) => s.current);
  const reducedMotion = useScene((s) => s.reducedMotion);

  const lastLayer = layout.positions.length - 1;
  const winner = current?.class_index ?? -1;
  const origin = layout.positions[lastLayer]?.[winner];

  useFrame(() => {
    const group = groupRef.current;
    if (!group || !origin) return;

    group.position.set(origin.x, origin.y, origin.z);
    group.quaternion.copy(camera.quaternion); // billboard toward the viewer

    group.children.forEach((child, i) => {
      const mesh = child as Mesh;
      const material = mesh.material as MeshBasicMaterial;
      const t = Math.min(1, Math.max(0, anim.ripple - RINGS[i]) / (1 - RINGS[i]));
      mesh.scale.setScalar(0.25 + t * MAX_RADIUS);
      material.opacity = t > 0 && t < 1 ? (1 - t) * 0.55 : 0;
    });
  });

  if (!origin || reducedMotion) return null;

  return (
    <group ref={groupRef}>
      {RINGS.map((_, i) => (
        <mesh key={i}>
          <ringGeometry args={[0.92, 1, 64]} />
          <meshBasicMaterial
            color={PALETTE.signal}
            transparent
            opacity={0}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
