/* ============================================================================
   Banana Roll — FX layer (window.BRFX)
   A self-contained, transparent three.js canvas layered over the dice/plaque for
   fantasy VFX. Its own WebGL context (the dice engine's three.js is bundled and
   not shareable). A tiny sprite particle engine + the LightningStrike addon drive
   the effects in effects.js. Idle (no RAF) when nothing is playing.

   API:  BRFX.init(containerEl)  ·  BRFX.play(name, { origin:{x,y in 0..1}, color, intensity })
         BRFX.resize()  ·  BRFX.names()
   ========================================================================== */
import * as THREE from 'three';
import { EFFECTS, makeTextures } from './effects.js';
// LightningStrike was removed from current three; load the last version that has it from
// the CDN, with ?external=three so it uses OUR three (the import-map one) — no version clash.
import { LightningStrike } from 'https://esm.sh/three@0.150.0/examples/jsm/geometries/LightningStrike.js?external=three';

let renderer, scene, camera, clock, container, TEX, raf = null;
let W = 0, H = 0;
const live = []; // active particles + lightning bolts

const BRFX = {
  init(el) {
    if (renderer) return BRFX;
    container = el;
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setClearColor(0x000000, 0);
    Object.assign(renderer.domElement.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });
    container.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1000, 1000); // world units = px, origin centered, y up
    clock = new THREE.Clock();
    TEX = makeTextures(THREE);
    BRFX.resize();
    try { new ResizeObserver(() => BRFX.resize()).observe(container); } catch {}
    return BRFX;
  },

  resize() {
    if (!renderer) return;
    const r = container.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    renderer.setSize(W, H, false);
    camera.left = -W / 2; camera.right = W / 2; camera.top = H / 2; camera.bottom = -H / 2;
    camera.updateProjectionMatrix();
  },

  names() { return Object.keys(EFFECTS); },
  label(name) { return EFFECTS[name] && EFFECTS[name].label || name; },

  play(name, opts = {}) {
    if (!renderer) return;
    const def = EFFECTS[name]; if (!def) { console.warn('[fx] unknown effect', name); return; }
    const o = opts.origin || { x: 0.5, y: 0.5 };
    const origin = { x: (o.x - 0.5) * W, y: (0.5 - o.y) * H };
    try {
      def.spawn({ THREE, tex: TEX, W, H, origin, color: opts.color != null ? new THREE.Color(opts.color).getHex() : null,
        intensity: Math.max(0.2, opts.intensity || 1), addParticle, addLightning });
    } catch (e) { console.warn('[fx] effect failed', name, e); }
    ensureLoop();
  },
};

function addParticle(c) {
  if (c.delay && c.delay > 0) { const d = c.delay; c.delay = 0; setTimeout(() => { addParticle(c); ensureLoop(); }, d * 1000); return; }
  const mat = new THREE.SpriteMaterial({ map: c.tex, color: c.color != null ? c.color : 0xffffff, transparent: true,
    depthTest: false, depthWrite: false, blending: c.blending || THREE.NormalBlending });
  mat.opacity = 0; mat.rotation = c.rot || 0;
  const sp = new THREE.Sprite(mat);
  sp.position.set(c.x, c.y, 0); sp.scale.set(c.sizeA, c.sizeA, 1);
  scene.add(sp);
  live.push({ kind: 'p', sp, vx: c.vx || 0, vy: c.vy || 0, grav: c.grav || 0, drag: c.drag || 0, ang: c.ang || 0,
    life: 0, max: c.life || 1, sizeA: c.sizeA, sizeB: c.sizeB != null ? c.sizeB : c.sizeA,
    fadeIn: c.fadeIn != null ? c.fadeIn : 0.1, alpha: c.alpha != null ? c.alpha : 1,
    swayF: c.swayF || 0, swayA: c.swayA || 0, phase: Math.random() * 6.283 });
}

function addLightning(c) {
  const src = new THREE.Vector3(c.x, H / 2, 0);
  const dst = new THREE.Vector3(c.x + (Math.random() * 60 - 30), -H / 2, 0);
  let strike;
  try {
    strike = new LightningStrike({ sourceOffset: src, destOffset: dst, radius0: c.r0 || 4, radius1: c.r1 || 2,
      minRadius: 1, maxIterations: 7, isEternal: false, birthTime: 0.1, deathTime: (c.life || 0.45),
      timeScale: 1, propagationTimeFactor: 0.06, vanishingTimeFactor: 0.9, subrayPeriod: 0.8, subrayDutyCycle: 0.6,
      maxSubrayRecursion: 3, ramification: 7, recursionProbability: 0.7, roughness: 0.85, straightness: 0.6 });
  } catch (e) { console.warn('[fx] LightningStrike unavailable', e); return; }
  const mesh = new THREE.Mesh(strike, new THREE.MeshBasicMaterial({ color: c.color || 0xbfe0ff, transparent: true, blending: THREE.AdditiveBlending, depthTest: false }));
  scene.add(mesh);
  live.push({ kind: 'ls', strike, mesh, life: 0, max: (c.life || 0.45) + 0.15 });
}

function ensureLoop() { if (!raf) { clock.getDelta(); raf = requestAnimationFrame(tick); } }

function tick() {
  const dt = Math.min(0.05, clock.getDelta());
  for (let i = live.length - 1; i >= 0; i--) {
    const p = live[i];
    if (p.kind === 'ls') {
      p.life += dt; try { p.strike.update(p.life); } catch {}
      if (p.life >= p.max) { scene.remove(p.mesh); p.mesh.material.dispose(); live.splice(i, 1); }
      continue;
    }
    p.life += dt;
    const t = p.life / p.max;
    if (t >= 1) { scene.remove(p.sp); p.sp.material.dispose(); live.splice(i, 1); continue; }
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
  renderer.render(scene, camera);
  raf = live.length ? requestAnimationFrame(tick) : null; // idle when nothing is playing
}

window.BRFX = BRFX;
export default BRFX;
