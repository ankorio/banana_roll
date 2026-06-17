/* ============================================================================
   Banana Roll — FX layer (window.BRFX)
   Fantasy VFX rendered INSIDE the dice engine's own WebGL canvas. We attach to a
   running dice Box and use its scene / camera (PERSPECTIVE) / renderer, driving
   per-frame work off Box.onBeforeRender(dt). So particles live in the same scene
   as the dice, share one three.js instance (r182, the import-map one), and
   depth-sort with the dice — no separate canvas, no screen-space projection.

   effects.js is still authored in "pixel" space (origin px-centered, sizes/
   velocities in px). We convert px→dice-world with a single factor `f` derived
   from the dice camera at the z=0 plane, so the old tuning (sizes, scaleK, tiltX)
   carries over: the old orthographic FX camera and the dice perspective camera
   share the same convention (looking down −z, +y up).

   API:  BRFX.attach(Box)
         BRFX.play(name, { origin:{x,y in 0..1} | worldPos:Vector3, color, intensity })
         BRFX.names() · BRFX.label(name) · BRFX.detach()
   ========================================================================== */
import * as THREE from 'three';
import { EFFECTS, makeTextures } from './effects.js';
// LightningStrike was removed from current three; load the last version that has it from
// the CDN, with ?external=three so it uses OUR three (the import-map one) — no version clash.
import { LightningStrike } from 'https://esm.sh/three@0.150.0/examples/jsm/geometries/LightningStrike.js?external=three';

let Box = null, scene = null, camera = null, renderer = null, TEX = null;
let unhook = null;      // Box.onBeforeRender unsubscribe
const live = [];        // active sprite particles + lightning bolts

// px→world conversion + effect depth, set per play() from the current camera.
let FX_F = 1;           // dice-world units per CSS pixel (at the z=0 plane)
let FX_Z = 0;           // world z to place the current effect at (the die's depth)

const BRFX = {
  // Attach to a running dice Box (after Box.initialize()). Idempotent.
  attach(box) {
    if (Box === box) return BRFX;
    if (Box) BRFX.detach();
    Box = box;
    scene = box.scene; camera = box.camera; renderer = box.renderer;
    TEX = makeTextures(THREE);
    // one per-frame hook: advance sprite/bolt lifecycles. Box draws the frame.
    unhook = box.onBeforeRender((dt) => step(Math.min(0.05, dt || 0)));
    return BRFX;
  },

  detach() {
    try { unhook && unhook(); } catch {}
    unhook = null;
    for (let i = live.length - 1; i >= 0; i--) removeLive(i);
    Box = scene = camera = renderer = TEX = null;
    return BRFX;
  },

  names() { return Object.keys(EFFECTS); },
  label(name) { return (EFFECTS[name] && EFFECTS[name].label) || name; },

  play(name, opts = {}) {
    if (!Box) { console.warn('[fx] not attached to a dice Box'); return; }
    const def = EFFECTS[name]; if (!def) { console.warn('[fx] unknown effect', name); return; }

    // resolve a world position for the effect, and the px-space origin effects.js wants
    const m = mapping();
    FX_F = m.f;
    let wx, wy;
    if (opts.worldPos) { wx = opts.worldPos.x; wy = opts.worldPos.y; FX_Z = opts.worldPos.z || 0; }
    else {
      const o = opts.origin || { x: 0.5, y: 0.5 };
      const visH = m.f * m.Hpx, visW = visH * (m.Wpx / m.Hpx);
      wx = (o.x * 2 - 1) * visW / 2; wy = (1 - o.y * 2) * visH / 2; FX_Z = 0;
    }
    const origin = { x: wx / m.f, y: wy / m.f }; // px-centered (round-trips to wx,wy via ×f)
    const intensity = Math.max(0.2, opts.intensity || 1);

    try {
      def.spawn({ THREE, tex: TEX, W: m.Wpx, H: m.Hpx, origin,
        color: opts.color != null ? new THREE.Color(opts.color).getHex() : null,
        intensity, addParticle, addLightning });
    } catch (e) { console.warn('[fx] effect failed', name, e); }
    ensureLoop();
  },
};

// Dice-camera mapping at the z=0 plane: CSS px of the canvas + world-units-per-px.
function mapping() {
  const el = renderer.domElement;
  const Hpx = el.clientHeight || el.height || 1;
  const Wpx = el.clientWidth || el.width || 1;
  const d = Math.abs(camera.position.z);              // camera sits over origin, plane at z=0
  const fovV = (camera.fov || 20) * Math.PI / 180;
  const visH = 2 * d * Math.tan(fovV / 2);            // world height visible at the plane
  return { Wpx, Hpx, f: visH / Hpx };
}

// The dice engine's persistent loop is the SOLE owner of stepping + rendering and
// is meant to run for the box's whole lifetime (see DiceBox.start / initialize). The
// FX layer must never stop it: doing so on FX end froze any dice still settling (and
// stalled idle auras / shadow updates). ensureLoop() stays as a defensive, idempotent
// restart; maybeIdle() is intentionally a no-op — the engine manages its own loop.
function ensureLoop() { try { Box.start(); } catch {} }
function maybeIdle() { /* no-op: never stop the engine loop (it owns its own lifecycle) */ }

// Make an additive material safe on the (alpha:true) dice canvas for OBS. Plain
// THREE.AdditiveBlending writes SrcAlpha into the canvas ALPHA channel, which stamps
// glow-on-black quads opaque → solid black rectangles over the transparent overlay.
// Keep RGB additive but leave destination alpha untouched (Zero/One) so the canvas
// stays transparent and the glow adds over the page instead of punching a hole.
function additiveCanvasSafe(mat) {
  mat.blending = THREE.CustomBlending;
  mat.blendEquation = THREE.AddEquation;   mat.blendEquationAlpha = THREE.AddEquation;
  mat.blendSrc = THREE.SrcAlphaFactor;     mat.blendDst = THREE.OneFactor;      // RGB: additive glow
  mat.blendSrcAlpha = THREE.ZeroFactor;    mat.blendDstAlpha = THREE.OneFactor; // ALPHA: preserve transparency
  mat.needsUpdate = true;
}

// Sprite particle. c.* is authored in px (effects.js); convert to dice-world via FX_F.
function addParticle(c) {
  if (c.delay && c.delay > 0) { const d = c.delay; c.delay = 0; c._f = FX_F; c._z = FX_Z; setTimeout(() => { addParticle(c); ensureLoop(); }, d * 1000); return; }
  const f = c._f != null ? c._f : FX_F, z = c._z != null ? c._z : FX_Z;
  const mat = new THREE.SpriteMaterial({ map: c.tex, color: c.color != null ? c.color : 0xffffff, transparent: true,
    depthTest: false, depthWrite: false });
  if ((c.blending || THREE.NormalBlending) === THREE.AdditiveBlending) additiveCanvasSafe(mat); else mat.blending = c.blending || THREE.NormalBlending;
  mat.opacity = 0; mat.rotation = c.rot || 0;
  const sp = new THREE.Sprite(mat);
  sp.position.set(c.x * f, c.y * f, z);
  const sizeA = c.sizeA * f, sizeB = (c.sizeB != null ? c.sizeB : c.sizeA) * f;
  sp.scale.set(sizeA, sizeA, 1);
  scene.add(sp);
  live.push({ kind: 'p', sp, vx: (c.vx || 0) * f, vy: (c.vy || 0) * f, grav: (c.grav || 0) * f, drag: c.drag || 0, ang: c.ang || 0,
    life: 0, max: c.life || 1, sizeA, sizeB,
    fadeIn: c.fadeIn != null ? c.fadeIn : 0.1, alpha: c.alpha != null ? c.alpha : 1,
    swayF: c.swayF || 0, swayA: (c.swayA || 0) * f, phase: Math.random() * 6.283 });
}

function addLightning(c) {
  const f = FX_F, z = FX_Z, half = (mapping().Hpx / 2) * f;
  const src = new THREE.Vector3(c.x * f, half, z);
  const dst = new THREE.Vector3(c.x * f + (Math.random() * 60 - 30) * f, -half, z);
  let strike;
  try {
    strike = new LightningStrike({ sourceOffset: src, destOffset: dst, radius0: (c.r0 || 4) * f, radius1: (c.r1 || 2) * f,
      minRadius: f, maxIterations: 7, isEternal: false, birthTime: 0.1, deathTime: (c.life || 0.45),
      timeScale: 1, propagationTimeFactor: 0.06, vanishingTimeFactor: 0.9, subrayPeriod: 0.8, subrayDutyCycle: 0.6,
      maxSubrayRecursion: 3, ramification: 7, recursionProbability: 0.7, roughness: 0.85, straightness: 0.6 });
  } catch (e) { console.warn('[fx] LightningStrike unavailable', e); return; }
  const mat = new THREE.MeshBasicMaterial({ color: c.color || 0xbfe0ff, transparent: true, depthTest: false });
  additiveCanvasSafe(mat);
  const mesh = new THREE.Mesh(strike, mat);
  scene.add(mesh);
  live.push({ kind: 'ls', strike, mesh, life: 0, max: (c.life || 0.45) + 0.15 });
}

function removeLive(i) {
  const p = live[i];
  if (p.kind === 'ls') { scene.remove(p.mesh); p.mesh.material.dispose(); }
  else { scene.remove(p.sp); p.sp.material.dispose(); }
  live.splice(i, 1);
}

// per-frame: advance sprite/bolt lifecycles (Box renders the frame)
function step(dt) {
  for (let i = live.length - 1; i >= 0; i--) {
    const p = live[i];
    if (p.kind === 'ls') {
      p.life += dt; try { p.strike.update(p.life); } catch {}
      if (p.life >= p.max) removeLive(i);
      continue;
    }
    p.life += dt;
    const t = p.life / p.max;
    if (t >= 1) { removeLive(i); continue; }
    p.vy -= p.grav * dt;
    const damp = 1 - p.drag * dt;
    p.vx *= damp; p.vy *= damp;
    p.sp.position.x += p.vx * dt + Math.sin((p.life + p.phase) * p.swayF) * p.swayA * dt;
    p.sp.position.y += p.vy * dt;
    p.sp.material.rotation += p.ang * dt;
    const s = p.sizeA + (p.sizeB - p.sizeA) * t; p.sp.scale.set(s, s, 1);
    let o = p.fadeIn > 0 ? Math.min(1, t / p.fadeIn) : 1;
    o *= t > 0.78 ? (1 - t) / 0.22 : 1;
    p.sp.material.opacity = Math.max(0, o) * p.alpha;
  }
  maybeIdle();
}

window.BRFX = BRFX;
export default BRFX;
