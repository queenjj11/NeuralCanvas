"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, InstancedMesh, Object3D } from "three";

import { anim } from "@/lib/anim";
import { neuronFromIndex, neuronIndex, totalNeurons, type NetworkLayout } from "@/lib/layout";
import { useScene } from "@/store/scene";
import { PALETTE, activationColor } from "./palette";

const BASE_RADIUS = 0.17;

interface Props {
  architecture: number[];
  layout: NetworkLayout;
}

/**
 * Every neuron in one InstancedMesh. Scale and colour are written straight
 * from the mutable animation state each frame — no React state in the hot path.
 */
export function Neurons({ architecture, layout }: Props) {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const color = useMemo(() => new Color(), []);
  const count = totalNeurons(architecture);

  const current = useScene((s) => s.current);
  const selected = useScene((s) => s.selectedNeuron);
  const selectNeuron = useScene((s) => s.selectNeuron);

  /** Sign of each standardized input, for the diverging input palette. */
  const inputSigns = useMemo(
    () => (current?.layers[0]?.activations ?? []).map((z) => z >= 0),
    [current],
  );

  const winner = current?.class_index ?? -1;
  const lastLayer = architecture.length - 1;

  useEffect(() => {
    const mesh = meshRef.current;
    if (mesh && !mesh.instanceColor) {
      for (let i = 0; i < count; i++) mesh.setColorAt(i, PALETTE.dim);
      if (mesh.instanceColor) (mesh.instanceColor as { needsUpdate: boolean }).needsUpdate = true;
    }
  }, [count]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    for (let l = 0; l < architecture.length; l++) {
      for (let i = 0; i < architecture[l]; i++) {
        const flat = neuronIndex(architecture, l, i);
        const brightness = anim.neuron[l]?.[i] ?? 0;
        const p = layout.positions[l][i];

        const isSelected = selected?.layer === l && selected.index === i;
        const isWinner = l === lastLayer && i === winner;

        const scale =
          BASE_RADIUS *
          (1 + brightness * 0.85) *
          (isSelected ? 1.45 : 1) *
          (isWinner ? 1 + anim.ripple * 0.35 : 1);

        dummy.position.set(p.x, p.y, p.z);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(flat, dummy.matrix);

        let accent = PALETTE.positive;
        if (l === 0) accent = inputSigns[i] === false ? PALETTE.negative : PALETTE.positive;
        if (isWinner) accent = PALETTE.signal;
        if (isSelected) accent = PALETTE.white;

        activationColor(color, accent, brightness, isSelected ? 1.6 : 1);
        mesh.setColorAt(flat, color);
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      onClick={(e) => {
        e.stopPropagation();
        if (e.instanceId === undefined) return;
        selectNeuron(neuronFromIndex(architecture, e.instanceId));
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}
