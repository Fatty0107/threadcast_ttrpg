import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { DiceStyle } from "@workspace/api-client-react";
import { facingQuaternion, getDieFaces, type DieSides, type Face } from "./dice-geometry";
import { LANDING_START, ROLL_DURATION_MS, rollPose } from "./dice-motion";

type CanvasDie = { sides: DieSides; value: number };
type Phase = "preview" | "rolling" | "settled";

const camera = new THREE.OrthographicCamera(-3, 3, 2, -2, .1, 100);
camera.position.set(0, 2.7, 7.5);
camera.lookAt(0, -.08, 0);
const view = camera.position.clone().normalize();
const screenUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
const screenRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
const light = new THREE.Vector3(-.6, 1, 1.4).normalize();

function fontFamily(font: DiceStyle["font"]) {
  switch (font) {
    case "arcane": return "Cinzel, Georgia, serif";
    case "modern": return '"DM Sans", Arial, sans-serif';
    case "mono": return '"JetBrains Mono", monospace';
    default: return "Georgia, serif";
  }
}

function motifMark(motif: DiceStyle["motif"]) {
  return ({ weave: "≋", stars: "✧", etched: "◇", moon: "☾", thorn: "✦", eye: "◉" } as const)[motif as Exclude<typeof motif, "plain">] ?? "";
}

function faceColor(style: DiceStyle, brightness: number) {
  const color = new THREE.Color(style.bodyColor);
  color.lerp(new THREE.Color(style.edgeColor), .08 + brightness * (style.finish === "metallic" ? .35 : .14));
  if (style.finish === "iridescent") color.lerp(new THREE.Color("#ad89d7"), .22);
  color.lerp(new THREE.Color("#ffffff"), .03 + brightness * (style.finish === "frosted" ? .06 : .12));
  color.multiplyScalar(.8 + brightness * .35);
  return color.getStyle();
}

type CanvasItem = {
  faces: Face[];
  rotation: THREE.Quaternion;
  landingFrom?: THREE.Quaternion;
  start: THREE.Euler;
  x: number;
  y: number;
};

/** A real rotating projection of the polyhedra for browsers without WebGL. */
export function CanvasDiceStage({
  dice, style, phase, rollKey,
}: { dice: CanvasDie[]; style: DiceStyle; phase: Phase; rollKey: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const latest = useRef({ dice, style, phase, rollKey, rollStart: performance.now() });
  if (phase === "rolling" && (latest.current.phase !== "rolling" || latest.current.rollKey !== rollKey)) {
    latest.current.rollStart = performance.now();
  }
  latest.current.dice = dice;
  latest.current.style = style;
  latest.current.phase = phase;
  latest.current.rollKey = rollKey;
  const shapeKey = dice.map(d => d.sides).join("-");

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const items: CanvasItem[] = dice.map((die, index) => ({
      faces: getDieFaces(die.sides),
      rotation: new THREE.Quaternion(),
      start: new THREE.Euler(.48 + index * .9, index * 1.7, .25),
      x: 0, y: 0,
    }));
    let raf = 0, visible = true;
    let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = () => { reducedMotion = motionQuery.matches; };
    motionQuery.addEventListener("change", onMotionChange);

    const render = (now: number) => {
      raf = 0;
      if (!visible || document.hidden) return;
      const { style: design, phase: currentPhase, dice: currentDice, rollStart } = latest.current;
      const width = canvas.clientWidth, height = canvas.clientHeight;
      ctx.clearRect(0, 0, width, height);
      const count = currentDice.length;
      const scale = Math.min(height * .36, width / Math.max(3, count * 2.65));
      const spacing = Math.min(width / Math.max(1, count), scale * 3.05);
      const centerY = height * .49;

      items.forEach((item, index) => {
        const cx = width / 2 + (index - (count - 1) / 2) * spacing;
        const value = currentDice[index]?.value ?? 1;
        const motion = design.animation ?? "classic";
        const target = facingQuaternion(item.faces[Math.min(item.faces.length - 1, Math.max(0, value - 1))], camera);
        if (currentPhase === "preview" && !reducedMotion) {
          item.rotation.setFromEuler(new THREE.Euler(.36 + Math.sin(now * .0006) * .22, now * .00055 + index, .14));
          item.x = 0; item.y = Math.sin(now * .0018 + index) * .07;
          item.landingFrom = undefined;
        } else if (currentPhase === "rolling" && !reducedMotion) {
          const t = Math.min(1, (now - rollStart) / ROLL_DURATION_MS);
          if (t < LANDING_START) {
            const pose = rollPose(motion, t, index, item.start);
            item.rotation.setFromEuler(pose.rotation);
            item.x = pose.x; item.y = pose.y;
            item.landingFrom = undefined;
          } else {
            item.landingFrom ??= item.rotation.clone();
            const progress = (t - LANDING_START) / (1 - LANDING_START);
            const eased = 1 - Math.pow(1 - progress, 3);
            item.rotation.copy(item.landingFrom).slerp(target, eased);
            item.x *= 1 - eased;
            item.y = Math.sin(progress * Math.PI) * .08;
          }
        } else {
          item.rotation.copy(target);
          item.x = 0; item.y = 0;
          item.landingFrom = undefined;
        }

        const offsetX = cx + item.x * scale, offsetY = centerY - item.y * scale;
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,.28)";
        ctx.beginPath();
        ctx.ellipse(cx, centerY + scale * 1.39, scale * 1.2, scale * .14, 0, 0, Math.PI * 2);
        ctx.fill();
        if (currentPhase === "rolling" && motion === "ritual" && !reducedMotion) {
          ctx.strokeStyle = design.edgeColor;
          ctx.globalAlpha = .3 + Math.sin(now * .012) * .12;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(cx, centerY + scale * 1.38, scale * 1.35, scale * .3, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        if (currentPhase === "rolling" && motion === "comet" && !reducedMotion) {
          ctx.strokeStyle = design.edgeColor;
          ctx.globalAlpha = .38;
          ctx.lineWidth = 5;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(offsetX - scale * .9, offsetY + scale * .2);
          ctx.lineTo(offsetX - scale * 1.6, offsetY + scale * .52);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        const project = (point: THREE.Vector3) => {
          const rotated = point.clone().applyQuaternion(item.rotation);
          return { x: offsetX + rotated.dot(screenRight) * scale, y: offsetY - rotated.dot(screenUp) * scale, depth: rotated.dot(view) };
        };
        const visibleFaces = item.faces.map((face, faceIndex) => {
          const normal = face.normal.clone().applyQuaternion(item.rotation);
          return { face, faceIndex, normal, points: face.vertices.map(project), center: project(face.center) };
        }).filter(face => face.normal.dot(view) > .035)
          .sort((a, b) => a.center.depth - b.center.depth);

        visibleFaces.forEach(({ face, faceIndex, normal, points, center }) => {
          ctx.beginPath();
          points.forEach((point, i) => i === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y));
          ctx.closePath();
          ctx.fillStyle = faceColor(design, Math.max(0, normal.dot(light)));
          ctx.fill();
          ctx.save();
          ctx.clip();
          if (design.finish === "liquid-core" || design.finish === "glass" || design.finish === "iridescent") {
            const glow = ctx.createRadialGradient(center.x - scale * .2, center.y - scale * .25, 2, center.x, center.y, scale);
            glow.addColorStop(0, design.finish === "iridescent" ? "#b1a3e3ae" : `${design.edgeColor}bd`);
            glow.addColorStop(.48, `${design.bodyColor}72`);
            glow.addColorStop(1, "transparent");
            ctx.fillStyle = glow;
            ctx.fillRect(center.x - scale, center.y - scale, scale * 2, scale * 2);
          }
          if (design.pattern && design.pattern !== "none") {
            ctx.strokeStyle = design.edgeColor;
            ctx.globalAlpha = .3;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(center.x - scale, center.y - scale * .3);
            ctx.quadraticCurveTo(center.x, center.y + scale * .4, center.x + scale, center.y - scale * .3);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
          if (design.inclusion && design.inclusion !== "none") {
            ctx.fillStyle = design.inclusion === "ember" ? "#ffad68" : design.inclusion === "gold-flake" ? "#ffe18a" : design.edgeColor;
            for (const [dx, dy] of [[-.4,-.27],[.34,-.14],[-.12,.4],[.48,.34]]) {
              ctx.beginPath();
              ctx.arc(center.x + dx * scale, center.y + dy * scale, 1.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.restore();
          ctx.strokeStyle = design.edgeColor;
          ctx.lineWidth = 1.7;
          ctx.stroke();

          const visibleArea = Math.abs(points.reduce((sum, point, i) => {
            const next = points[(i + 1) % points.length];
            return sum + point.x * next.y - next.x * point.y;
          }, 0)) / 2;
          if (visibleArea < 350) return;
          const fontSize = Math.min(36, Math.max(11, Math.sqrt(visibleArea) * .46));
          ctx.font = `bold ${fontSize}px ${fontFamily(design.font)}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.lineWidth = 2.6;
          ctx.strokeStyle = "rgba(0,0,0,.32)";
          ctx.strokeText(String(faceIndex + 1), center.x, center.y, scale * .85);
          ctx.fillStyle = design.inkColor;
          ctx.fillText(String(faceIndex + 1), center.x, center.y, scale * .85);
          if (normal.dot(view) > .65) {
            const motif = motifMark(design.motif);
            if (motif) {
              ctx.font = `${Math.max(10, fontSize * .5)}px Georgia, serif`;
              ctx.fillStyle = design.edgeColor;
              ctx.fillText(motif, center.x, center.y - fontSize * 1.1);
            }
            if (design.inscription) {
              ctx.font = `bold ${Math.max(8, fontSize * .26)}px ${fontFamily(design.font)}`;
              ctx.fillStyle = design.edgeColor;
              ctx.fillText(design.inscription, center.x, center.y + fontSize * .95, scale * .8);
            }
          }
        });
        ctx.restore();
      });
      raf = requestAnimationFrame(render);
    };

    const resize = () => {
      const width = canvas.clientWidth, height = canvas.clientHeight;
      if (!width || !height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !document.hidden && !raf) raf = requestAnimationFrame(render);
      if (!visible && raf) { cancelAnimationFrame(raf); raf = 0; }
    });
    intersection.observe(canvas);
    const onVisibility = () => {
      if (!document.hidden && visible && !raf) raf = requestAnimationFrame(render);
      if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; }
    };
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      intersection.disconnect();
      motionQuery.removeEventListener("change", onMotionChange);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // Geometry changes only when the type or count of dice changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapeKey]);

  return <canvas ref={canvasRef} className="dice-fallback-canvas" aria-hidden="true" data-testid="status-dice-fallback" />;
}