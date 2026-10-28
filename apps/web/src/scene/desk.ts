import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { CSS3DObject, CSS3DRenderer } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import { onPress } from "../keys";
import { getBurned, onBurn } from "../clock";

// The desk, built from primitives (no model files): an old beige CRT with the
// live terminal on its glass, a mechanical keyboard that moves when you type
// (and when the ghost does), and a candle that burns down with the night.
// Plain three.js. The terminal is real DOM, placed on the glass by CSS3DRenderer.
// Units are metres; the desk top is y = 0.

import { SCREEN_PX } from "./size";
const SCREEN = { w: 0.3, h: 0.225, y: 0.245, z: 0.205 };
const BEIGE = 0xb8ab91;

const std = (color: number, roughness = 0.8, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, ...extra });

function box(w: number, h: number, d: number, r: number, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

function monitor(scene: THREE.Scene) {
  const plastic = std(BEIGE, 0.75);
  scene.add(box(0.2, 0.025, 0.2, 0.01, plastic, 0, 0.0125, 0));
  scene.add(box(0.08, 0.04, 0.08, 0.01, plastic, 0, 0.04, 0));
  scene.add(box(0.4, 0.36, 0.2, 0.025, plastic, 0, 0.235, 0.1));
  scene.add(box(0.3, 0.27, 0.24, 0.04, std(0xa89c84, 0.85), 0, 0.225, -0.1));
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(SCREEN.w + 0.03, SCREEN.h + 0.03, 0.004), std(0x2a2722, 0.6));
  bezel.position.set(0, SCREEN.y, SCREEN.z - 0.003);
  scene.add(bezel);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.004, 0.002), new THREE.MeshBasicMaterial({ color: 0x7dff9e }));
  lamp.position.set(0.165, 0.085, 0.2015);
  scene.add(lamp);
  // The glow the tube throws forward onto the keyboard, not back onto its own case.
  const glow = new THREE.SpotLight(0x7dffa8, 0.6, 0.8, 0.9, 0.8, 1.5);
  glow.position.set(0, SCREEN.y, SCREEN.z + 0.02);
  glow.target.position.set(0, 0, 0.38);
  scene.add(glow, glow.target);
}

// A worn 60% board. Widths in key units; codes match KeyboardEvent.code.
const ROWS: [string, number][][] = [
  [["Escape", 1], ...["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((d): [string, number] => [`Digit${d}`, 1]), ["Minus", 1], ["Equal", 1], ["Backspace", 2]],
  [["Tab", 1.5], ..."QWERTYUIOP".split("").map((c): [string, number] => [`Key${c}`, 1]), ["BracketLeft", 1], ["BracketRight", 1], ["Backslash", 1.5]],
  [["CapsLock", 1.75], ..."ASDFGHJKL".split("").map((c): [string, number] => [`Key${c}`, 1]), ["Semicolon", 1], ["Quote", 1], ["Enter", 2.25]],
  [["ShiftLeft", 2.25], ..."ZXCVBNM".split("").map((c): [string, number] => [`Key${c}`, 1]), ["Comma", 1], ["Period", 1], ["Slash", 1], ["ShiftRight", 2.75]],
  [["ControlLeft", 1.5], ["MetaLeft", 1], ["AltLeft", 1.5], ["Space", 7], ["AltRight", 1.5], ["MetaRight", 1], ["ControlRight", 1.5]],
];
const U = 0.019;
const MOD = /Escape|Backspace|Tab|Backslash|Caps|Enter|Shift|Control|Meta|Alt/;
const UP = 0.013;
const DOWN = 0.0075;

function keyboard(scene: THREE.Scene) {
  const board = new THREE.Group();
  board.position.set(0, 0.012, 0.37);
  board.rotation.x = 0.07;
  board.add(box(0.33, 0.022, 0.13, 0.008, std(BEIGE), 0, 0, 0));
  const light = std(0xd3c8b0, 0.7);
  const dark = std(0x8e8470, 0.7);
  const keys: { code: string; mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; until: number; ghost: boolean }[] = [];
  ROWS.forEach((row, r) => {
    let x = -7.5 * U;
    for (const [code, w] of row) {
      // Each key has its own material, so a key the ghost presses can glow on its own.
      const mat = (MOD.test(code) ? dark : light).clone();
      mat.emissive.set(0x5dffa0);
      mat.emissiveIntensity = 0;
      const mesh = box(w * U - 0.003, 0.009, U - 0.003, 0.002, mat, x + (w * U) / 2, UP, (r - 2) * U);
      board.add(mesh);
      keys.push({ code, mesh, mat, until: 0, ghost: false });
      x += w * U;
    }
  });
  scene.add(board);
  const off = onPress(({ code, ghost }) => {
    const k = keys.find((x) => x.code === code);
    if (k) { k.until = performance.now() + (ghost ? 90 : 110); k.ghost = ghost; }
  });
  const tick = (dt: number) => {
    const now = performance.now();
    for (const k of keys) {
      const down = now < k.until;
      k.mesh.position.y += ((down ? DOWN : UP) - k.mesh.position.y) * Math.min(1, dt * 40);
      const glow = down && k.ghost ? 0.9 : 0;
      k.mat.emissiveIntensity += (glow - k.mat.emissiveIntensity) * Math.min(1, dt * (glow ? 30 : 4));
    }
  };
  return { tick, dispose: off };
}

function candle(scene: THREE.Scene) {
  const FULL = 0.17;
  const g = new THREE.Group();
  g.position.set(0.36, 0, 0.2);
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.012, 32), std(0x8a6a3a, 0.35, { metalness: 0.6 }));
  dish.position.y = 0.006;
  dish.receiveShadow = true;
  g.add(dish);
  const waxMat = std(0xefe6d2, 0.55, { emissive: 0xff9a3c, emissiveIntensity: 0.06 });
  const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, FULL, 28), waxMat);
  wax.position.y = 0.012 + FULL / 2;
  g.add(wax);
  const drips = new THREE.Group();
  drips.position.y = 0.012;
  for (const a of [0.3, 2.1, 4.2]) {
    const d = new THREE.Mesh(new THREE.CapsuleGeometry(0.004, 0.03, 4, 8), waxMat);
    d.position.set(Math.cos(a) * 0.023, 0.03, Math.sin(a) * 0.023);
    drips.add(d);
  }
  g.add(drips);
  const flame = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.9 }));
  outer.scale.y = 2.2;
  const inner = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 12, 12), new THREE.MeshBasicMaterial({ color: 0xfff4d6 }));
  inner.scale.y = 1.6;
  inner.position.y = -0.002;
  flame.add(outer, inner);
  g.add(flame);
  const light = new THREE.PointLight(0xff9a3c, 2.2, 1.8, 1.2);
  light.castShadow = true;
  light.shadow.mapSize.set(512, 512);
  light.shadow.bias = -0.002;
  g.add(light);
  scene.add(g);

  let burn = getBurned();
  const off = onBurn((b) => { burn = b; });
  let h = FULL;
  const tick = (dt: number, t: number) => {
    const target = FULL * (1 - 0.88 * burn) + 0.008;
    h += (target - h) * Math.min(1, dt * 1.5);
    wax.scale.y = h / FULL;
    wax.position.y = 0.012 + h / 2;
    flame.position.y = 0.012 + h + 0.016;
    light.position.y = 0.012 + h + 0.03;
    drips.scale.y = 0.4 + burn * 1.8;
    const f = 1 + Math.sin(t * 13) * 0.05 + Math.sin(t * 7.3) * 0.07 + (Math.random() - 0.5) * 0.06;
    flame.scale.set(1, f, 1);
    flame.rotation.z = Math.sin(t * 2.1) * 0.06;
    const out = burn >= 1;
    flame.visible = !out;
    light.intensity = out ? 0 : 2.2 * f;
  };
  return { tick, dispose: off };
}

/** Marigold petals scattered at the candle's foot: the ofrenda in the room. */
function petals(scene: THREE.Scene) {
  const n = 46;
  const mesh = new THREE.InstancedMesh(new THREE.CircleGeometry(0.009, 7), std(0xffffff, 0.8, { side: THREE.DoubleSide }), n);
  const m = new THREE.Object3D();
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 0.06 + rnd() * 0.11;
    m.position.set(0.36 + Math.cos(a) * r, 0.002, 0.2 + Math.sin(a) * r * 0.8);
    m.rotation.set(-Math.PI / 2 + (rnd() - 0.5) * 0.4, 0, rnd() * Math.PI);
    m.scale.setScalar(0.6 + rnd() * 0.7);
    m.updateMatrix();
    mesh.setMatrixAt(i, m.matrix);
    mesh.setColorAt(i, new THREE.Color().setHSL(0.055 + rnd() * 0.035, 0.95, 0.36 + rnd() * 0.08));
  }
  mesh.receiveShadow = true;
  scene.add(mesh);
}

function room(scene: THREE.Scene) {
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.6), std(0x2b1e15, 0.9));
  desk.rotation.x = -Math.PI / 2;
  desk.position.z = 0.1;
  desk.receiveShadow = true;
  scene.add(desk);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(4, 2), std(0x0d0d0c, 1));
  wall.position.set(0, 0.8, -0.6);
  scene.add(wall);
  scene.add(new THREE.AmbientLight(0xffffff, 0.04));
  scene.add(new THREE.HemisphereLight(0x2a2a36, 0x140e09, 0.15));
  scene.fog = new THREE.Fog(0x050504, 1.2, 2.6);
}

/** Builds the desk in `container` and mounts `screenEl` (the live terminal) on the CRT glass. */
export function mountDesk(container: HTMLElement, screenEl: HTMLElement): () => void {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050504);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 10);

  const gl = new THREE.WebGLRenderer({ antialias: true });
  gl.setPixelRatio(Math.min(devicePixelRatio, 2));
  gl.shadowMap.enabled = true;
  gl.shadowMap.type = THREE.PCFSoftShadowMap;
  gl.domElement.style.cssText = "position:absolute;inset:0";
  container.appendChild(gl.domElement);

  const css = new CSS3DRenderer();
  css.domElement.style.cssText = "position:absolute;inset:0;pointer-events:none";
  container.appendChild(css.domElement);
  screenEl.style.pointerEvents = "auto";
  const glass = new CSS3DObject(screenEl);
  glass.position.set(0, SCREEN.y, SCREEN.z);
  glass.scale.setScalar(SCREEN.w / SCREEN_PX.w);
  scene.add(glass);

  room(scene);
  monitor(scene);
  const kb = keyboard(scene);
  const cd = candle(scene);
  petals(scene);

  // Frame the monitor and the keyboard, whatever the window's shape.
  const frame = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    // Seated, a little above the screen, looking down past it to the keyboard.
    const wide = w / h > 1.45;
    camera.fov = wide ? 36 : 42;
    camera.position.set(0.05, 0.5, wide ? 1.0 : 1.1);
    camera.lookAt(0.04, 0.17, 0.22);
    camera.updateProjectionMatrix();
    gl.setSize(w, h);
    css.setSize(w, h);
  };
  frame();
  const ro = new ResizeObserver(frame);
  ro.observe(container);

  const timer = new THREE.Timer();
  let raf = 0;
  const loop = (now: number) => {
    timer.update(now);
    const dt = timer.getDelta();
    const t = timer.getElapsed();
    kb.tick(dt);
    cd.tick(dt, t);
    gl.render(scene, camera);
    css.render(scene, camera);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    kb.dispose();
    cd.dispose();
    gl.dispose();
    container.innerHTML = "";
  };
}
