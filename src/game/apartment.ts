import * as THREE from "three";
import { C } from "./palette";
import { box } from "./vox";
import {
  cardboardBox,
  chair,
  coffeeTable,
  fridge,
  gameConsole,
  kitchenTable,
  lamp,
  mug,
  picture,
  plant,
  shoeRack,
  sofa,
  television,
  tvStand,
  vase,
  type Item,
} from "./furniture";

export const ROOM = { minX: 0.2, maxX: 10.6, minZ: 0.2, maxZ: 7.6, wall: 0.16 };
export const DOOR = { x: 1.2, z: 7.45, w: 1.2, d: 0.5 };

export function buildApartment(scene: THREE.Scene): Item[] {
  const shell = new THREE.Group();
  shell.name = "shell";

  box(shell, 5.4, -0.04, 3.9, 10.8, 0.08, 7.8, C.floor);
  for (let i = 0; i < 14; i++) {
    box(shell, 5.4, 0.005, 0.35 + i * 0.55, 10.6, 0.01, 0.04, C.floorDark);
  }
  box(shell, 5.4, 2.72, 3.9, 10.8, 0.08, 7.8, C.ceiling);

  box(shell, 5.4, 1.35, 0.04, 10.8, 2.7, 0.12, C.wall);
  box(shell, 0.32, 1.35, 7.76, 0.64, 2.7, 0.12, C.wall);
  box(shell, 6.3, 1.35, 7.76, 8.9, 2.7, 0.12, C.wall);
  box(shell, 1.2, 2.5, 7.76, 1.14, 0.4, 0.12, C.wall);
  box(shell, 0.04, 1.35, 3.9, 0.12, 2.7, 7.8, C.wall);
  box(shell, 10.76, 1.35, 3.9, 0.12, 2.7, 7.8, C.wall);

  box(shell, 2.45, 1.35, 0.9, 0.12, 2.7, 1.6, C.wall);
  box(shell, 2.45, 1.35, 6.3, 0.12, 2.7, 2.7, C.wall);
  box(shell, 2.45, 2.2, 3.4, 0.12, 1.0, 2.4, C.wall);

  box(shell, 5.4, 0.08, 0.12, 10.4, 0.16, 0.08, C.wallTrim);
  box(shell, 6.6, 1.2, 0.1, 1.72, 1.22, 0.05, C.wood);
  box(shell, 6.6, 1.2, 0.13, 1.48, 0.98, 0.04, C.window);
  box(shell, 8.6, 1.2, 0.1, 1.52, 1.22, 0.05, C.wood);
  box(shell, 8.6, 1.2, 0.13, 1.28, 0.98, 0.04, C.window);

  box(shell, 1.2, 1.05, 7.7, 1.08, 2.1, 0.08, C.wood);
  box(shell, 1.2, 1.05, 7.64, 0.86, 1.86, 0.05, C.woodDark);
  box(shell, 0.82, 1.05, 7.6, 0.04, 0.12, 0.06, C.ceramic);

  box(shell, 6.6, 0.02, 2.2, 2.6, 0.03, 2.2, C.fabricDark);

  box(shell, 5.4, 0.46, 7.42, 3.6, 0.92, 0.55, C.wood);
  box(shell, 5.4, 0.94, 7.42, 3.5, 0.04, 0.52, C.woodDark);
  box(shell, 8.4, 0.7, 7.4, 0.55, 0.08, 0.42, C.metal);

  const sun = new THREE.PointLight(0xffe1bc, 1.55, 10, 2);
  sun.position.set(7.2, 1.85, 1.6);
  shell.add(sun);
  const kitchen = new THREE.PointLight(0xfff0d8, 1.15, 8, 2);
  kitchen.position.set(7.0, 1.9, 6.1);
  shell.add(kitchen);
  const hall = new THREE.PointLight(0xffe6c8, 0.7, 5, 2);
  hall.position.set(1.3, 1.7, 3.6);
  shell.add(hall);

  scene.add(shell);

  const items: Item[] = [];
  const place = (it: Item, x: number, z: number, rot = 0) => {
    it.group.position.set(x, it.restY, z);
    it.group.rotation.y = rot;
    if (it.parentId) {
      const parent = items.find((p) => p.id === it.parentId);
      if (parent) {
        it.offX = x - parent.group.position.x;
        it.offZ = z - parent.group.position.z;
      }
    }
    scene.add(it.group);
    items.push(it);
  };

  place(sofa(), 6.6, 1.15, 0);
  const table = coffeeTable();
  place(table, 6.6, 2.35, 0);
  const v = vase();
  v.restY = table.h + v.h / 2 + 0.02;
  place(v, 6.6, 2.35, 0);
  const stand = tvStand();
  place(stand, 6.6, 3.85, Math.PI);
  const tv = television();
  tv.restY = stand.h + tv.h / 2 + 0.02;
  place(tv, 6.6, 3.85, Math.PI);
  const con = gameConsole();
  con.restY = stand.h + con.h / 2 + 0.02;
  place(con, 6.15, 4.02, 0);
  place(lamp(), 4.15, 1.15, 0);
  place(chair(), 5.15, 2.45, 0.6);
  place(plant(), 9.9, 0.85, 0);
  const pic = picture();
  pic.restY = 1.38;
  place(pic, 4.8, 0.28, 0);

  place(fridge(), 3.15, 6.35, Math.PI / 2);
  const kt = kitchenTable();
  place(kt, 7.1, 6.2, 0);
  const m = mug();
  m.restY = kt.h + m.h / 2 + 0.02;
  place(m, 7.25, 6.15, 0);
  place(chair(), 7.1, 5.55, 0);
  place(chair(), 7.1, 6.85, Math.PI);
  place(plant(), 9.9, 7.15, 0);

  place(shoeRack(), 1.2, 5.4, 0);
  place(plant(), 0.7, 1.1, 0);
  place(cardboardBox(), 1.15, 3.35, 0.2);

  return items;
}

export function inDoor(x: number, z: number): boolean {
  return Math.abs(x - DOOR.x) < DOOR.w / 2 && z > DOOR.z - 0.15;
}

export function wallBlock(x: number, z: number, hw: number): boolean {
  if (x - hw < ROOM.minX || x + hw > ROOM.maxX || z - hw < ROOM.minZ || z + hw > ROOM.maxZ) return true;
  // interior wall at x=2.45 with a gap around z=2.4-4.4 (doorway)
  if (Math.abs(x - 2.45) < 0.22 + hw && (z < 2.15 || z > 4.55)) return true;
  return false;
}
