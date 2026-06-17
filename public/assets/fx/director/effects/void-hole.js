/* ============================================================================
   Recipe: voidHole — the losing die of an advantage/disadvantage roll is sucked
   into a dark swirling vortex that opens in the table beneath it. On a
   DISADVANTAGE roll the kept die is the lower one, so the loser is the HIGHER
   die — the big number gets eaten by the void.

   The die circles the drain (accelerating orbit), tumbles ever faster, sinks
   along −z (down through the table, away from our top-down camera) and shrinks
   to nothing. A `voidSwirl` particle burst sells the hole.

   This is a SCRIPT in the timeline grammar. It mentions dice and the void; it
   never touches frames, Box.start/stop, or onBeforeRender.
   ========================================================================== */
import { defineEffect } from '../registry.js';
import { timeline } from '../timeline.js';

const DUR  = 1.5;    // seconds, full suck
const REVS = 2.4;    // how many times the die circles the drain on the way in
const DROP = 320;    // world units it sinks below the table (−z) before it's gone
const ease = (t) => t * t * t;   // cubic easeIn: gentle pull → fast vanish

defineEffect('voidHole', (ctx) => {
  const die = ctx.dice.loser;
  if (!die) return null;             // normal roll has no loser → nothing to do

  ctx.seize(die);                    // take it off physics: the recipe drives it now
  const cx = die.position.x, cy = die.position.y, z0 = die.position.z;  // hole center
  const a0 = Math.random() * Math.PI * 2;   // random entry angle
  const s0 = die.scale.x || 1;
  const holePos = { x: cx, y: cy, z: z0 };   // swirl lies on the table under the die

  return timeline()
    // the vortex tears open right under the die
    .call(0,    () => ctx.fx('voidSwirl', { worldPos: holePos, color: 0x7b3ff2, intensity: 1.5 }))
    .call(0.45, () => ctx.fx('voidSwirl', { worldPos: holePos, color: 0x9a5bff, intensity: 0.8 }))
    // the die tumbles faster and faster as the pull takes hold
    .spin(die, { x: 7, y: 5, z: 11 })
    // circle the drain → spiral into the center, sink through the table, shrink away
    .drive((dt, t) => {
      const p = Math.min(1, t / DUR), e = ease(p);
      const ang = a0 + REVS * Math.PI * 2 * e;
      const r = 80 * Math.sin(Math.PI * e);    // 0 at the ends, swells mid-suck → orbits the drain
      die.position.x = cx + Math.cos(ang) * r;
      die.position.y = cy + Math.sin(ang) * r;
      die.position.z = z0 - DROP * e;          // down through the table, receding from camera
      const s = s0 * (1 - e);
      die.scale.set(s, s, s);
    })
    .duration(DUR)
    // a last dim gulp as the hole closes
    .call(DUR - 0.08, () => ctx.fx('voidSwirl', { worldPos: holePos, color: 0x3a0d5e, intensity: 0.5 }))
    .onEnd(() => ctx.removeDie(die))
    .build();
});
