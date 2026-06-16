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

const RADIUS = 185;          // just bigger than a die (its bounding sphere ≈ 178) so it engulfs it cleanly
const CORE = new THREE.Color(0x000000);
const RIM  = new THREE.Color(0xc77dff);

// soft glow disc (harvested halo art) → a purple aura bloom behind the sphere
const GLOW_URL = '/assets/fx/auras_halos/Halo3.png';
const _loader = new THREE.TextureLoader();
let _glowTex = null;
const loadGlow = () => _glowTex || (_glowTex = new Promise((res, rej) =>
  _loader.load(GLOW_URL, (t) => { t.colorSpace = THREE.SRGBColorSpace; res(t); }, undefined, rej)));

// Fresnel: the silhouette (grazing angle) glows purple; the body is solid black.
const VERT = `
  varying vec3 vN; varying vec3 vView;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const FRAG = `
  uniform vec3 coreColor; uniform vec3 rimColor; uniform float power; uniform float strength;
  varying vec3 vN; varying vec3 vView;
  void main() {
    float f = pow(1.0 - clamp(dot(normalize(vN), normalize(vView)), 0.0, 1.0), power);
    vec3 col = mix(coreColor, rimColor * strength, f);   // black body → bright purple rim
    gl_FragColor = vec4(col, 1.0);                       // fully opaque (not translucent)
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
  const rig = new THREE.Group();
  rig.position.set(c.x, c.y, c.z);
  rig.scale.setScalar(0.001);
  scene.add(rig);

  // Drawn in the transparent queue on top (depthTest off, renderOrder high) so the
  // opaque dice — which the engine draws over scene meshes — don't punch through it.
  const mat = new THREE.ShaderMaterial({
    uniforms: { coreColor: { value: CORE }, rimColor: { value: RIM }, power: { value: 3.0 }, strength: { value: 1 } },
    vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, depthTest: false, side: THREE.FrontSide, blending: THREE.NormalBlending,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(RADIUS, 48, 32), mat);
  dome.renderOrder = 20;
  const motes = makeMotes(RADIUS);

  // soft glow disc behind the sphere → reads as a purple aura ringing the void
  const glowTex = (await loadGlow()).clone(); glowTex.needsUpdate = true;
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(RADIUS * 4, RADIUS * 4),
    new THREE.MeshBasicMaterial({ map: glowTex, color: RIM, transparent: true, opacity: 0.55,
      depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }));
  glow.renderOrder = 18;     // behind the sphere (20) and motes (21)
  rig.add(dome, motes, glow);

  // a small purple flash where it opens (uses the existing particle layer)
  const BLOOM = 0.5, HOLD = 1.5, COLLAPSE = 0.45;
  const T_OUT = BLOOM + HOLD;

  return timeline()
    .tween(rig.scale, { x: 1, y: 1, z: 1 }, { from: { x: 0.001, y: 0.001, z: 0.001 }, at: 0, dur: BLOOM, ease: 'easeOut' })
    .call(BLOOM, () => { if (consume) ctx.removeDie(target); })     // the void swallows the discarded die once hidden
    .spin(motes, { y: 0.5, z: 0.18 }, { at: 0 })                       // motes drift around the shell
    .spin(glow, { z: 0.25 }, { at: 0 })                                // glow slowly rotates
    .tween(rig.scale, { x: 0.001, y: 0.001, z: 0.001 }, { from: { x: 1, y: 1, z: 1 }, at: T_OUT, dur: COLLAPSE, ease: 'easeIn' })
    .drive((dt, t) => {
      // subtle rim breathing while it holds; fade the motes + glow out as it collapses
      mat.uniforms.strength.value = 1 + 0.12 * Math.sin(t * 6);
      const k = t < T_OUT ? 1 : Math.max(0, 1 - (t - T_OUT) / COLLAPSE);
      motes.material.opacity = 0.9 * k * (0.7 + 0.3 * Math.sin(t * 9));
      glow.material.opacity = 0.55 * k * (0.8 + 0.2 * Math.sin(t * 5));
    })
    .duration(T_OUT + COLLAPSE + 0.05)
    .onEnd(() => {
      scene.remove(rig);
      dome.geometry.dispose(); mat.dispose();
      motes.geometry.dispose(); motes.material.dispose();
      glow.geometry.dispose(); glow.material.map.dispose(); glow.material.dispose();
    })
    .build();
});
