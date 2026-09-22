"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { anim } from "@/lib/anim";
import type { NetworkLayout } from "@/lib/layout";
import { useScene } from "@/store/scene";

/**
 * GSAP tweens the target position in `anim`; this rig eases the real camera
 * toward it. Manual orbiting is disabled only while a cinematic run is in
 * flight, and restored as soon as it finishes (PRD 9.4).
 */
export function CameraRig({ layout }: { layout: NetworkLayout }) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera);
  const cinematic = useScene((s) => s.cinematic);
  const reducedMotion = useScene((s) => s.reducedMotion);

  const distance = layout.bounds.width * 0.9 + layout.bounds.radius * 2.6;

  useEffect(() => {
    camera.position.set(0, 2.2, distance);
    anim.camera.x = 0;
    anim.camera.y = 2.2;
    anim.camera.z = distance;
    camera.lookAt(0, 0, 0);
  }, [camera, distance]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    const driving = anim.running && cinematic && !reducedMotion;

    if (controls) controls.enabled = !driving;
    if (!driving) return;

    const k = Math.min(1, delta * 6);
    camera.position.x += (anim.camera.x - camera.position.x) * k;
    camera.position.y += (anim.camera.y - camera.position.y) * k;
    camera.position.z += (anim.camera.z - camera.position.z) * k;

    if (controls) {
      controls.target.x += (anim.lookAt.x - controls.target.x) * k;
      controls.target.y += (anim.lookAt.y - controls.target.y) * k;
      controls.target.z += (anim.lookAt.z - controls.target.z) * k;
      controls.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={4}
      maxDistance={distance * 2.2}
    />
  );
}
