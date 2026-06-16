/* ============================================================================
   Recipe: mageRabbit — outcome scene (fires on a FUMBLE). Played on the rolled die:
     1. a cloud puffs in and the Wizard rises out of it, FACING the die,
     2. he performs Spell1 (with an arcane flourish aimed at the die),
     3. the die is REPLACED by a Rabbit (poof — die removed, rabbit spawned in its place),
     4. the Rabbit scurries off the scene doing Bunny_walk.

   Everything is viewed top-down (eagle-eye): the dice camera looks along −Z, so each
   model is tipped flat under a pivot (topDownRig) and the camera looks down on it.
   Models load via GLTFLoader (cached), animate with AnimationMixers ticked in the
   timeline's .drive(); each lives under a Group rig so we own its transform.
   ========================================================================== */
import { defineEffect } from '../registry.js';
import { timeline } from '../timeline.js';
import * as THREE from 'three';
import { GLTFLoader } from 'https://esm.sh/three@0.182.0/examples/jsm/loaders/GLTFLoader.js?external=three';
import { clone as skeletonClone } from 'https://esm.sh/three@0.182.0/examples/jsm/utils/SkeletonUtils.js?external=three';

const WIZ = '/assets/fx/Wizard.glb';
const RAB = '/assets/fx/Rabbit.glb';

const loader = new GLTFLoader();
const cache = {};
const loadGLB = (url) => cache[url] || (cache[url] = new Promise((res, rej) => loader.load(url, res, undefined, rej)));
const clip = (anims, name) => THREE.AnimationClip.findByName(anims, name) || anims.find((a) => a.name.includes(name));

// Center `model` on all axes at its own origin and return the scale factor that
// makes it ~targetH world-units tall. We measure the TRUE geometry bbox by
// transforming each mesh's geometry corners to world space — Box3.setFromObject
// over-inflates skinned-mesh bind poses, which made the model ~9× too small.
function fitModel(model, targetH) {
  model.position.set(0, 0, 0); model.rotation.set(0, 0, 0); model.scale.set(1, 1, 1);
  model.updateWorldMatrix(true, true);
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  model.traverse((n) => {
    if (!(n.isMesh || n.isSkinnedMesh) || !n.geometry) return;
    const g = n.geometry; if (!g.boundingBox) g.computeBoundingBox(); const bb = g.boundingBox;
    for (let i = 0; i < 8; i++) {
      const v = n.position.clone();
      v.set(i & 1 ? bb.max.x : bb.min.x, i & 2 ? bb.max.y : bb.min.y, i & 4 ? bb.max.z : bb.min.z);
      n.localToWorld(v);
      minX = Math.min(minX, v.x); minY = Math.min(minY, v.y); minZ = Math.min(minZ, v.z);
      maxX = Math.max(maxX, v.x); maxY = Math.max(maxY, v.y); maxZ = Math.max(maxZ, v.z);
    }
  });
  model.position.x -= (minX + maxX) / 2;     // center on every axis so it stays put when tilted
  model.position.y -= (minY + maxY) / 2;
  model.position.z -= (minZ + maxZ) / 2;
  return targetH / ((maxY - minY) || 1);
}

// EAGLE-EYE rig: the dice camera looks along −Z, so we tip the model +90° about X —
// its head (local +Y) points toward the camera (+Z) — and the camera looks down on it.
// Outer rig owns position/scale + in-plane facing (rotation.z, about the screen normal);
// inner pivot owns the fixed top-down tilt; the mixer animates the skeleton underneath.
function topDownRig(model) {
  const tilt = new THREE.Group(); tilt.rotation.x = Math.PI / 2; tilt.add(model);
  const rig = new THREE.Group(); rig.add(tilt);
  return rig;
}
// In a topDownRig, rotation.z = 0 points the model's front (local +Z) at world −Y.
// This returns the rotation.z that points its front from `from` toward `to`.
const faceZ = (from, to) => Math.atan2(to.y - from.y, to.x - from.x) + Math.PI / 2;

// ── tuning (world units; stage view is ~2600 tall, dice ~120). Scaled ~⅓ from the
// standalone scene so the mage looms a few die-heights tall over the die. ──
const MAGE_H = 380, RAB_H = 150;     // top-down character heights
const MAGE_OFFX = 420, MAGE_OFFY = -40;  // mage offset from the die
const VIS_HALF = 1400;               // ~ half the visible width (run exit point)

defineEffect('mageRabbit', async (ctx) => {
  const scene = ctx.scene;
  const die = ctx.dice.winner || ctx.dice.all[0];
  if (!die) return null;                       // need the rolled die to perform on
  const dieP = { x: die.position.x, y: die.position.y, z: die.position.z };
  ctx.seize(die);                              // freeze the doomed die's physics

  const [wizG, rabG] = await Promise.all([loadGLB(WIZ), loadGLB(RAB)]);

  // soft light so the PBR models read against the dice scene (removed on end)
  const key = new THREE.DirectionalLight(0xfff2dd, 2.4); key.position.set(300, 800, 1200); scene.add(key);
  const amb = new THREE.AmbientLight(0xffffff, 0.7); scene.add(amb);

  // ── mage: appears beside the die (on the roomier side), facing it ──
  const mageSide = dieP.x >= 0 ? -1 : 1;       // stand on the side with more room
  const mageP = { x: dieP.x + mageSide * MAGE_OFFX, y: dieP.y + MAGE_OFFY, z: dieP.z };
  const mage = skeletonClone(wizG.scene);
  const S = fitModel(mage, MAGE_H);
  const mageRig = topDownRig(mage);
  mageRig.scale.setScalar(S);
  mageRig.position.set(mageP.x, mageP.y, mageP.z);
  mageRig.rotation.z = faceZ(mageP, dieP);     // face the die
  mageRig.visible = false;
  scene.add(mageRig);

  const SLOW = (typeof window !== 'undefined' && window.__MAGE_SLOW) || 1;  // debug: stretch the scene
  const mMix = new THREE.AnimationMixer(mage); mMix.timeScale = 1 / SLOW;
  const spell = clip(wizG.animations, 'Spell1');
  const spellAct = mMix.clipAction(spell);
  spellAct.setLoop(THREE.LoopOnce, 1); spellAct.clampWhenFinished = true;
  const spellDur = spell.duration;

  let rabbitRig = null, rMix = null, runFromX = 0, runToX = 0;

  // ── timeline beats (× SLOW for debug stretching) ──
  const T_MAGE_IN = 0.15 * SLOW, T_SPELL = 0.7 * SLOW;
  const T_SWAP = T_SPELL + spellDur * SLOW;    // die → rabbit, at the spell's end
  const T_RUN = T_SWAP + 0.35 * SLOW;
  const RUN_DUR = 1.7 * SLOW;
  const total = T_RUN + RUN_DUR + 0.4 * SLOW;

  return timeline()
    // 1) cloud + the mage rising out of it
    .call(0, () => { for (let i = 0; i < 3; i++) ctx.fx('smoke', { worldPos: mageP, color: 0xb9b9c6, intensity: 1.2 }); })
    .call(T_MAGE_IN, () => { mageRig.visible = true; })
    .tween(mageRig.scale, { x: S, y: S, z: S }, { from: { x: 0, y: 0, z: 0 }, at: T_MAGE_IN, dur: 0.45, ease: 'easeOut' })
    // 2) cast Spell1, aiming an arcane flourish at the die
    .call(T_SPELL, () => { spellAct.reset(); spellAct.play(); })
    .call(T_SPELL + spellDur * 0.5 * SLOW, () => ctx.fx('arcaneBurst', { worldPos: dieP, color: 0xb98bff, intensity: 1.1 }))
    // 3) SWAP: remove the die, poof, spawn the rabbit in its place
    .call(T_SWAP, () => {
      ctx.fx('arcaneBurst', { worldPos: dieP, color: 0xb98bff, intensity: 1.4 });
      ctx.fx('smoke', { worldPos: dieP, color: 0xcfcfd8, intensity: 1.2 });
      ctx.removeDie(die);
      const rabbit = skeletonClone(rabG.scene);
      const rs = fitModel(rabbit, RAB_H);
      rabbitRig = topDownRig(rabbit);
      rabbitRig.scale.setScalar(rs);
      rabbitRig.position.set(dieP.x, dieP.y, dieP.z);
      const dir = -mageSide;                   // run away from the mage, off that side
      runFromX = dieP.x; runToX = dir * (VIS_HALF + 300);
      rabbitRig.rotation.z = dir > 0 ? Math.PI / 2 : -Math.PI / 2;  // face the run direction
      scene.add(rabbitRig);
      rMix = new THREE.AnimationMixer(rabbit); rMix.timeScale = 1 / SLOW;
      rMix.clipAction(clip(rabG.animations, 'Bunny_walk')).play();
    })
    // tick the mixers each frame; carry the rabbit off-stage during the run beat
    .drive((dt, t) => {
      mMix.update(dt);
      if (rMix) rMix.update(dt);
      if (rabbitRig && t >= T_RUN) {
        const p = Math.min(1, (t - T_RUN) / RUN_DUR);
        rabbitRig.position.x = runFromX + (runToX - runFromX) * p;
      }
    })
    .duration(total)
    .onEnd(() => {
      [mageRig, rabbitRig, key, amb].forEach((o) => { if (o) try { scene.remove(o); } catch {} });
      [mageRig, rabbitRig].forEach((rig) => rig && rig.traverse((n) => {
        n.geometry?.dispose?.();
        const m = n.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => x?.dispose?.());
      }));
    })
    .build();
});
