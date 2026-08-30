import * as THREE from "three";
import { C } from "./palette";
import { box } from "./vox";

/** 1 = original ~80cm monster; 0.52 ≈ Maine Coon with ears (~42cm). */
export const CAT_SCALE = 0.52;

export function buildCat(): THREE.Group {
  const g = new THREE.Group();
  g.name = "cat";

  const body = new THREE.Group();
  body.name = "body";
  box(body, 0, 0.28, 0, 0.3, 0.22, 0.44, C.tabby);
  box(body, 0, 0.22, 0.02, 0.22, 0.12, 0.36, C.cream);
  box(body, 0, 0.34, -0.04, 0.32, 0.06, 0.12, C.stripe);
  g.add(body);

  const head = new THREE.Group();
  head.name = "head";
  head.position.set(0, 0.5, 0.22);
  box(head, 0, 0.08, 0, 0.34, 0.28, 0.3, C.tabby);
  box(head, 0, -0.02, 0.1, 0.22, 0.12, 0.16, C.cream);
  box(head, -0.12, 0.24, 0, 0.1, 0.14, 0.08, C.tabby);
  box(head, 0.12, 0.24, 0, 0.1, 0.14, 0.08, C.tabby);
  box(head, -0.12, 0.24, 0.01, 0.05, 0.08, 0.04, C.pink);
  box(head, 0.12, 0.24, 0.01, 0.05, 0.08, 0.04, C.pink);
  box(head, 0, 0.22, -0.04, 0.28, 0.05, 0.1, C.stripe);
  const eyeL = box(head, -0.08, 0.1, 0.15, 0.09, 0.09, 0.04, C.eye);
  eyeL.name = "eyeL";
  const eyeR = box(head, 0.08, 0.1, 0.15, 0.09, 0.09, 0.04, C.eye);
  eyeR.name = "eyeR";
  box(head, -0.08, 0.1, 0.17, 0.04, 0.04, 0.03, C.pupil);
  box(head, 0.08, 0.1, 0.17, 0.04, 0.04, 0.03, C.pupil);
  box(head, 0, 0.02, 0.16, 0.06, 0.04, 0.04, C.pink);
  g.add(head);

  const makeLeg = (name: string, x: number, z: number) => {
    const leg = new THREE.Group();
    leg.name = name;
    leg.position.set(x, 0.16, z);
    box(leg, 0, -0.02, 0, 0.09, 0.2, 0.09, C.tabby);
    box(leg, 0, -0.12, 0.01, 0.1, 0.05, 0.11, C.cream);
    g.add(leg);
    return leg;
  };
  makeLeg("legFL", -0.1, 0.12);
  makeLeg("legFR", 0.1, 0.12);
  makeLeg("legBL", -0.1, -0.14);
  makeLeg("legBR", 0.1, -0.14);

  const tail = new THREE.Group();
  tail.name = "tail";
  tail.position.set(0, 0.34, -0.24);
  box(tail, 0, 0.08, -0.08, 0.07, 0.07, 0.18, C.tabby);
  box(tail, 0, 0.16, -0.2, 0.07, 0.07, 0.16, C.stripe);
  box(tail, 0, 0.22, -0.32, 0.07, 0.07, 0.14, C.tabby);
  g.add(tail);

  g.scale.setScalar(CAT_SCALE);
  return g;
}

export function poseCat(g: THREE.Group, t: number, speed: number, grounded: boolean, scratch = false): void {
  const swing = grounded && !scratch ? Math.sin(t * 11) * Math.min(1, speed) * 0.45 : 0;
  const bob = grounded ? Math.abs(Math.sin(t * 11)) * Math.min(1, speed) * 0.03 : 0;
  const body = g.getObjectByName("body");
  const head = g.getObjectByName("head");
  const tail = g.getObjectByName("tail");
  if (body) body.position.y = bob;
  if (head) {
    head.position.y = 0.5 + bob * 0.6;
    head.rotation.x = grounded ? (scratch ? 0.08 : 0) : -0.15;
  }
  const setLeg = (n: string, s: number) => {
    const o = g.getObjectByName(n);
    if (o) o.rotation.x = s;
  };
  setLeg("legFL", scratch ? -1.1 : swing);
  setLeg("legBR", swing);
  setLeg("legFR", scratch ? 0.2 : -swing);
  setLeg("legBL", -swing);
  if (tail) {
    tail.rotation.y = Math.sin(t * 2.4) * 0.35;
    tail.rotation.x = 0.2 + Math.sin(t * 3) * 0.1;
  }
}
