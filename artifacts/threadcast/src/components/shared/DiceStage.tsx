import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { DiceStyle } from "@workspace/api-client-react";
import { createDie, facingQuaternion, type DieSides } from "./dice-geometry";
import { LANDING_START, ROLL_DURATION_MS, rollPose } from "./dice-motion";
import { CanvasDiceStage } from "./CanvasDiceStage";
import "./dice-stage.css";

export { ROLL_DURATION_MS } from "./dice-motion";

export interface StageDie {
  sides: DieSides;
  value: number;
}

export interface DiceStageProps {
  dice: StageDie[];
  style: DiceStyle;
  phase?: "preview" | "rolling" | "settled";
  height?: number;
  className?: string;
  rollKey?: number;
}

type DieObject = ReturnType<typeof createDie> & {
  homeX: number;
  startRotation: THREE.Euler;
  landingFrom?: THREE.Quaternion;
  landingTo?: THREE.Quaternion;
  shadow: THREE.Mesh;
  ring: THREE.Mesh;
};

type SceneRuntime = {
  renderer: THREE.WebGLRenderer;
  camera: THREE.OrthographicCamera;
  items: DieObject[];
  phase: "preview" | "rolling" | "settled";
  rollStart: number;
  rollKey: number;
};

function disposeScene(scene: THREE.Scene) {
  scene.traverse(object => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.LineSegments || object instanceof THREE.Points)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (material instanceof THREE.MeshBasicMaterial && material.map) material.map.dispose();
      material.dispose();
    }
  });
}

function shadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Cannot draw dice shadow");
  const gradient = ctx.createRadialGradient(64, 64, 1, 64, 64, 62);
  gradient.addColorStop(0, "rgba(0,0,0,.62)");
  gradient.addColorStop(.4, "rgba(0,0,0,.29)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

/**
 * A single WebGL scene handles one or both dice. The generated face geometry
 * is numbered; the final orientation points the *actual rolled face* at the camera.
 * The renderer never determines a result: game rules provide that independently.
 */
export function DiceStage({
  dice, style, phase = "preview", height = 230, className = "", rollKey = 0,
}: DiceStageProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const webglFailedRef = useRef(false);
  const sceneRef = useRef<SceneRuntime | null>(null);
  const phaseRef = useRef(phase);
  const valuesRef = useRef(dice.map(d => d.value));
  const styleRef = useRef(style);
  styleRef.current = style;
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const shapeKey = dice.map(d => d.sides).join("-");
  const valuesKey = dice.map(d => d.value).join("-");

  // Render in place rather than creating a new WebGL context every animation frame.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !dice.length || webglFailedRef.current) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      webglFailedRef.current = true;
      setWebglUnavailable(true);
      return;
    }
    setWebglUnavailable(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.48;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 2.2));
    const warm = new THREE.DirectionalLight(0xffdaaa, 3.5);
    warm.position.set(-3, 5, 6);
    scene.add(warm);
    const rim = new THREE.DirectionalLight(0x8dced1, 2.2);
    rim.position.set(4, 2, -4);
    scene.add(rim);
    const camera = new THREE.OrthographicCamera(-3, 3, 2, -2, .1, 100);
    camera.position.set(0, 2.7, 7.5);
    camera.lookAt(0, -.08, 0);
    const shadowMap = shadowTexture();
    const items: DieObject[] = dice.map((die, index) => {
      const model = createDie(die.sides, style);
      const count = dice.length;
      const spread = count === 1 ? 0 : count <= 2 ? 2.65 : 2.05;
      const homeX = (index - (count - 1) / 2) * spread;
      const scale = count === 1 ? 1.18 : count <= 2 ? 1 : .76;
      model.group.position.x = homeX;
      model.group.scale.setScalar(scale);
      scene.add(model.group);

      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(2.25 * scale, 1.65 * scale),
        new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, opacity: .7, depthWrite: false }),
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(homeX, -1.23, 0);
      scene.add(shadow);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.06 * scale, 1.075 * scale, 64),
        new THREE.MeshBasicMaterial({ color: style.edgeColor, transparent: true, opacity: .19, side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(homeX, -1.22, 0);
      scene.add(ring);
      return { ...model, homeX, shadow, ring, startRotation: new THREE.Euler(.4 + index, index * 1.3, .1) };
    });

    const runtime: SceneRuntime = {
      renderer, camera, items, phase: phaseRef.current, rollStart: performance.now(), rollKey,
    };
    sceneRef.current = runtime;
    let raf = 0;
    let visible = true;
    let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motionChange = () => { reducedMotion = motionQuery.matches; };
    motionQuery.addEventListener("change", motionChange);

    const resize = () => {
      const width = mount.clientWidth, displayHeight = mount.clientHeight;
      if (width < 1 || displayHeight < 1) return;
      renderer.setSize(width, displayHeight, false);
      const aspect = width / displayHeight;
      const visibleRadius = dice.length > 2 ? 3.3 : dice.length === 2 ? 2.55 : 1.65;
      const vertical = Math.max(dice.length > 2 ? 2.55 : 2.05, visibleRadius / aspect);
      camera.left = -vertical * aspect;
      camera.right = vertical * aspect;
      camera.top = vertical;
      camera.bottom = -vertical;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    function pointAtResult(item: DieObject, value: number) {
      const face = item.faces[Math.max(0, Math.min(item.faces.length - 1, value - 1))];
      return facingQuaternion(face, camera);
    }

    const render = (now: number) => {
      raf = 0;
      if (!visible || document.hidden) return;
      const current = sceneRef.current;
      if (current !== runtime) return;
      items.forEach((item, index) => {
        const result = valuesRef.current[index] ?? 1;
        const group = item.group;
        const animation = styleRef.current.animation ?? "classic";
        if (runtime.phase === "preview") {
          if (reducedMotion) {
            group.quaternion.copy(pointAtResult(item, result));
            group.position.y = 0;
          } else {
            group.rotation.set(.32 + Math.sin(now * .00032) * .16, now * .00036 + index, .12);
            group.position.y = Math.sin(now * .0018 + index) * .055;
          }
          group.position.x = item.homeX;
        } else if (runtime.phase === "rolling" && !reducedMotion) {
          const t = Math.min(1, (now - runtime.rollStart) / ROLL_DURATION_MS);
          if (t < LANDING_START) {
            const pose = rollPose(animation, t, index, item.startRotation);
            group.rotation.copy(pose.rotation);
            group.position.x = item.homeX + pose.x;
            group.position.y = pose.y;
            item.landingFrom = undefined;
          } else {
            if (!item.landingFrom) {
              item.landingFrom = group.quaternion.clone();
              item.landingTo = pointAtResult(item, result);
            }
            const progress = Math.min(1, (t - LANDING_START) / (1 - LANDING_START));
            const eased = 1 - Math.pow(1 - progress, 3);
            group.quaternion.copy(item.landingFrom).slerp(item.landingTo!, eased);
            group.position.x = THREE.MathUtils.lerp(group.position.x, item.homeX, eased);
            group.position.y = Math.sin(progress * Math.PI) * .08 * (1 - progress);
          }
        } else {
          group.quaternion.copy(pointAtResult(item, result));
          group.position.x = item.homeX;
          group.position.y = 0;
        }
        item.updateAnimation(now, runtime.phase === "rolling", reducedMotion);
        (item.shadow.material as THREE.MeshBasicMaterial).opacity =
          .7 - Math.max(0, group.position.y) * .3;
        const ringMaterial = item.ring.material as THREE.MeshBasicMaterial;
        ringMaterial.opacity = runtime.phase === "rolling" && animation === "ritual" && !reducedMotion
          ? .23 + Math.sin(now * .012) * .12 : .19;
        item.ring.scale.setScalar(runtime.phase === "rolling" && animation === "ritual" && !reducedMotion ? 1.12 : 1);
      });
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    const onVisibility = () => {
      if (!document.hidden && visible && !raf) raf = requestAnimationFrame(render);
      else if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    };
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !document.hidden && !raf) raf = requestAnimationFrame(render);
      else if (!visible) { cancelAnimationFrame(raf); raf = 0; }
    });
    intersection.observe(mount);
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(render);

    return () => {
      sceneRef.current = null;
      cancelAnimationFrame(raf);
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      motionQuery.removeEventListener("change", motionChange);
      disposeScene(scene);
      shadowMap.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
    // Only rebuild the WebGL context when the number or shape of dice changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapeKey]);

  useEffect(() => {
    sceneRef.current?.items.forEach(item => {
      item.updateStyle(style);
      (item.ring.material as THREE.MeshBasicMaterial).color.set(style.edgeColor);
    });
  }, [
    style.bodyColor, style.inkColor, style.edgeColor, style.finish, style.motif,
    style.font, style.pattern, style.inclusion, style.inscription,
  ]);

  useEffect(() => {
    let active = true;
    Promise.all([
      document.fonts.load("700 20px Cinzel"),
      document.fonts.load('700 20px "DM Sans"'),
      document.fonts.load('700 20px "JetBrains Mono"'),
    ]).then(() => {
      if (active) sceneRef.current?.items.forEach(item => item.updateStyle(styleRef.current));
    }).catch(() => {
      // System font fallbacks remain usable if a remote font cannot load.
    });
    return () => { active = false; };
  }, [shapeKey]);

  useEffect(() => {
    valuesRef.current = dice.map(d => d.value);
    phaseRef.current = phase;
    const runtime = sceneRef.current;
    if (!runtime) return;
    if (phase === "rolling" && (runtime.phase !== "rolling" || runtime.rollKey !== rollKey)) {
      runtime.rollStart = performance.now();
      runtime.rollKey = rollKey;
      runtime.items.forEach((item, index) => {
        item.landingFrom = undefined;
        item.landingTo = undefined;
        item.startRotation = new THREE.Euler(.48 + index * .9, index * 1.7, .25);
      });
    }
    runtime.phase = phase;
  }, [phase, rollKey, valuesKey, dice]);

  const label = phase === "rolling"
    ? `Rolling ${dice.map(d => `d${d.sides}`).join(" and ")}`
    : phase === "preview"
      ? `Preview of ${style.name} ${dice.map(d => `d${d.sides}`).join(" and ")}`
      : `Dice showing ${dice.map(d => `d${d.sides}: ${d.value}`).join(", ")}`;

  return (
    <div
      className={`relative w-full overflow-hidden border border-primary/15 ${className}`}
      style={{
        height,
        background: `radial-gradient(ellipse at 50% 56%, ${style.edgeColor}20, transparent 57%), radial-gradient(ellipse at 50% 115%, ${style.bodyColor}aa, transparent 65%), hsl(var(--card))`,
      }}
      role="img"
      aria-label={label}
      data-testid="view-dice-stage"
    >
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{
        backgroundImage: `linear-gradient(90deg, transparent 49.9%, ${style.edgeColor} 50%, transparent 50.1%)`,
      }} />
      <div ref={mountRef} className="absolute inset-0" aria-hidden="true" />
      {webglUnavailable && (
        <CanvasDiceStage dice={dice} style={style} phase={phase} rollKey={rollKey} />
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-2 text-center font-mono text-[9px] uppercase tracking-[.25em] text-muted-foreground/60">
        {phase === "rolling" ? "THE DICE ARE CAST" : phase === "preview" ? "LIVE DIE PREVIEW" : "THE THREAD IS SET"}
      </div>
    </div>
  );
}