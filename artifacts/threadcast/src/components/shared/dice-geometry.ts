import * as THREE from "three";
import type { DiceStyle } from "@workspace/api-client-react";

export type DieSides = 4 | 6 | 8 | 10 | 12 | 20;

type Face = { center: THREE.Vector3; normal: THREE.Vector3; labelRotation: THREE.Quaternion };

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
  return faces.map(f => ({
    center: [...f.vertices.values()].reduce((sum, v) => sum.add(v), new THREE.Vector3()).divideScalar(f.vertices.size),
    normal: f.normal,
    labelRotation: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), f.normal),
  }));
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
  ctx.font = `bold ${value >= 10 ? 97 : 130}px Georgia, serif`;
  ctx.fillText(String(value), 128, 129);
  ctx.shadowBlur = 0;
  if (value === 6 || value === 9) {
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(108, 185); ctx.lineTo(148, 185); ctx.stroke();
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
  const finish = style.finish;

  const material = new THREE.MeshPhysicalMaterial({
    color: style.bodyColor,
    flatShading: true,
    roughness: finish === "matte" ? .78 : finish === "polished" ? .23 : .09,
    metalness: finish === "polished" ? .34 : .08,
    clearcoat: finish === "matte" ? .06 : 1,
    clearcoatRoughness: finish === "glass" ? .04 : .18,
    transparent: finish === "glass",
    opacity: finish === "glass" ? .85 : 1,
    side: THREE.DoubleSide,
  });
  group.add(new THREE.Mesh(geometry, material));
  const edgeMaterial = new THREE.LineBasicMaterial({ color: style.edgeColor, transparent: true, opacity: .95 });
  group.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 13),
    edgeMaterial,
  ));

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
      material.color.set(next.bodyColor);
      material.roughness = next.finish === "matte" ? .78 : next.finish === "polished" ? .23 : .09;
      material.metalness = next.finish === "polished" ? .34 : .08;
      material.clearcoat = next.finish === "matte" ? .06 : 1;
      material.clearcoatRoughness = next.finish === "glass" ? .04 : .18;
      material.transparent = next.finish === "glass";
      material.opacity = next.finish === "glass" ? .85 : 1;
      material.needsUpdate = true;
      edgeMaterial.color.set(next.edgeColor);
      for (const label of labels) {
        label.material.map?.dispose();
        label.material.map = labelTexture(label.value, next);
        label.material.needsUpdate = true;
      }
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