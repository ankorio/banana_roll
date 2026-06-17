/* ============================================================================
   Director — the public entry the overlay (or the playground) talks to.
   Wires the layers together: builds the Conductor, owns the per-roll Context,
   resolves Triggers to registered effects, and spawns them. The particle layer
   (BRFX) is attached here too so ctx.fx() works.

   Usage:
     Director.attach(Box);   // once, after Box.initialize()
     Director.onRoll(roll);  // per roll → fires whatever the triggers match
   ========================================================================== */
import { Conductor } from './conductor.js';
import { createContext } from './context.js';
import { buildEffect, preloadAll } from './registry.js';
import { TRIGGERS } from './triggers.js';
import BRFX from '../fx-layer.js';

// Effect recipes self-register on import. Add new ones to this list.
import './effects/void-hole.js';
import './effects/crit-glow.js';
import './effects/mage-rabbit.js';
import './effects/void-dome.js';
import './effects/halo-aura.js';
import './effects/fumble-glow.js';

let Box = null;
let conductor = null;
let warmed = false;

// "Heavy" effects own the stage (models / shader domes). The overlay caps these
// to ONE at a time so concurrent rolls don't stack full-scene animations; the
// light glows (crit/fumble) ignore the cap and always fire.
const HEAVY = new Set(['mageRabbit', 'voidDome', 'voidHole']);
let heavyActive = false;

// Wrap an instance's dispose so the heavy slot is released exactly once when the
// effect ends — whether the Conductor reaps it or it disposes itself.
function releaseHeavyOnDispose(inst) {
  const orig = inst.dispose;
  let released = false;
  inst.dispose = function (...args) {
    if (!released) { released = true; heavyActive = false; }
    return orig ? orig.apply(this, args) : undefined;
  };
}

export const Director = {
  attach(box) {
    if (conductor) return Director;
    Box = box;
    try { BRFX.attach(box); } catch (e) { console.warn('[fx] BRFX attach failed', e); }
    conductor = new Conductor(box).attach();
    return Director;
  },

  detach() {
    conductor?.detach();
    conductor = null;
    Box = null;
    heavyActive = false;
  },

  // Warm every recipe's heavy assets (models, atlases, shader programs) so the
  // first real trigger never stalls. Idempotent; safe to call on idle after attach.
  async warmup(box) {
    if (warmed) return;
    warmed = true;
    try { await preloadAll(box || Box); }
    catch (e) { console.warn('[fx] warmup failed', e); }
  },

  // Run whatever effects the triggers bind to this roll outcome.
  //   opts.groupId  — scope the effect to this roll's own dice (overlay; up to 5 concurrent).
  //   opts.overlay  — true on the live overlay → skip triggers marked `overlay: false`.
  //   opts.disabled — a Set of result keys (crit/fumble/disadvantage/…) turned off in room settings.
  async onRoll(roll, opts = {}) {
    if (!conductor) { console.warn('[fx] Director not attached'); return; }
    const ctx = createContext(Box, BRFX, roll, opts.groupId);
    for (const trig of TRIGGERS) {
      if (opts.overlay && trig.overlay === false) continue;   // playground/demo-only trigger
      if (opts.disabled && trig.key && opts.disabled.has(trig.key)) continue;   // disabled in room settings
      if (!trig.when(roll)) continue;
      const playId = typeof trig.play === 'function' ? trig.play(roll) : trig.play;  // play may pick an id at random

      // Concurrency cap for heavy effects: claim the single slot BEFORE any await
      // (model loads are async — claiming after would race two casts into the slot).
      const heavy = HEAVY.has(playId);
      if (heavy) {
        if (heavyActive) continue;     // a big effect is already on stage → skip this one
        heavyActive = true;
      }

      let inst = buildEffect(playId, ctx);
      if (inst && typeof inst.then === 'function') inst = await inst;   // async recipe (model load)
      if (inst) {
        if (heavy) releaseHeavyOnDispose(inst);
        conductor.spawn(inst);
      } else if (heavy) {
        heavyActive = false;           // build failed / nothing to do → free the slot
      }
    }
  },

  // Build + spawn one effect by id directly (no trigger/roll needed) — for
  // standalone scenes like 'mageRabbit'. Handles async (model-loading) recipes.
  async play(id, roll = null) {
    if (!conductor) { console.warn('[fx] Director not attached'); return; }
    const ctx = createContext(Box, BRFX, roll);
    let inst = buildEffect(id, ctx);
    if (inst && typeof inst.then === 'function') inst = await inst;
    if (inst) conductor.spawn(inst);
    return inst;
  },

  get conductor() { return conductor; },   // for debugging from the console
};

export default Director;
