/**
 * The signature animation (PRD 9.4): one GSAP master timeline built from the
 * response's layers. Times are for 1x speed; the timeline's timeScale applies
 * the user's speed setting. Depth is arbitrary — the phases are generated per
 * layer transition, so a [4,8,8,3] model simply takes longer.
 */
import gsap from "gsap";

import { anim, IDLE_BRIGHTNESS, pulses, type Pulse } from "./anim";
import { brightnessMatrix, contributions, topIncoming } from "./normalize";
import { buildLayout, edgeIndex, type NetworkLayout } from "./layout";
import type { ModelInfo, PredictResponse } from "./types";
import type { Phase } from "@/store/scene";

export const PHASE_DURATIONS = {
  prime: 0.4,
  inputStagger: 0.06,
  inputIgnite: 0.35,
  propagate: 0.75,
  activate: 0.3,
  resolve: 0.6,
  ripple: 0.9,
};

export interface TimelineOptions {
  model: ModelInfo;
  prediction: PredictResponse;
  layout: NetworkLayout;
  speed: number;
  reducedMotion: boolean;
  cinematic: boolean;
  /** Pulse budget for the current quality tier. */
  maxPulses: number;
  onPhase: (phase: Phase) => void;
  onComplete: () => void;
}

/**
 * Only the strongest contributors per target neuron get a pulse. This keeps
 * the scene legible (and the pulse count bounded) without lying: the edges
 * that are dropped are the ones that barely moved the downstream neuron.
 */
export function buildPulses(
  model: ModelInfo,
  prediction: PredictResponse,
  layout: NetworkLayout,
  maxPulses: number,
): Pulse[] {
  const all = contributions(model, prediction);
  // Spread the budget evenly over every neuron that can receive a pulse.
  const targetNeurons = model.architecture.slice(1).reduce((sum, n) => sum + n, 0);
  const k = Math.min(6, Math.max(1, Math.floor(maxPulses / Math.max(1, targetNeurons))));

  const chosen: Pulse[] = [];
  for (let l = 0; l < model.architecture.length - 1; l++) {
    for (let to = 0; to < model.architecture[l + 1]; to++) {
      for (const c of topIncoming(all, l, to, k)) {
        if (c.norm < 0.02) continue;
        chosen.push({
          edge: edgeIndex(model.architecture, layout.edgeOffsets, l, c.from, c.to),
          layer: l,
          brightness: Math.max(0.15, c.norm),
          positive: c.value >= 0,
          offset: ((c.from * 7 + c.to * 13) % 10) / 100,
        });
      }
    }
  }

  return chosen
    .sort((a, b) => b.brightness - a.brightness)
    .slice(0, maxPulses);
}

export function buildTimeline(opts: TimelineOptions): gsap.core.Timeline {
  const { model, prediction, layout, speed, reducedMotion, cinematic } = opts;
  const targets = brightnessMatrix(model, prediction);
  const layerCount = model.architecture.length;

  pulses.list = reducedMotion ? [] : buildPulses(model, prediction, layout, opts.maxPulses);
  anim.winner = prediction.class_index;
  anim.ripple = 0;
  anim.running = true;

  const tl = gsap.timeline({
    defaults: { ease: "power2.out" },
    onUpdate() {
      anim.progress = tl.progress();
    },
    onComplete() {
      anim.running = false;
      opts.onComplete();
    },
  });

  // Reduced motion: no drift, no camera moves, no ripple — just a fade to the
  // final activations (FR-20).
  if (reducedMotion) {
    opts.onPhase("resolving");
    targets.forEach((layer, l) => {
      layer.forEach((value, i) => {
        tl.to(anim.neuron[l], { [i]: value, duration: 0.4, ease: "none" }, 0);
      });
    });
    tl.call(() => opts.onPhase("complete"), undefined, 0.4);
    tl.timeScale(speed);
    return tl;
  }

  const focusX = (l: number) => layout.positions[l]?.[0]?.x ?? 0;
  const framing = layout.bounds.radius * 2.6 + layout.bounds.width * 0.9;

  // Phase 0 — prime.
  tl.call(() => opts.onPhase("priming"), undefined, 0);
  if (cinematic) {
    tl.to(
      anim.camera,
      { x: focusX(0) - 1.5, y: 1.2, z: layout.bounds.radius * 3.4, duration: PHASE_DURATIONS.prime },
      0,
    );
    tl.to(anim.lookAt, { x: focusX(0), y: 0, z: 0, duration: PHASE_DURATIONS.prime }, 0);
  }

  // Phase 1 — input neurons ignite in stagger.
  let cursor = PHASE_DURATIONS.prime;
  targets[0].forEach((value, i) => {
    tl.to(
      anim.neuron[0],
      { [i]: Math.max(value, IDLE_BRIGHTNESS), duration: PHASE_DURATIONS.inputIgnite },
      cursor + i * PHASE_DURATIONS.inputStagger,
    );
  });
  cursor += PHASE_DURATIONS.inputIgnite + targets[0].length * PHASE_DURATIONS.inputStagger;

  // Phase 2 + 3 — propagate, then light the layer the pulses arrive at.
  tl.call(() => opts.onPhase("propagating"), undefined, cursor);

  for (let l = 0; l < layerCount - 1; l++) {
    const isLast = l === layerCount - 2;

    anim.edge[l] = 0;
    tl.to(
      anim.edge,
      { [l]: 1, duration: PHASE_DURATIONS.propagate, ease: "none" },
      cursor,
    );

    if (cinematic) {
      tl.to(
        anim.camera,
        {
          x: focusX(l + 1) - 1.5,
          y: 1.2,
          z: layout.bounds.radius * 3.4,
          duration: PHASE_DURATIONS.propagate,
          ease: "power1.inOut",
        },
        cursor,
      );
      tl.to(
        anim.lookAt,
        { x: focusX(l + 1), duration: PHASE_DURATIONS.propagate, ease: "power1.inOut" },
        cursor,
      );
    }

    // Activations land as the pulses arrive, overlapping the tail of the wave.
    const arrival = cursor + PHASE_DURATIONS.propagate * 0.72;
    targets[l + 1].forEach((value, i) => {
      tl.to(
        anim.neuron[l + 1],
        { [i]: Math.max(value, IDLE_BRIGHTNESS * 0.5), duration: PHASE_DURATIONS.activate },
        arrival,
      );
    });

    if (isLast) tl.call(() => opts.onPhase("resolving"), undefined, arrival);
    cursor += PHASE_DURATIONS.propagate;
  }

  // Phase 4 — output resolves, camera pulls back to frame the whole network.
  if (cinematic) {
    tl.to(
      anim.camera,
      { x: 0, y: 2.2, z: framing, duration: PHASE_DURATIONS.resolve, ease: "power2.inOut" },
      cursor,
    );
    tl.to(anim.lookAt, { x: 0, y: 0, z: 0, duration: PHASE_DURATIONS.resolve }, cursor);
  }
  cursor += PHASE_DURATIONS.resolve;

  // Phase 5 — ripple from the winning neuron, then the result card.
  tl.fromTo(
    anim,
    { ripple: 0 },
    { ripple: 1, duration: PHASE_DURATIONS.ripple, ease: "power1.out" },
    cursor,
  );
  tl.call(() => opts.onPhase("complete"), undefined, cursor + 0.15);

  tl.timeScale(speed);
  return tl;
}

/** Jump straight to the finished state (Esc / "Skip"). */
export function snapToEnd(model: ModelInfo, prediction: PredictResponse) {
  const targets = brightnessMatrix(model, prediction);
  targets.forEach((layer, l) => {
    layer.forEach((value, i) => {
      anim.neuron[l][i] = value;
    });
  });
  anim.edge = anim.edge.map(() => 1);
  anim.ripple = 1;
  anim.running = false;
  anim.progress = 1;
}

export { buildLayout };
