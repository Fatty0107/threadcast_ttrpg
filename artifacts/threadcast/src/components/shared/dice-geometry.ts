import * as THREE from "three";
import type { DiceStyle } from "@workspace/api-client-react";

export type DieSides = 4 | 6 | 8 | 10 | 12 | 20;

export type Face = { center: THREE.Vector3; normal: THREE.Vector3; labelRotation: THREE.Quaternion; vertices: THREE.Vector3[] };
type FinishProperties = {
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  transparent: boolean;
  opacity: number;
  transmission?: number;
  iridescence?: number;
  iridescenceIOR?: number;
  iridescenceThicknessRange?: [number, number];
};

function finishProperties(finish: DiceStyle["finish"]): FinishProperties {
  switch (finish) {
    case "matte": return { roughness: .78, metalness: .08, clearcoat: .06, clearcoatRoughness: .18, transparent: false, opacity: 1 };
    case "polished": return { roughness: .23, metalness: .34, clearcoat: 1, clearcoatRoughness: .18, transparent: false, opacity: 1 };
    case "glass": return { roughness: .09, metalness: .08, clearcoat: 1, clearcoatRoughness: .04, transparent: true, opacity: .85 };
    case "frosted": return { roughness: .91, metalness: .03, clearcoat: .16, clearcoatRoughness: .48, transparent: false, opacity: 1 };
    case "metallic": return { roughness: .2, metalness: .92, clearcoat: .72, clearcoatRoughness: .12, transparent: false, opacity: 1 };
    case "iridescent": return {
      roughness: .16, metalness: .48, clearcoat: 1, clearcoatRoughness: .1, transparent: false, opacity: 1,
      iridescence: 1, iridescenceIOR: 1.45, iridescenceThicknessRange: [180, 620],
    };
    case "liquid-core": return { roughness: .13, metalness: .18, clearcoat: 1, clearcoatRoughness: .035, transparent: true, opacity: .34, transmission: .32 };
    default: return { roughness: .09, metalness: .08, clearcoat: 1, clearcoatRoughness: .04, transparent: true, opacity: .85 };
  }
}

function kiteGeometry(): THREE.BufferGeometry {
  // A pentagonal trapezohedron: ten planar kite faces, not a disguised d12.
  const poleHeight = 1.12;
  const rimHeight = poleHeight * (1 - Math.cos(Math.PI / 5)) / (1 + Math.cos(Math.PI / 5));
  const ring = Array.from({ length: 10 }, (_, i) => {
    const angle = i * Math.PI / 5;
    return new THREE.Vector3(Math.cos(angle), i % 2 ? -rimHeight : rimHeight, Math.sin(angle));
  });
  const top = new THREE.Vector3(0, poleHeight, 0);
  const bottom = new THREE.Vector3(0, -poleHeight, 0);
  const points: number[] = [];

  function addTriangle(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) {
    const normal = b.clone().sub(a).cross(c.clone().sub(a));
    const center = a.clone().add(b).add(c).divideScalar(3);
    const vertices = normal.dot(center) < 0 ? [a, c, b] : [a, b, c];
    for (const vertex of vertices) points.push(vertex.x, vertex.y, vertex.z);
  }

  for (let i = 0; i < 10; i += 2) {
    addTriangle(top, ring[i], ring[(i + 1) % 10]);
    addTriangle(top, ring[(i + 1) % 10], ring[(i + 2) % 10]);
  }
  for (let i = 1; i < 10; i += 2) {
    addTriangle(bottom, ring[i], ring[(i + 1) % 10]);
    addTriangle(bottom, ring[(i + 1) % 10], ring[(i + 2) % 10]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function polyhedron(sides: DieSides): THREE.BufferGeometry {
  switch (sides) {
    case 4: return new THREE.TetrahedronGeometry(1.12, 0);
    case 6: return new THREE.BoxGeometry(1.65, 1.65, 1.65);
    case 8: return new THREE.OctahedronGeometry(1.16, 0);
    case 10: return kiteGeometry();
    case 12: return new THREE.DodecahedronGeometry(1.12, 0);
    case 20: return new THREE.IcosahedronGeometry(1.18, 0);
  }
}

function extractFaces(geometry: THREE.BufferGeometry): Face[] {
  const positions = geometry.getAttribute("position");
  const indices = geometry.getIndex();
  const faces: { normal: THREE.Vector3; distance: number; vertices: Map<string, THREE.Vector3> }[] = [];
  for (let t = 0; t < (indices ? indices.count : positions.count); t += 3) {
    const vertex = (offset: number) => {
      const i = indices ? indices.getX(t + offset) : t + offset;
      return new THREE.Vector3(positions.getX(i), positions.getY(i), positions.getZ(i));
    };
    const a = vertex(0), b = vertex(1), c = vertex(2);
    const center = a.clone().add(b).add(c).divideScalar(3);
    const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    if (normal.dot(center) < 0) normal.negate();
    const distance = normal.dot(center);
    let face = faces.find(f => f.normal.dot(normal) > 0.9999 && Math.abs(f.distance - distance) < 0.004);
    if (!face) {
      face = { normal, distance, vertices: new Map() };
      faces.push(face);
    }
    for (const point of [a, b, c]) {
      face.vertices.set(`${point.x.toFixed(4)}:${point.y.toFixed(4)}:${point.z.toFixed(4)}`, point);
    }
  }
  return faces.map(f => {
    const vertices = [...f.vertices.values()];
    const center = vertices.reduce((sum, v) => sum.add(v), new THREE.Vector3()).divideScalar(vertices.length);
    const tangent = new THREE.Vector3(0, 1, 0).cross(f.normal).normalize();
    if (tangent.lengthSq() < .001) tangent.set(1, 0, 0);
    const bitangent = f.normal.clone().cross(tangent).normalize();
    vertices.sort((a, b) => {
      const relativeA = a.clone().sub(center), relativeB = b.clone().sub(center);
      return Math.atan2(relativeA.dot(bitangent), relativeA.dot(tangent)) -
        Math.atan2(relativeB.dot(bitangent), relativeB.dot(tangent));
    });
    return {
      center, vertices, normal: f.normal,
      labelRotation: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), f.normal),
    };
  });
}

/** Geometry for the canvas renderer when a browser cannot create WebGL. */
export function getDieFaces(sides: DieSides): Face[] {
  const geometry = polyhedron(sides);
  const faces = extractFaces(geometry);
  geometry.dispose();
  return faces;
}

function drawNewMotif(ctx: CanvasRenderingContext2D, motif: DiceStyle["motif"], ink: string) {
  if (motif !== "moon" && motif !== "thorn" && motif !== "eye") return;
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.globalAlpha = .42;
  ctx.lineWidth = 3;
  if (motif === "moon") {
    ctx.beginPath();
    ctx.arc(128, 128, 91, -.95, 1.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(148, 112, 70, -.9, 1.15);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(128, 47, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(61, 165, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (motif === "thorn") {
    ctx.beginPath();
    ctx.moveTo(34, 128);
    ctx.bezierCurveTo(80, 116, 105, 137, 128, 128);
    ctx.bezierCurveTo(162, 114, 182, 138, 222, 128);
    ctx.stroke();
    for (const x of [73, 111, 151, 190]) {
      ctx.beginPath();
      ctx.moveTo(x, x < 128 ? 127 : 129);
      ctx.lineTo(x - 15, 103);
      ctx.lineTo(x + 4, 119);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x, 129);
      ctx.lineTo(x + 16, 153);
      ctx.lineTo(x - 2, 138);
      ctx.fill();
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(38, 128);
    ctx.quadraticCurveTo(128, 43, 218, 128);
    ctx.quadraticCurveTo(128, 213, 38, 128);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(128, 128, 23, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(128, 128, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPattern(ctx: CanvasRenderingContext2D, pattern: DiceStyle["pattern"], edge: string) {
  if (!pattern || pattern === "none") return;
  ctx.save();
  ctx.strokeStyle = edge;
  ctx.fillStyle = edge;
  ctx.lineWidth = 2;
  ctx.globalAlpha = pattern === "gilded" ? .42 : .28;
  if (pattern === "marble") {
    for (let line = 0; line < 5; line++) {
      const y = 38 + line * 44;
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.bezierCurveTo(71, y - 31, 77, y + 31, 128, y);
      ctx.bezierCurveTo(173, y - 25, 190, y + 23, 236, y - 4);
      ctx.stroke();
      ctx.globalAlpha *= .9;
    }
    ctx.globalAlpha = .1;
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 7; i++) {
      const gradient = ctx.createRadialGradient(42 + i * 27, 32 + (i % 3) * 75, 2, 42 + i * 27, 32 + (i % 3) * 75, 40);
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 256, 256);
    }
  } else if (pattern === "nebula") {
    ctx.globalAlpha = .17;
    for (let i = 0; i < 8; i++) {
      const x = 42 + ((i * 73) % 174), y = 38 + ((i * 97) % 180);
      const glow = ctx.createRadialGradient(x, y, 1, x, y, 46 + (i % 3) * 12);
      glow.addColorStop(0, i % 2 ? edge : "#d6aaff");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(x - 60, y - 60, 120, 120);
    }
    ctx.globalAlpha = .64;
    for (let i = 0; i < 24; i++) {
      const x = (i * 89 + 17) % 256, y = (i * 53 + 23) % 256;
      ctx.beginPath(); ctx.arc(x, y, i % 5 === 0 ? 2.5 : 1.2, 0, Math.PI * 2); ctx.fill();
    }
  } else if (pattern === "fractures") {
    ctx.globalAlpha = .48;
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 7; i++) {
      let x = 27 + ((i * 41) % 205), y = 24 + ((i * 67) % 207);
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let step = 0; step < 5; step++) {
        x += (step % 2 ? -1 : 1) * (12 + ((i * 7 + step * 11) % 19));
        y += 12 + ((i * 13 + step * 5) % 17);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else if (pattern === "constellation") {
    const stars = [[34, 49], [83, 32], [112, 82], [165, 54], [218, 75], [53, 132], [99, 162], [154, 137], [205, 182], [71, 218], [176, 224]];
    ctx.globalAlpha = .38;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < stars.length - 1; i++) {
      ctx.beginPath(); ctx.moveTo(stars[i][0], stars[i][1]); ctx.lineTo(stars[i + 1][0], stars[i + 1][1]); ctx.stroke();
    }
    ctx.globalAlpha = .76;
    stars.forEach(([x, y], i) => {
      ctx.beginPath(); ctx.arc(x, y, i % 3 === 0 ? 3 : 2, 0, Math.PI * 2); ctx.fill();
    });
  } else if (pattern === "gilded") {
    ctx.lineWidth = 2;
    ctx.strokeRect(21, 21, 214, 214);
    ctx.strokeRect(28, 28, 200, 200);
    for (const [x, y, sx, sy] of [[21, 21, 1, 1], [235, 21, -1, 1], [21, 235, 1, -1], [235, 235, -1, -1]]) {
      ctx.beginPath();
      ctx.moveTo(x, y + sy * 30);
      ctx.lineTo(x, y);
      ctx.lineTo(x + sx * 30, y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawInclusion(ctx: CanvasRenderingContext2D, inclusion: DiceStyle["inclusion"], edge: string) {
  if (!inclusion || inclusion === "none") return;
  ctx.save();
  const points = Array.from({ length: 15 }, (_, i) => ({
    x: 25 + ((i * 83 + 19) % 206),
    y: 24 + ((i * 59 + 47) % 208),
    size: 2 + (i % 3),
  }));
  ctx.fillStyle = inclusion === "ember" ? "#ff7045" : inclusion === "gold-flake" ? "#f8d477" : edge;
  ctx.strokeStyle = ctx.fillStyle;
  ctx.globalAlpha = inclusion === "ember" ? .82 : .75;
  points.forEach(({ x, y, size }, i) => {
    if (inclusion === "gold-flake") {
      ctx.beginPath();
      ctx.moveTo(x, y - size * 2); ctx.lineTo(x + size, y);
      ctx.lineTo(x, y + size * 2); ctx.lineTo(x - size, y); ctx.closePath(); ctx.fill();
    } else if (inclusion === "ember") {
      const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 4);
      glow.addColorStop(0, "#fff4ad");
      glow.addColorStop(.35, "#ff7045");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(x - size * 4, y - size * 4, size * 8, size * 8);
      ctx.fillStyle = "#ff7045";
    } else {
      ctx.beginPath(); ctx.arc(x, y, i % 5 === 0 ? size * 1.4 : size * .65, 0, Math.PI * 2); ctx.fill();
    }
  });
  ctx.restore();
}

function labelTexture(value: number, style: DiceStyle): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Cannot draw die faces");
  const ink = style.inkColor;
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineJoin = "round";

  drawPattern(ctx, style.pattern, style.edgeColor);
  drawInclusion(ctx, style.inclusion, style.edgeColor);
  drawNewMotif(ctx, style.motif, ink);
  if (style.motif === "weave") {
    ctx.globalAlpha = 0.62;
    ctx.lineWidth = 2.5;
    for (const offset of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(29, 128 + offset * 23);
      ctx.bezierCurveTo(61, 63 + offset * 15, 183, 193 + offset * 15, 227, 128 + offset * 23);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (style.motif === "stars") {
    ctx.globalAlpha = 0.8;
    for (const [x, y, size] of [[48, 60, 10], [208, 64, 7], [55, 202, 6], [198, 199, 11]]) {
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size * .25, y - size * .25);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x + size * .25, y + size * .25);
      ctx.lineTo(x, y + size);
      ctx.lineTo(x - size * .25, y + size * .25);
      ctx.lineTo(x - size, y);
      ctx.lineTo(x - size * .25, y - size * .25);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (style.motif === "etched") {
    ctx.globalAlpha = .55;
    ctx.lineWidth = 2;
    for (const r of [100, 110]) {
      ctx.beginPath();
      for (let i = 0; i < 9; i++) {
        const angle = i * Math.PI / 4;
        const x = 128 + r * Math.cos(angle), y = 128 + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  ctx.shadowColor = style.edgeColor;
  ctx.shadowBlur = 7;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const font = style.font === "arcane"
    ? "Cinzel, Georgia, serif"
    : style.font === "modern"
      ? '"DM Sans", Arial, sans-serif'
      : style.font === "mono"
        ? '"JetBrains Mono", monospace'
        : "Georgia, serif";
  ctx.font = `bold ${value >= 10 ? 97 : 130}px ${font}`;
  ctx.fillText(String(value), 128, 129);
  ctx.shadowBlur = 0;
  if (value === 6 || value === 9) {
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(108, 185); ctx.lineTo(148, 185); ctx.stroke();
  }
  const inscription = style.inscription?.slice(0, 12).trim();
  if (inscription) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold 15px ${font}`;
    ctx.globalAlpha = .9;
    ctx.shadowColor = "rgba(0,0,0,.9)";
    ctx.shadowBlur = 1;
    ctx.fillStyle = "rgba(0,0,0,.68)";
    ctx.fillText(inscription, 129, 224, 196);
    ctx.shadowBlur = 0;
    ctx.fillStyle = style.edgeColor;
    ctx.fillText(inscription, 128, 222, 196);
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function createDie(sides: DieSides, style: DiceStyle) {
  const geometry = polyhedron(sides);
  const faces = extractFaces(geometry);
  const group = new THREE.Group();
  const properties = finishProperties(style.finish);
  const material = new THREE.MeshPhysicalMaterial({
    ...properties,
    color: style.bodyColor,
    flatShading: true,
    side: THREE.DoubleSide,
    depthWrite: style.finish !== "liquid-core",
  });
  const body = new THREE.Mesh(geometry, material);
  group.add(body);
  const edgeMaterial = new THREE.LineBasicMaterial({ color: style.edgeColor, transparent: true, opacity: .95 });
  group.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 13),
    edgeMaterial,
  ));

  const coreGroup = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(.47, 1),
    new THREE.MeshPhysicalMaterial({
      color: style.edgeColor,
      emissive: style.bodyColor,
      emissiveIntensity: .42,
      roughness: .24,
      metalness: .45,
      clearcoat: 1,
      transparent: true,
      opacity: .88,
    }),
  );
  coreGroup.add(core);
  const motePositions: number[] = [];
  for (let i = 0; i < 46; i++) {
    const y = 1 - 2 * (i + .5) / 46;
    const radius = Math.sqrt(1 - y * y) * (.32 + (i % 4) * .035);
    const angle = i * 2.399963;
    motePositions.push(Math.cos(angle) * radius, y * .42, Math.sin(angle) * radius);
  }
  const motesGeometry = new THREE.BufferGeometry();
  motesGeometry.setAttribute("position", new THREE.Float32BufferAttribute(motePositions, 3));
  const motesMaterial = new THREE.PointsMaterial({
    color: style.edgeColor,
    size: .035,
    sizeAttenuation: true,
    transparent: true,
    opacity: .96,
    depthWrite: false,
  });
  coreGroup.add(new THREE.Points(motesGeometry, motesMaterial));
  coreGroup.visible = style.finish === "liquid-core";
  group.add(coreGroup);

  const size = ({ 4: .72, 6: 1.18, 8: .79, 10: .84, 12: .83, 20: .66 } as const)[sides];
  const labels: { value: number; material: THREE.MeshBasicMaterial }[] = [];
  faces.forEach((face, index) => {
    const image = labelTexture(index + 1, style);
    const faceMaterial = new THREE.MeshBasicMaterial({ map: image, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      faceMaterial,
    );
    label.position.copy(face.center).addScaledVector(face.normal, .022);
    label.quaternion.copy(face.labelRotation);
    label.renderOrder = 2;
    group.add(label);
    labels.push({ value: index + 1, material: faceMaterial });
  });

  return {
    group, faces,
    updateStyle(next: DiceStyle) {
      const finishPropertiesNext = finishProperties(next.finish);
      material.color.set(next.bodyColor);
      material.roughness = finishPropertiesNext.roughness;
      material.metalness = finishPropertiesNext.metalness;
      material.clearcoat = finishPropertiesNext.clearcoat;
      material.clearcoatRoughness = finishPropertiesNext.clearcoatRoughness;
      material.transparent = finishPropertiesNext.transparent;
      material.opacity = finishPropertiesNext.opacity;
      material.transmission = finishPropertiesNext.transmission ?? 0;
      material.iridescence = finishPropertiesNext.iridescence ?? 0;
      material.iridescenceIOR = finishPropertiesNext.iridescenceIOR ?? 1.3;
      material.iridescenceThicknessRange = finishPropertiesNext.iridescenceThicknessRange ?? [100, 400];
      material.depthWrite = next.finish !== "liquid-core";
      core.material.color.set(next.edgeColor);
      (core.material as THREE.MeshPhysicalMaterial).emissive.set(next.bodyColor);
      motesMaterial.color.set(next.edgeColor);
      coreGroup.visible = next.finish === "liquid-core";
      material.needsUpdate = true;
      edgeMaterial.color.set(next.edgeColor);
      for (const label of labels) {
        label.material.map?.dispose();
        label.material.map = labelTexture(label.value, next);
        label.material.needsUpdate = true;
      }
    },
    updateAnimation(now: number, rolling: boolean, reducedMotion: boolean) {
      if (reducedMotion) {
        coreGroup.rotation.set(0, 0, 0);
        return;
      }
      const speed = rolling ? 1.5 : .24;
      const time = now * .001 * speed;
      coreGroup.rotation.set(.35 + Math.sin(time * .7) * .22, time, .24 + Math.cos(time * .55) * .18);
    },
  };
}

export function facingQuaternion(face: Face, camera: THREE.Camera): THREE.Quaternion {
  const towardsCamera = camera.position.clone().normalize();
  const screenUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  const aligned = new THREE.Quaternion().setFromUnitVectors(face.normal, towardsCamera);
  const currentUp = new THREE.Vector3(0, 1, 0).applyQuaternion(face.labelRotation).applyQuaternion(aligned);
  const angle = Math.atan2(towardsCamera.dot(currentUp.clone().cross(screenUp)), currentUp.dot(screenUp));
  return aligned.premultiply(new THREE.Quaternion().setFromAxisAngle(towardsCamera, angle));
}