/* ============================================================================
   Recipe: fumbleGlow — on a fumble (nat 1) the die(ce) flush with an angry red
   glow, and the FACE NUMBER glows a hotter red so the damning "1" is unmissable.

   The dice number texture has DARK digits on a lighter marble body, so we feed
   each face's own `map` in as the material's emissiveMap and patch the emissive
   shader chunk to INVERT it: dark digits → strong red emissive, light body →
   only a faint red wash. emissiveIntensity is ramped by the timeline and faded
   back out; everything (emissive, emissiveMap, the shader patch) is restored on
   end so the dice are pristine for the next roll.
   ========================================================================== */
import { defineEffect } from '../registry.js';
import { timeline } from '../timeline.js';

const DUR  = 1.8;          // seconds
const RED  = 0xff2020;     // angry red
const PEAK = 1.6;          // emissiveIntensity at the peak
const DARK = 0x2a0000;     // base colour while glowing — kills the lit marble so the
                           // RED EMISSIVE (not the diffuse) defines the look

// Replace the stock emissive-map chunk: build the glow from the INVERTED texture
// luminance (dark digits → ~1) with a floor so the whole die still reddens, and a
// big digit boost so the number clearly out-glows the body.
const EMISSIVE_PATCH = `
  #ifdef USE_EMISSIVEMAP
    vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
    float l = dot( emissiveColor.rgb, vec3( 0.3333 ) );
    float digit = 1.0 - smoothstep( 0.30, 0.62, l );  // dark digits → 1, light body → 0 (edge0<edge1, valid)
    totalEmissiveRadiance *= ( 0.45 + 2.2 * digit );  // glowing red body + blazing red number
  #endif
`;

defineEffect('fumbleGlow', (ctx) => {
  const dice = ctx.dice.all.filter(Boolean);
  if (!dice.length) return null;

  // Each face has its own material+map (the number); dedupe and remember originals.
  const seen = new Set();
  const mats = [];
  for (const die of dice) die.traverse?.((n) => {
    const list = Array.isArray(n.material) ? n.material : (n.material ? [n.material] : []);
    for (const mat of list) {
      if (!mat || seen.has(mat) || !('emissive' in mat) || !mat.map) continue;
      seen.add(mat);
      // c0 = original colour; cDark = the muted base — we lerp between them by the
      // envelope so the die darkens as it glows and returns to marble as it fades.
      mats.push({ mat, emissive0: mat.emissive.getHex(), int0: mat.emissiveIntensity ?? 1,
        map0: mat.emissiveMap, obc0: mat.onBeforeCompile,
        c0: mat.color.clone(), cDark: mat.color.clone().setHex(DARK) });
      mat.emissive.setHex(RED);
      mat.emissiveMap = mat.map;                       // glow shaped by the face's number
      mat.emissiveIntensity = 0;
      mat.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', EMISSIVE_PATCH); };
      mat.needsUpdate = true;                          // recompile with the patch + emissiveMap
    }
  });
  if (!mats.length) return null;

  // soft red twinkles around each die
  for (const die of dice) ctx.fx('critShine', { worldPos: die.position, color: RED, intensity: 0.8 });

  const env = { v: 0 };   // 0..1: snap up, then alpha eases back to 0 over time
  return timeline()
    .tween(env, { v: 1 }, { at: 0,   dur: 0.2,       ease: 'easeOut' })
    .tween(env, { v: 0 }, { at: 0.2, dur: DUR - 0.2, ease: 'easeOut' })
    .drive(() => { for (const e of mats) {
      e.mat.emissiveIntensity = env.v * PEAK;
      e.mat.color.copy(e.c0).lerp(e.cDark, env.v);     // marble → muted as it glows, back as it fades
    } })
    .duration(DUR)
    .onEnd(() => { for (const e of mats) {
      e.mat.color.copy(e.c0);
      e.mat.emissive.setHex(e.emissive0); e.mat.emissiveIntensity = e.int0;
      e.mat.emissiveMap = e.map0; e.mat.onBeforeCompile = e.obc0; e.mat.needsUpdate = true;
    } })
    .build();
});
