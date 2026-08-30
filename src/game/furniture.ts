import * as THREE from "three";
import { C } from "./palette";
import { box } from "./vox";

export type Item = {
  id: string;
  name: string;
  material: string;
  group: THREE.Group;
  hp: number;
  maxHp: number;
  mass: number;
  value: number;
  fun: number;
  att: number;
  w: number;
  h: number;
  d: number;
  vx: number;
  vy: number;
  vz: number;
  falling: boolean;
  shattered: boolean;
  parentId: string | null;
  restY: number;
  offX: number;
  offZ: number;
};

function item(
  id: string,
  name: string,
  material: string,
  group: THREE.Group,
  w: number,
  h: number,
  d: number,
  mass: number,
  value: number,
  fun: number,
  att: number,
  parentId: string | null = null,
): Item {
  group.position.y = h / 2;
  return {
    id,
    name,
    material,
    group,
    hp: 1,
    maxHp: 1,
    mass,
    value,
    fun,
    att,
    w,
    h,
    d,
    vx: 0,
    vy: 0,
    vz: 0,
    falling: false,
    shattered: false,
    parentId,
    restY: h / 2,
    offX: 0,
    offZ: 0,
  };
}

function g(name: string): THREE.Group {
  const o = new THREE.Group();
  o.name = name;
  return o;
}

export function sofa(): Item {
  const o = g("sofa");
  box(o, 0, -0.15, 0, 2.0, 0.28, 0.8, C.fabric);
  box(o, 0, 0.12, -0.28, 2.0, 0.4, 0.22, C.fabricDark);
  box(o, -0.9, 0.05, 0.05, 0.18, 0.36, 0.7, C.fabricDark);
  box(o, 0.9, 0.05, 0.05, 0.18, 0.36, 0.7, C.fabricDark);
  box(o, -0.4, 0.02, 0.1, 0.7, 0.1, 0.5, C.fabric);
  box(o, 0.4, 0.02, 0.1, 0.7, 0.1, 0.5, C.fabric);
  return item("sofa", "Диван", "ткань", o, 2.0, 0.85, 0.8, 45, 800, 12, 10);
}

export function coffeeTable(): Item {
  const o = g("table");
  box(o, 0, 0.18, 0, 1.1, 0.06, 0.5, C.wood);
  box(o, -0.46, -0.08, -0.18, 0.08, 0.44, 0.08, C.woodDark);
  box(o, 0.46, -0.08, -0.18, 0.08, 0.44, 0.08, C.woodDark);
  box(o, -0.46, -0.08, 0.18, 0.08, 0.44, 0.08, C.woodDark);
  box(o, 0.46, -0.08, 0.18, 0.08, 0.44, 0.08, C.woodDark);
  return item("table", "Журнальный стол", "дерево", o, 1.1, 0.5, 0.5, 15, 400, 10, 12);
}

export function vase(): Item {
  const o = g("vase");
  box(o, 0, -0.06, 0, 0.12, 0.08, 0.12, C.ceramic);
  box(o, 0, 0.06, 0, 0.16, 0.18, 0.16, C.ceramic);
  box(o, 0, 0.18, 0, 0.1, 0.08, 0.1, C.ceramic);
  const it = item("vase", "Ваза", "керамика", o, 0.18, 0.28, 0.18, 1.5, 200, 14, 16, "table");
  it.maxHp = 0.45;
  it.hp = 0.45;
  return it;
}

export function tvStand(): Item {
  const o = g("tvstand");
  box(o, 0, 0, 0, 1.2, 0.4, 0.42, C.woodDark);
  box(o, 0, 0.12, 0.02, 1.12, 0.04, 0.36, C.wood);
  return item("tvstand", "Тумба ТВ", "дерево", o, 1.2, 0.4, 0.42, 25, 200, 8, 10);
}

export function television(): Item {
  const o = g("tv");
  box(o, 0, 0, 0, 1.0, 0.58, 0.08, C.tv);
  box(o, 0, 0, 0.02, 0.88, 0.46, 0.04, C.black);
  box(o, 0, -0.32, 0, 0.2, 0.08, 0.12, C.metal);
  const it = item("tv", "Телевизор", "стекло", o, 1.0, 0.62, 0.12, 8, 1200, 22, 28, "tvstand");
  it.maxHp = 0.7;
  it.hp = 0.7;
  return it;
}

export function lamp(): Item {
  const o = g("lamp");
  box(o, 0, -0.7, 0, 0.22, 0.04, 0.22, C.metal);
  box(o, 0, -0.15, 0, 0.05, 1.1, 0.05, C.metal);
  box(o, 0, 0.5, 0, 0.28, 0.18, 0.28, C.paper);
  return item("lamp", "Торшер", "металл", o, 0.3, 1.55, 0.3, 3, 100, 12, 12);
}

export function chair(): Item {
  const o = g("chair");
  box(o, 0, -0.12, 0, 0.42, 0.06, 0.42, C.wood);
  box(o, -0.16, -0.32, -0.16, 0.06, 0.36, 0.06, C.woodDark);
  box(o, 0.16, -0.32, -0.16, 0.06, 0.36, 0.06, C.woodDark);
  box(o, -0.16, -0.32, 0.16, 0.06, 0.36, 0.06, C.woodDark);
  box(o, 0.16, -0.32, 0.16, 0.06, 0.36, 0.06, C.woodDark);
  box(o, 0, 0.18, -0.18, 0.42, 0.4, 0.06, C.wood);
  return item("chair", "Стул", "дерево", o, 0.45, 0.9, 0.45, 5, 150, 10, 12);
}

export function fridge(): Item {
  const o = g("fridge");
  box(o, 0, 0, 0, 0.62, 1.8, 0.64, C.metal);
  box(o, 0, 0.35, 0.33, 0.5, 0.7, 0.02, C.glass);
  box(o, 0.24, 0.1, 0.34, 0.04, 0.12, 0.04, C.black);
  return item("fridge", "Холодильник", "металл", o, 0.62, 1.8, 0.64, 80, 1500, 22, 28);
}

export function kitchenTable(): Item {
  const o = g("ktable");
  box(o, 0, 0.22, 0, 1.3, 0.06, 0.7, C.wood);
  box(o, -0.55, -0.1, -0.28, 0.08, 0.58, 0.08, C.woodDark);
  box(o, 0.55, -0.1, -0.28, 0.08, 0.58, 0.08, C.woodDark);
  box(o, -0.55, -0.1, 0.28, 0.08, 0.58, 0.08, C.woodDark);
  box(o, 0.55, -0.1, 0.28, 0.08, 0.58, 0.08, C.woodDark);
  return item("ktable", "Кухонный стол", "дерево", o, 1.3, 0.75, 0.7, 30, 500, 11, 12);
}

export function mug(): Item {
  const o = g("mug");
  box(o, 0, 0, 0, 0.08, 0.1, 0.08, C.ceramic);
  box(o, 0.06, 0.01, 0, 0.04, 0.06, 0.03, C.ceramic);
  const it = item("mug", "Кружка", "керамика", o, 0.1, 0.1, 0.1, 0.3, 20, 4, 1, "ktable");
  it.maxHp = 0.25;
  it.hp = 0.25;
  return it;
}

export function plant(): Item {
  const o = g("plant");
  box(o, 0, -0.18, 0, 0.22, 0.2, 0.22, C.pot);
  box(o, 0, 0.1, 0, 0.08, 0.28, 0.08, C.plant);
  box(o, 0.08, 0.18, 0.04, 0.16, 0.08, 0.06, C.plant);
  box(o, -0.08, 0.2, -0.02, 0.14, 0.08, 0.06, C.plant);
  return item("plant", "Растение", "земля", o, 0.28, 0.55, 0.28, 4, 80, 6, 4);
}

export function shoeRack(): Item {
  const o = g("shoes");
  box(o, 0, -0.08, 0, 0.7, 0.08, 0.28, C.wood);
  box(o, -0.18, 0.02, 0.02, 0.22, 0.08, 0.12, C.stripe);
  box(o, 0.16, 0.02, -0.02, 0.22, 0.08, 0.12, C.black);
  return item("shoes", "Обувь", "кожа", o, 0.7, 0.22, 0.28, 2, 90, 5, 3);
}

export function gameConsole(): Item {
  const o = g("console");
  box(o, 0, 0, 0, 0.28, 0.06, 0.18, C.black);
  box(o, 0, 0.04, 0.02, 0.14, 0.02, 0.1, C.metal);
  box(o, -0.1, 0.04, 0.07, 0.03, 0.02, 0.03, C.eye);
  const it = item("console", "Приставка", "пластик", o, 0.28, 0.08, 0.18, 1.2, 400, 16, 22, "tvstand");
  it.maxHp = 0.5;
  it.hp = 0.5;
  return it;
}

export function picture(): Item {
  const o = g("picture");
  box(o, 0, 0, 0, 0.52, 0.42, 0.04, C.woodDark);
  box(o, 0, 0, 0.015, 0.44, 0.34, 0.02, C.stripe);
  box(o, 0, 0.04, 0.025, 0.2, 0.12, 0.01, C.cream);
  return item("picture", "Картина", "бумага", o, 0.52, 0.42, 0.05, 0.8, 180, 10, 18);
}

export function cardboardBox(): Item {
  const o = g("box");
  box(o, 0, -0.14, 0, 0.44, 0.04, 0.44, C.cardboard);
  box(o, 0, 0.0, -0.2, 0.44, 0.28, 0.04, C.cardboard);
  box(o, 0, 0.0, 0.2, 0.44, 0.28, 0.04, C.cardboard);
  box(o, -0.2, 0.0, 0, 0.04, 0.28, 0.4, C.cardboard);
  box(o, 0.2, 0.0, 0, 0.04, 0.28, 0.4, C.cardboard);
  return item("box", "Коробка", "бумага", o, 0.46, 0.32, 0.46, 1, 5, 8, 1);
}

export function aabbHit(
  ax: number,
  az: number,
  aw: number,
  ad: number,
  bx: number,
  bz: number,
  bw: number,
  bd: number,
): boolean {
  return Math.abs(ax - bx) < (aw + bw) / 2 && Math.abs(az - bz) < (ad + bd) / 2;
}
