import * as THREE from "three";

const UNIT = new THREE.BoxGeometry(1, 1, 1);
const mats = new Map<number, THREE.MeshLambertMaterial>();

export function mat(hex: number): THREE.MeshLambertMaterial {
  let m = mats.get(hex);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color: hex });
    mats.set(hex, m);
  }
  return m;
}

export function box(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  hex: number,
): THREE.Mesh {
  const m = new THREE.Mesh(UNIT, mat(hex));
  m.position.set(x, y, z);
  m.scale.set(w, h, d);
  m.castShadow = false;
  m.receiveShadow = false;
  parent.add(m);
  return m;
}

export function disposeShared(): void {
  UNIT.dispose();
  for (const m of mats.values()) m.dispose();
  mats.clear();
}
