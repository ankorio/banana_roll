/* ============================================================================
   MotionFX — ambient, PHYSICS-driven dice VFX (not outcome-driven, so it lives
   outside the Director). Attaches to a running dice Box + the BRFX particle layer:

     • trails — while a die is moving fast it drops fading puffs along its path,
                so it streaks like a comet. Puffs are interpolated between frames
                so the trail stays smooth even at high speed.
     • sparks — each die body's cannon `collide` event fires a small spark burst
                at hard impacts (wall / another die / floor), scaled by impact and
                rate-limited per die so a tumble doesn't flood the screen.

   Usage:  MotionFX.attach(Box)   // once, after Box.initialize() + BRFX.attach()
           MotionFX.cfg.*         // live-tunable knobs (speed/impact thresholds…)
   ========================================================================== */
import BRFX from './fx-layer.js';

const cfg = {
  trails: true,
  sparks: true,
  trailColor: 0x9ad8ff,   // soft cyan-white streak
  sparkColor: 0xffce6a,   // warm gold sparks
  minSpeed: 500,          // body speed (world u/s) below which no trail is drawn
  trailSpacing: 70,       // world units between puffs (fills gaps at high speed)
  maxPuffsPerFrame: 6,    // cap puffs per die per frame (runaway guard)
  minImpact: 600,         // impact velocity along the contact normal needed to spark
  sparkCooldownMs: 55,    // per-die minimum gap between spark bursts
};

let Box = null, off = null, attached = false;

// Bind a one-time collide listener to a die's physics body (idempotent per body).
function bindSpark(die) {
  const b = die.body;
  if (!b || b._sparkBound) return;
  b._sparkBound = true;
  b.addEventListener('collide', (e) => {
    if (!cfg.sparks) return;
    let impact = 0;
    try { impact = Math.abs(e.contact.getImpactVelocityAlongNormal()); } catch {}
    if (impact < cfg.minImpact) return;
    const now = performance.now();
    if (b._lastSpark && now - b._lastSpark < cfg.sparkCooldownMs) return;
    b._lastSpark = now;
    BRFX.play('impactSparks', { worldPos: die.position, color: cfg.sparkColor,
      intensity: Math.min(1.8, impact / cfg.minImpact) });
  });
}

export const MotionFX = {
  cfg,

  attach(box) {
    if (attached && Box === box) return MotionFX;
    Box = box; attached = true;
    off = box.onBeforeRender(() => {
      for (const die of (box.diceList || [])) {
        const b = die.body;
        if (!b) continue;
        bindSpark(die);
        if (!cfg.trails) continue;

        const v = b.velocity, speed = Math.hypot(v.x, v.y, v.z), p = die.position;
        if (speed < cfg.minSpeed) { die._trailLast = null; continue; }

        const last = die._trailLast;
        if (!last) {
          BRFX.play('trailPuff', { worldPos: p, color: cfg.trailColor });
        } else {
          // lay puffs from the last position to the current one, ~trailSpacing apart
          const dx = p.x - last.x, dy = p.y - last.y, dz = p.z - last.z;
          const dist = Math.hypot(dx, dy, dz);
          const n = Math.max(1, Math.min(cfg.maxPuffsPerFrame, Math.round(dist / cfg.trailSpacing)));
          for (let i = 1; i <= n; i++) { const t = i / n;
            BRFX.play('trailPuff', { worldPos: { x: last.x + dx * t, y: last.y + dy * t, z: last.z + dz * t }, color: cfg.trailColor }); }
        }
        die._trailLast = { x: p.x, y: p.y, z: p.z };
      }
    });
    return MotionFX;
  },

  detach() { try { off && off(); } catch {} off = null; attached = false; Box = null; },
};

if (typeof window !== 'undefined') window.MotionFX = MotionFX;
export default MotionFX;
