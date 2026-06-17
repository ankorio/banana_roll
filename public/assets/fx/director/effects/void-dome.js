/* ============================================================================
   Recipe: voidDome — a dark energy sphere with a glowing purple rim that blooms
   in the middle of the stage, holds ~1.5s, then collapses. Inspired by the
   "barrier dome" spell VFX: a translucent dark core + a hot Fresnel edge + a
   shell of drifting purple motes.

   Built from what we already have: a SphereGeometry + a small custom Fresnel
   ShaderMaterial (rim = how grazing the view angle is), a THREE.Points mote
   shell, all under one rig whose SCALE the timeline tweens (bloom → hold →
   collapse). No new infra — just scene objects + the timeline grammar.
   ========================================================================== */
import { defineEffect } from '../registry.js';
import { timeline } from '../timeline.js';
import * as THREE from 'three';

const RADIUS = 115;          // ~die-sized core sphere (a die's bounding sphere ≈ 178), so it sits on the die rather than engulfing it
const CORE = new THREE.Color(0x000000);
const RIM  = new THREE.Color(0xc77dff);
const SMOKE = new THREE.Color(0x5a3d7a);   // dim violet smoke drifting inside the void body

// soft glow disc (harvested halo art) → a purple aura bloom behind the sphere
const GLOW_URL = '/assets/fx/textures/auras_halos/Halo3.png';
// animated smoke-ball sheet (8×4 = 32 frames, smoke in the alpha channel) wrapped
// onto the sphere so the black core billows instead of reading as a dead black ball
const SMOKE_URL = '/assets/fx/textures/auras_halos/smokeball.png';
// purple magic-portal ring (cgheven 8×8 = 64-frame atlas, the slowed purple variant)
// layered on the dome so a swirling portal frames the void — matched to its size & timing.
const PORTAL_URL = '/assets/fx/textures/VFX_cgheven/Magic_Portal_02_Front_2K_8x8_purple.webp';
const PORTAL_COLS = 8, PORTAL_ROWS = 8, PORTAL_FRAMES = 64, PORTAL_FPS = 60;  // 64/20 ≈ 3.2s full cycle
const _loader = new THREE.TextureLoader();
let _glowTex = null;
const loadGlow = () => _glowTex || (_glowTex = new Promise((res, rej) =>
  _loader.load(GLOW_URL, (t) => { t.colorSpace = THREE.SRGBColorSpace; res(t); }, undefined, rej)));
// shared atlas-texture loader (no mipmaps + clamp → the 8×N cells never bleed into each other)
const loadAtlas = (cache, url) => cache.ref || (cache.ref = new Promise((res, rej) =>
  _loader.load(url, (t) => {
    t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false;
    t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; res(t);
  }, undefined, rej)));
const _smokeCache = {}, _portalCache = {};
const loadSmoke = () => loadAtlas(_smokeCache, SMOKE_URL);
const loadPortal = () => loadAtlas(_portalCache, PORTAL_URL);

// Per-frame orb scale, MEASURED from the portal's ring radius across its 64 frames (the
// alpha ring's peak radius, normalised + presence-gated). Driving the sphere by this makes
// its silhouette ride the portal ring through the open → full → close, so the two stay
// 100% coordinated. Regenerate via the radial analysis in scripts notes if the atlas changes.
const SPHERE_SCALE = [
  0.000, 0.000, 0.000, 0.000, 0.002, 0.002, 0.002, 0.009,
  0.041, 0.120, 0.245, 0.379, 0.467, 0.533, 0.567, 0.633,
  0.667, 0.700, 0.733, 0.767, 0.833, 0.867, 0.900, 0.900,
  0.933, 0.967, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000,
  1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 0.967,
  0.933, 0.900, 0.900, 0.900, 0.900, 0.867, 0.833, 0.800,
  0.767, 0.733, 0.667, 0.600, 0.533, 0.500, 0.500, 0.500,
  0.500, 0.500, 0.467, 0.392, 0.287, 0.194, 0.102, 0.000,
];
const curveAt = (arr, x) => {                    // linear-interpolated lookup (x in frame units)
  if (x <= 0) return arr[0];
  if (x >= arr.length - 1) return arr[arr.length - 1];
  const i = Math.floor(x); return arr[i] + (arr[i + 1] - arr[i]) * (x - i);
};

// Fresnel: the silhouette (grazing angle) glows purple; the body is solid black.
const VERT = `
  varying vec3 vN; varying vec3 vView; varying vec2 vUv;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - wp.xyz);
    vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const FRAG = `
  uniform vec3 coreColor; uniform vec3 rimColor; uniform float power; uniform float strength;
  uniform sampler2D smokeTex; uniform float smokeFrame; uniform vec3 smokeColor; uniform float smokeAmt;
  varying vec3 vN; varying vec3 vView; varying vec2 vUv;
  const float COLS = 8.0; const float ROWS = 4.0;
  void main() {
    float f = pow(1.0 - clamp(dot(normalize(vN), normalize(vView)), 0.0, 1.0), power);
    // pick the current cell of the 8×4 smoke sheet (smoke lives in the alpha channel)
    float idx = mod(floor(smokeFrame), COLS * ROWS);
    float col = mod(idx, COLS);
    float row = floor(idx / COLS);                 // row 0 = top of the image
    vec2 cell = clamp(vUv, 0.004, 0.996);          // inset a hair so neighbouring cells don't bleed
    vec2 suv = (cell + vec2(col, ROWS - 1.0 - row)) / vec2(COLS, ROWS);
    float dens = texture2D(smokeTex, suv).a;
    float body = 1.0 - f;                          // fade smoke out toward the bright rim so the edge stays clean
    vec3 core = mix(coreColor, smokeColor, dens * smokeAmt * body);
    vec3 outc = mix(core, rimColor * strength, f); // body(+smoke) → bright purple rim
    gl_FragColor = vec4(outc, 1.0);                // fully opaque (not translucent)
  }`;

function makeMotes(r, n = 180) {
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random(), v = Math.random();
    const th = 2 * Math.PI * u, ph = Math.acos(2 * v - 1);
    const rad = r * (0.35 + 0.72 * Math.random());   // a thick shell, some inside/outside the rim
    pos[i * 3]     = rad * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = rad * Math.sin(ph) * Math.sin(th);
    pos[i * 3 + 2] = rad * Math.cos(ph);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color: 0xd7a3ff, size: 4, transparent: true, opacity: 0.9,
    depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const pts = new THREE.Points(g, m); pts.renderOrder = 21;   // over the dome
  return pts;
}

defineEffect('voidDome', async (ctx) => {
  const scene = ctx.scene;
  // centre on the discarded die if there is one (adv/dis loser), else the kept die.
  // When there's a loser, the void EATS it: seize now, remove once the sphere covers it.
  const target = (ctx.dice && (ctx.dice.loser || ctx.dice.winner || ctx.dice.all[0])) || null;
  const consume = !!(ctx.dice && ctx.dice.loser);
  const c = target ? { x: target.position.x, y: target.position.y, z: target.position.z } : { x: 0, y: 0, z: 0 };
  if (consume) ctx.seize(target);
  const rig = new THREE.Group();          // positions the whole effect (no bloom scale here)
  rig.position.set(c.x, c.y, c.z);
  scene.add(rig);
  const core = new THREE.Group();         // sphere + glow — scaled per-frame to ride the portal ring
  rig.add(core);

  // Drawn in the transparent queue on top (depthTest off, renderOrder high) so the
  // opaque dice — which the engine draws over scene meshes — don't punch through it.
  const mat = new THREE.ShaderMaterial({
    uniforms: { coreColor: { value: CORE }, rimColor: { value: RIM }, power: { value: 3.0 }, strength: { value: 1 },
      smokeTex: { value: null }, smokeFrame: { value: 0 }, smokeColor: { value: SMOKE }, smokeAmt: { value: 0.9 } },
    vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, depthTest: false, side: THREE.FrontSide, blending: THREE.NormalBlending,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(RADIUS, 48, 32), mat);
  dome.renderOrder = 20;

  // animated smoke wrapped on the sphere body (own clone so each cast animates independently)
  const smokeTex = (await loadSmoke()).clone(); smokeTex.needsUpdate = true;
  mat.uniforms.smokeTex.value = smokeTex;

  // soft glow disc behind the sphere → reads as a purple aura ringing the void
  const glowTex = (await loadGlow()).clone(); glowTex.needsUpdate = true;
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(RADIUS * 3, RADIUS * 3),
    new THREE.MeshBasicMaterial({ map: glowTex, color: RIM, transparent: true, opacity: 0.55,
      depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }));
  glow.renderOrder = 18;     // behind the sphere (20) and motes (21)

  // purple portal ring framing the void — own clone so each cast walks its own frame.
  // The ring's PEAK radius is ~0.381 of the sheet's half-frame, so a plane of RADIUS/0.381×2
  // (≈ RADIUS*5.25) lands the ring on the sphere's border at FULL; the orb then tracks the ring
  // at every other frame via SPHERE_SCALE (see the drive loop) → fully coordinated.
  const portalTex = (await loadPortal()).clone(); portalTex.needsUpdate = true;
  portalTex.repeat.set(1 / PORTAL_COLS, 1 / PORTAL_ROWS);
  const portal = new THREE.Mesh(new THREE.PlaneGeometry(RADIUS * 5.25, RADIUS * 5.25),
    new THREE.MeshBasicMaterial({ map: portalTex, transparent: true, opacity: 1,
      depthWrite: false, depthTest: false, side: THREE.DoubleSide, toneMapped: false }));
  portal.renderOrder = 22;   // in front of the sphere → the ring frames the void

  core.add(dome, glow);              // these bloom/collapse with the orb (scaled by the curve)
  rig.add(portal);                   // frame-animated atlas — fixed size; its frames open/close

  // The whole effect is frame-locked to the portal: one full 64-frame cycle is its lifetime.
  // The orb (core) is scaled to the portal's ring radius at each frame, so the sphere edge
  // rides the ring through open → full → close (100% coordinated).
  const TOTAL = PORTAL_FRAMES / PORTAL_FPS;
  let removed = false;

  return timeline()
    .spin(glow, { z: 0.25 }, { at: 0 })                                // glow slowly rotates
    .spin(portal, { z: 0.12 }, { at: 0 })                              // the portal ring swirls slowly
    .drive((dt, t) => {
      // portal walks its 8×8 atlas ONCE, frame-locked to the effect's life
      const ff = Math.min(t * PORTAL_FPS, PORTAL_FRAMES - 1);          // fractional frame
      const pf = Math.floor(ff);
      const ox = (pf % PORTAL_COLS) / PORTAL_COLS, oy = 1 - (Math.floor(pf / PORTAL_COLS) + 1) / PORTAL_ROWS;
      portalTex.offset.set(ox, oy);

      // orb sized to the ring at THIS frame → the sphere edge sits on the portal ring
      const s = curveAt(SPHERE_SCALE, ff);
      core.scale.setScalar(Math.max(1e-3, s));
      if (consume && !removed && s > 0.5) { removed = true; ctx.removeDie(target); }   // void swallows the die once covered

      // sphere shimmer + smoke; glow tracks the bloom; portal fades via its own alpha
      mat.uniforms.strength.value = 1 + 0.12 * Math.sin(t * 6);
      mat.uniforms.smokeFrame.value = t * 16;   // billow the smoke at ~16fps (looped in-shader)
      glow.material.opacity = 0.55 * s * (0.8 + 0.2 * Math.sin(t * 5));
      portal.material.opacity = 1;
    })
    .duration(TOTAL + 0.05)
    .onEnd(() => {
      scene.remove(rig);
      dome.geometry.dispose(); mat.dispose(); smokeTex.dispose();
      glow.geometry.dispose(); glow.material.map.dispose(); glow.material.dispose();
      portal.geometry.dispose(); portalTex.dispose(); portal.material.dispose();
    })
    .build();
},
// warmup: fetch the three textures AND precompile the custom Fresnel program so the
// first cast doesn't hitch on a mid-frame shader compile. We build the ShaderMaterial
// on a throwaway sphere, add+compile+remove it before any frame draws it (no flash).
async (box) => {
  await Promise.all([loadGlow(), loadSmoke(), loadPortal()]);
  if (!box || !box.renderer || !box.scene || !box.camera) return;
  const mat = new THREE.ShaderMaterial({
    uniforms: { coreColor: { value: CORE }, rimColor: { value: RIM }, power: { value: 3.0 }, strength: { value: 1 },
      smokeTex: { value: null }, smokeFrame: { value: 0 }, smokeColor: { value: SMOKE }, smokeAmt: { value: 0.9 } },
    vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, depthTest: false, side: THREE.FrontSide, blending: THREE.NormalBlending,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), mat);
  // Compile in an ISOLATED scene (only this mesh) so we build just the Fresnel program
  // without re-introspecting the live dice materials — lighter, and never drawn (no flash).
  const tmp = new THREE.Scene(); tmp.add(mesh);
  try { box.renderer.compile(tmp, box.camera); }   // builds the GL program without drawing
  catch (e) { console.warn('[fx] void-dome shader precompile failed', e); }
  mesh.geometry.dispose(); mat.dispose();
});
