/* ============================================================================
   Recipe: haloAura — a glowing halo/aura that blooms AROUND a die, spins, holds,
   then fades. Built from the harvested TimelineFX "Auras & Halos" art:
     • HaloAnim1 — an animated ring (8×4 grid, 32 frames; dark centre so the die
                   reads through it) → the rotating energy ring.
     • Halo3     — a soft glow disc → a faint ambient backglow behind the ring.
   Both are additive (white glows, tintable). The dice engine draws dice over
   scene meshes, so an additive ring with a dark centre naturally rings the die.

   Timeline: fade+scale in → spin & cycle the ring frames → hold → fade+scale out.
   ========================================================================== */
import { defineEffect } from '../registry.js';
import { timeline } from '../timeline.js';
import * as THREE from 'three';

const RING = '/assets/fx/auras_halos/HaloAnim1.png';   // 8×4 grid, 32 frames
const GLOW = '/assets/fx/auras_halos/Halo3.png';       // soft glow disc
const RING_COLS = 8, RING_ROWS = 4, RING_FRAMES = 32;

const loader = new THREE.TextureLoader();
const cache = {};
const tex = (url) => cache[url] || (cache[url] = new Promise((res, rej) => loader.load(url, (t) => {
  t.colorSpace = THREE.SRGBColorSpace; res(t);
}, undefined, rej)));

function glowQuad(map, size, color, opacity) {
  map = map.clone(); map.needsUpdate = true;
  const mat = new THREE.MeshBasicMaterial({ map, color: new THREE.Color(color), transparent: true,
    opacity, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  return mesh;
}

defineEffect('haloAura', async (ctx) => {
  const scene = ctx.scene;
  const die = ctx.dice && (ctx.dice.winner || ctx.dice.all[0]);
  const c = die ? die.position : { x: 0, y: 0, z: 0 };
  const color = (ctx.roll && ctx.roll.__auraColor) || 0xffd24a;   // gold by default

  const [ringT, glowT] = await Promise.all([tex(RING), tex(GLOW)]);

  // group so one scale tween drives the whole aura; sit just toward the camera
  const rig = new THREE.Group(); rig.position.set(c.x, c.y, c.z + 60); scene.add(rig);

  const glow = glowQuad(glowT, 720, color, 0.0); glow.renderOrder = 7;   // ambient backglow
  const ring = glowQuad(ringT, 560, color, 0.0); ring.renderOrder = 8;   // rotating energy ring
  ring.material.map.repeat.set(1 / RING_COLS, 1 / RING_ROWS);
  ring.material.map.offset.set(0, 1 - 1 / RING_ROWS);
  rig.add(glow, ring);
  rig.scale.setScalar(0.6);

  const IN = 0.4, HOLD = 1.6, OUT = 0.45, total = IN + HOLD + OUT;
  const FPS = 22;

  return timeline()
    .tween(rig.scale, { x: 1, y: 1, z: 1 }, { from: { x: 0.6, y: 0.6, z: 0.6 }, at: 0, dur: IN, ease: 'easeOut' })
    .tween(ring.material, { opacity: 0.95 }, { from: { opacity: 0 }, at: 0, dur: IN })
    .tween(glow.material, { opacity: 0.45 }, { from: { opacity: 0 }, at: 0, dur: IN })
    .spin(ring, { z: 0.9 }, { at: 0 })                       // ring rotates
    .spin(glow, { z: -0.35 }, { at: 0 })                     // backglow drifts the other way
    .tween(ring.material, { opacity: 0 }, { at: IN + HOLD, dur: OUT, ease: 'easeIn' })
    .tween(glow.material, { opacity: 0 }, { at: IN + HOLD, dur: OUT, ease: 'easeIn' })
    .tween(rig.scale, { x: 1.25, y: 1.25, z: 1.25 }, { at: IN + HOLD, dur: OUT, ease: 'easeIn' })
    .drive((dt, t) => {                                      // cycle the ring's 32 frames
      const f = Math.floor(t * FPS) % RING_FRAMES;
      const col = f % RING_COLS, row = (f / RING_COLS) | 0;
      ring.material.map.offset.set(col / RING_COLS, 1 - (row + 1) / RING_ROWS);
    })
    .duration(total)
    .onEnd(() => {
      scene.remove(rig);
      [ring, glow].forEach((m) => { m.geometry.dispose(); m.material.map.dispose(); m.material.dispose(); });
    })
    .build();
});
