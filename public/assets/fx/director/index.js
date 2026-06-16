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
import { buildEffect } from './registry.js';
import { TRIGGERS } from './triggers.js';
import BRFX from '../fx-layer.js';

// Effect recipes self-register on import. Add new ones to this list.
import './effects/void-hole.js';
import './effects/crit-glow.js';
import './effects/mage-rabbit.js';

let Box = null;
let conductor = null;

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
  },

  // Run whatever effects the triggers bind to this roll outcome.
  async onRoll(roll) {
    if (!conductor) { console.warn('[fx] Director not attached'); return; }
    const ctx = createContext(Box, BRFX, roll);
    for (const trig of TRIGGERS) {
      if (!trig.when(roll)) continue;
      let inst = buildEffect(trig.play, ctx);
      if (inst && typeof inst.then === 'function') inst = await inst;   // async recipe (model load)
      if (inst) conductor.spawn(inst);
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
