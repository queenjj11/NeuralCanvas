"use client";

import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Group } from "three";

import { anim } from "@/lib/anim";
import { buildLayout } from "@/lib/layout";
import { maxAbsWeight } from "@/lib/normalize";
import type { ModelInfo } from "@/lib/types";
import { pulseBudget, useScene } from "@/store/scene";
import { CameraRig } from "./CameraRig";
import { EdgeTooltip } from "./EdgeTooltip";
import { Edges } from "./Edges";
import { LayerLabels } from "./LayerLabels";
import { Neurons } from "./Neurons";
import { Pulses } from "./Pulses";
import { Ripple } from "./Ripple";

/** Low-amplitude idle drift; it damps to a stop while an inference plays. */
function Drift({ children }: { children: React.ReactNode }) {
  const ref = useRef<Group>(null);
  const reducedMotion = useScene((s) => s.reducedMotion);
  const amplitude = useRef(1);

  useFrame((state, delta) => {
    const group = ref.current;
    if (!group || reducedMotion) return;

    const target = anim.running ? 0 : 1;
    amplitude.current += (target - amplitude.current) * Math.min(1, delta * 2.5);

    const t = state.clock.elapsedTime;
    group.rotation.y = Math.sin(t * 0.12) * 0.16 * amplitude.current;
    group.rotation.x = Math.sin(t * 0.09) * 0.05 * amplitude.current;
    group.position.y = Math.sin(t * 0.35) * 0.06 * amplitude.current;
  });

  return <group ref={ref}>{children}</group>;
}

/** Measures the first ~60 frames and drops to the low tier if they are slow. */
function QualityProbe() {
  const quality = useScene((s) => s.quality);
  const setEffectiveQuality = useScene((s) => s.setEffectiveQuality);
  const frames = useRef(0);
  const total = useRef(0);

  useEffect(() => {
    if (quality !== "auto") setEffectiveQuality(quality);
  }, [quality, setEffectiveQuality]);

  useFrame((_, delta) => {
    if (quality !== "auto" || frames.current > 60) return;
    frames.current += 1;
    total.current += delta * 1000;
    if (frames.current === 60) {
      setEffectiveQuality(total.current / 60 > 20 ? "low" : "high");
    }
  });

  return null;
}

function AmbientParticles() {
  const reducedMotion = useScene((s) => s.reducedMotion);
  const count = 160;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 32;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 18;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return pos;
  }, []);

  const pointsRef = useRef<Group>(null);
  useFrame((state) => {
    if (pointsRef.current && !reducedMotion) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.012;
    }
  });

  return (
    <group ref={pointsRef}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.055}
          color="#38bdf8"
          transparent
          opacity={0.22}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  );
}

export function NetworkScene({ model }: { model: ModelInfo }) {
  const layout = useMemo(() => buildLayout(model.architecture), [model.architecture]);
  const maxAbs = useMemo(() => maxAbsWeight(model), [model]);

  const selectNeuron = useScene((s) => s.selectNeuron);
  const effectiveQuality = useScene((s) => s.effectiveQuality);
  const bloom = useScene((s) => s.bloom);

  const capacity = pulseBudget(effectiveQuality);

  return (
    <>
      <QualityProbe />
      <CameraRig layout={layout} />

      <ambientLight intensity={0.45} />
      <directionalLight position={[10, 12, 15]} intensity={0.9} color="#e0f2fe" />
      <directionalLight position={[-10, -8, -10]} intensity={0.35} color="#38bdf8" />

      {/* Clicking empty space clears the selection (FR-17). */}
      <mesh visible={false} onClick={() => selectNeuron(null)} position={[0, 0, -30]}>
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial />
      </mesh>

      <AmbientParticles />

      <Drift>
        <Edges model={model} layout={layout} maxAbs={maxAbs} />
        <Neurons architecture={model.architecture} layout={layout} />
        <Pulses layout={layout} capacity={capacity} />
        <Ripple layout={layout} />
        <EdgeTooltip model={model} layout={layout} />
        <LayerLabels model={model} />
      </Drift>

      {bloom && (
        <EffectComposer enableNormalPass={false}>
          <Bloom
            intensity={effectiveQuality === "high" ? 0.95 : 0.6}
            luminanceThreshold={0.4}
            luminanceSmoothing={0.3}
            mipmapBlur
            resolutionScale={effectiveQuality === "high" ? 1 : 0.5}
          />
          <Vignette eskil={false} offset={0.25} darkness={effectiveQuality === "high" ? 0.65 : 0} />
        </EffectComposer>
      )}
    </>
  );
}
