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

const DUR   = 1.8;          // seconds
const COLOR = 0xffe39a;     // warm gold
const PEAK  = 0.55;         // extra emissiveIntensity at the flash peak (a sheen, not white-hot)
const BLEND = 0.5;          // how far the emissive LERPS toward gold (never a full recolor)

defineEffect('critGlow', (ctx) => {
  const dice = ctx.dice.all.filter(Boolean);
  if (!dice.length) return null;

  // Collect every emissive-capable material once (dice share face materials, so
  // dedupe via a Set) and remember each one's original look to restore later.
  // `gold` is each material's own emissive colour cloned + recoloured, so we can
  // lerp *from* the original *toward* gold rather than hard-overwriting it.
  const seen = new Set();
  const mats = [];
  for (const die of dice) die.traverse?.((n) => {
    const list = Array.isArray(n.material) ? n.material : (n.material ? [n.material] : []);
    for (const mat of list) {
      if (!mat || seen.has(mat) || !('emissive' in mat)) continue;
      seen.add(mat);
      mats.push({ mat, color0: mat.emissive.clone(), int0: mat.emissiveIntensity ?? 1,
        gold: mat.emissive.clone().setHex(COLOR) });
    }
  });
  if (!mats.length) return null;

  // soft halo + twinkles around each die
  for (const die of dice) ctx.fx('critShine', { worldPos: die.position, color: COLOR, intensity: 1 });

  // glow envelope 0..1: rises quickly to a peak, then its alpha eases back to 0
  // over the whole duration → a natural shine that fades, not a solid colour swap.
  const env = { v: 0 };
  return timeline()
    .tween(env, { v: 1 }, { at: 0,    dur: 0.2,       ease: 'easeOut' })
    .tween(env, { v: 0 }, { at: 0.2,  dur: DUR - 0.2, ease: 'easeOut' })
    .drive(() => {
      for (const e of mats) {
        e.mat.emissive.copy(e.color0).lerp(e.gold, env.v * BLEND);  // warm up partway, fade back
        e.mat.emissiveIntensity = e.int0 + env.v * PEAK;
      }
    })
    .duration(DUR)
    .onEnd(() => { for (const e of mats) { e.mat.emissive.copy(e.color0); e.mat.emissiveIntensity = e.int0; } })
    .build();
});
