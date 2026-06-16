/* ============================================================================
   Recipe: critGlow — on a critical hit the die(ce) flare with a warm golden
   glow: their own material lights up (emissive pulse) and a soft halo + a few
   twinkles pop around them. Tuned to be clearly visible but not over the top.

   Written in the timeline grammar — it knows about dice and glow, never about
   frames, Box.start/stop, or onBeforeRender. The die material is restored on
   end so the dice return to normal for the next roll.
   ========================================================================== */
import { defineEffect } from '../registry.js';
import { timeline } from '../timeline.js';

const DUR   = 1.5;          // seconds
const COLOR = 0xffe39a;     // warm gold
const PEAK  = 1.15;         // extra emissiveIntensity at the flash peak (gold glow, not white-hot)

defineEffect('critGlow', (ctx) => {
  const dice = ctx.dice.all.filter(Boolean);
  if (!dice.length) return null;

  // Collect every emissive-capable material once (dice share face materials, so
  // dedupe via a Set) and remember each one's original look to restore later.
  const seen = new Set();
  const mats = [];
  for (const die of dice) die.traverse?.((n) => {
    const list = Array.isArray(n.material) ? n.material : (n.material ? [n.material] : []);
    for (const mat of list) {
      if (!mat || seen.has(mat) || !('emissive' in mat)) continue;
      seen.add(mat);
      mats.push({ mat, color0: mat.emissive.clone(), int0: mat.emissiveIntensity ?? 1 });
    }
  });
  if (!mats.length) return null;

  // soft halo + twinkles around each die
  for (const die of dice) ctx.fx('critShine', { worldPos: die.position, color: COLOR, intensity: 1 });

  const env = { v: 0 };   // 0..1 glow envelope: snap up, ease back down
  return timeline()
    .tween(env, { v: 1 }, { at: 0,   dur: 0.18, ease: 'easeOut' })
    .tween(env, { v: 0 }, { at: 0.3, dur: DUR - 0.3, ease: 'easeIn' })
    .drive(() => {
      for (const e of mats) {
        e.mat.emissive.setHex(COLOR);
        e.mat.emissiveIntensity = e.int0 + env.v * PEAK;
      }
    })
    .duration(DUR)
    .onEnd(() => { for (const e of mats) { e.mat.emissive.copy(e.color0); e.mat.emissiveIntensity = e.int0; } })
    .build();
});
