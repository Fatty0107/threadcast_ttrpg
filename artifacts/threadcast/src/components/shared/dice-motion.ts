import * as THREE from "three";
import type { DiceStyle } from "@workspace/api-client-react";

export const ROLL_DURATION_MS = 1800;
export const LANDING_START = .79;
export type RollMotion = NonNullable<DiceStyle["animation"]>;

/** Shared poses keep GPU and canvas dice using the same choreography. */
export function rollPose(motion: RollMotion, t: number, index: number, start: THREE.Euler) {
  const progress = Math.min(1, t / LANDING_START);
  if (motion === "comet") {
    return {
      rotation: new THREE.Euler(
        start.x + t * Math.PI * (9 + index * .8),
        start.y + t * Math.PI * (6 + index * .7),
        start.z + t * Math.PI * (8 + index),
      ),
      x: Math.sin(progress * Math.PI * 1.6 + index * 1.5) * (1 - progress * .25) * 1.05,
      y: .15 + Math.sin(progress * Math.PI) * 1.05,
    };
  }
  if (motion === "ritual") {
    return {
      rotation: new THREE.Euler(
        start.x + t * Math.PI * (2.8 + index * .3),
        start.y + t * Math.PI * (4 + index * .3),
        start.z + t * Math.PI * (1.8 + index * .2),
      ),
      x: Math.sin(progress * Math.PI * 2 + index * 1.4) * .34,
      y: .3 + Math.sin(progress * Math.PI) * .52,
    };
  }
  if (motion === "tumble") {
    return {
      rotation: new THREE.Euler(
        start.x + t * Math.PI * (11 + index),
        start.y + t * Math.PI * (12.5 + index * 1.4),
        start.z + t * Math.PI * (7 + index),
      ),
      x: Math.sin(t * 27 + index * 2) * (1 - t) * .48,
      y: .08 + Math.abs(Math.sin(t * 17 + index)) * .9 * (1 - t * .5),
    };
  }
  return {
    rotation: new THREE.Euler(
      start.x + t * Math.PI * (6.4 + index * .8),
      start.y + t * Math.PI * (8 + index * 1.2),
      start.z + t * Math.PI * (3.8 + index),
    ),
    x: Math.sin(t * 19 + index * 2.4) * (1 - t) * .25,
    y: .08 + Math.abs(Math.sin(t * 11 + index)) * .57 * (1 - t * .55),
  };
}