/* ============================================================================
   Banana Roll — FX effects registry
   Fantasy VFX built on a small sprite particle engine (see fx-layer.js) over
   three.js, plus the official LightningStrike addon. Each effect is a `spawn(ctx)`
   that emits particles; ctx provides the engine helpers:
     ctx.addParticle(cfg) · ctx.addLightning(cfg) · ctx.tex (sprite textures)
     ctx.W / ctx.H (canvas px) · ctx.origin {x,y} world-center px · ctx.color (hex|null)
     ctx.intensity (0.3..2) · THREE
   Textures are drawn procedurally (no image assets); white shapes tinted per particle.
   ========================================================================== */

// ── procedural sprite textures (white on transparent → tinted by material.color) ──
export function makeTextures(THREE) {
  const tex = (draw, size = 96) => {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d'); draw(x, size);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t;
  };
  const radial = (x, s, stops) => { const g = x.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2); stops.forEach(([o, c]) => g.addColorStop(o, c)); x.fillStyle = g; x.beginPath(); x.arc(s/2, s/2, s/2, 0, 7); x.fill(); };

  // ── Kenney image textures (particle pack + light masks), preloaded once ──────
  // Transparent PNGs: white/grayscale sprites are tinted by material.color; fire/
  // flame ship pre-coloured (tint white to keep their hue). Light masks are big
  // soft gradients used as additive "light cookie" overlays (glow / god rays / halos).
  // Paths have spaces+parens → encodeURI. TextureLoader populates async; three
  // updates the material when each image lands, so preloading at attach is enough.
  const loader = new THREE.TextureLoader();
  const PBASE = '/assets/fx/textures/kenney_particle-pack/PNG (Transparent)/';
  const LBASE = '/assets/fx/textures/kenney_light-masks-1.0/Transparent/';
  const load = (base, file) => { const t = loader.load(encodeURI(base + file)); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const k = {
    magic1: load(PBASE, 'magic_01.png'), magic4: load(PBASE, 'magic_04.png'), magic5: load(PBASE, 'magic_05.png'),
    star4:  load(PBASE, 'star_04.png'),  star7:  load(PBASE, 'star_07.png'),
    twirl1: load(PBASE, 'twirl_01.png'), twirl2: load(PBASE, 'twirl_02.png'),
    flame3: load(PBASE, 'flame_03.png'), flame5: load(PBASE, 'flame_05.png'), fire2: load(PBASE, 'fire_02.png'),
    smoke5: load(PBASE, 'smoke_05.png'), smoke7: load(PBASE, 'smoke_07.png'),
    muzzle2: load(PBASE, 'muzzle_02.png'), muzzle4: load(PBASE, 'muzzle_04.png'),
    spark4: load(PBASE, 'spark_04.png'), flare: load(PBASE, 'flare_01.png'), light2: load(PBASE, 'light_02.png'),
    // light masks
    lmStreaks: load(LBASE, 'streaks_composed_d.png'), lmCone: load(LBASE, 'cone_composed_d.png'),
    lmCircle: load(LBASE, 'circle_c.png'), lmRings: load(LBASE, 'circle_rings_b.png'),
  };

  return {
    k,
    dot: tex((x, s) => radial(x, s, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,.9)'], [1, 'rgba(255,255,255,0)']])),
    spark: tex((x, s) => radial(x, s, [[0, 'rgba(255,255,255,1)'], [0.18, 'rgba(255,255,255,1)'], [0.5, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,0)']])),
    smoke: tex((x, s) => radial(x, s, [[0, 'rgba(255,255,255,.55)'], [0.5, 'rgba(255,255,255,.28)'], [1, 'rgba(255,255,255,0)']])),
    leaf: tex((x, s) => { x.translate(s/2, s/2); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(0, -s*0.42); x.quadraticCurveTo(s*0.36, -s*0.1, 0, s*0.42); x.quadraticCurveTo(-s*0.36, -s*0.1, 0, -s*0.42); x.fill(); x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, -s*0.36); x.lineTo(0, s*0.36); x.stroke(); }),
    petal: tex((x, s) => { x.translate(s/2, s/2); x.fillStyle = '#fff'; x.beginPath(); x.ellipse(0, 0, s*0.22, s*0.42, 0, 0, 7); x.fill(); }),
    feather: tex((x, s) => { x.translate(s/2, s/2); x.rotate(0.2); x.fillStyle = '#fff'; x.beginPath(); x.ellipse(0, 0, s*0.13, s*0.44, 0, 0, 7); x.fill(); x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 1.5; for (let i = -7; i <= 7; i++) { const yy = i * s * 0.028; x.beginPath(); x.moveTo(0, yy); x.lineTo(s*0.12, yy - s*0.05); x.moveTo(0, yy); x.lineTo(-s*0.12, yy - s*0.05); x.stroke(); } }),
    snow: tex((x, s) => { x.translate(s/2, s/2); x.strokeStyle = '#fff'; x.lineWidth = 3; x.lineCap = 'round'; for (let i = 0; i < 6; i++) { x.rotate(Math.PI/3); x.beginPath(); x.moveTo(0, 0); x.lineTo(0, s*0.4); x.moveTo(0, s*0.26); x.lineTo(s*0.1, s*0.36); x.moveTo(0, s*0.26); x.lineTo(-s*0.1, s*0.36); x.stroke(); } }),
    // a glowing ring band (expanding halo)
    ring: tex((x, s) => { const g = x.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.6, 'rgba(255,255,255,0)'); g.addColorStop(.78, 'rgba(255,255,255,.95)'); g.addColorStop(.87, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(s/2, s/2, s/2, 0, 7); x.fill(); }, 160),
    // sunburst — tapered spokes radiating from the center (god rays / halo rays)
    rays: tex((x, s) => { x.translate(s/2, s/2); const N = 18; for (let i = 0; i < N; i++) { x.rotate(2 * Math.PI / N); const g = x.createLinearGradient(0, 0, 0, -s/2); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.18, 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(-s*0.016, 0); x.lineTo(s*0.016, 0); x.lineTo(0, -s/2); x.closePath(); x.fill(); } }, 256),
  };
}

const rnd = (a, b) => a + Math.random() * (b - a);
const ADD = (THREE) => THREE.AdditiveBlending;

// ── effect registry ─────────────────────────────────────────────────────────
export const EFFECTS = {
  explosion: { label: 'Explosion', spawn(c) {
    const n = Math.round(70 * c.intensity), col = c.color ?? 0xffb347;
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, sp = rnd(120, 520) * c.intensity;
      c.addParticle({ tex: c.tex.spark, color: col, blending: ADD(c.THREE), x: c.origin.x, y: c.origin.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, grav: 280, drag: 2.2, life: rnd(.5, 1.1), sizeA: rnd(10, 26), sizeB: 2, alpha: 1 }); }
  } },

  fireworks: { label: 'Fireworks', spawn(c) {
    const shells = Math.round(3 * c.intensity);
    for (let s = 0; s < shells; s++) setTimeout(() => {
      const ox = rnd(-c.W * 0.3, c.W * 0.3), oy = rnd(c.H * 0.05, c.H * 0.32);
      const hue = c.color ?? [0xff5a5a, 0x5ad1ff, 0xffd24a, 0xc08bff, 0x6bd28a][s % 5];
      for (let i = 0; i < 90; i++) { const a = Math.random() * 6.283, sp = rnd(80, 360);
        c.addParticle({ tex: c.tex.spark, color: hue, blending: ADD(c.THREE), x: ox, y: oy,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, grav: 180, drag: 1.4, life: rnd(.9, 1.6), sizeA: rnd(6, 14), sizeB: 1, alpha: 1 }); }
    }, s * 380);
  } },

  sparkles: { label: 'Sparkles', spawn(c) {
    const n = Math.round(40 * c.intensity), col = c.color ?? 0xfff3c4;
    for (let i = 0; i < n; i++) c.addParticle({ tex: c.tex.snow, color: col, blending: ADD(c.THREE),
      x: c.origin.x + rnd(-90, 90), y: c.origin.y + rnd(-90, 90), vx: rnd(-30, 30), vy: rnd(20, 80),
      grav: -20, drag: .6, ang: rnd(-3, 3), life: rnd(.8, 1.6), sizeA: rnd(8, 20), sizeB: 1, fadeIn: .25, alpha: 1 });
  } },

  embers: { label: 'Embers', spawn(c) {
    const n = Math.round(50 * c.intensity), col = c.color ?? 0xff7a2c;
    for (let i = 0; i < n; i++) c.addParticle({ tex: c.tex.dot, color: col, blending: ADD(c.THREE),
      x: rnd(-c.W * 0.4, c.W * 0.4), y: -c.H / 2 - rnd(0, 60), vx: rnd(-25, 25), vy: rnd(90, 220),
      grav: -40, drag: .5, life: rnd(1.2, 2.4), sizeA: rnd(4, 10), sizeB: 1, swayF: rnd(2, 5), swayA: 40, alpha: 1 });
  } },

  fire: { label: 'Fire', spawn(c) {
    const n = Math.round(80 * c.intensity);
    for (let i = 0; i < n; i++) { const col = [0xff3b0a, 0xff7a00, 0xffc24a][i % 3];
      c.addParticle({ tex: c.tex.smoke, color: c.color ?? col, blending: ADD(c.THREE),
        x: c.origin.x + rnd(-40, 40), y: c.origin.y - 40 + rnd(-20, 20), vx: rnd(-25, 25), vy: rnd(140, 300),
        grav: -120, drag: 1.2, life: rnd(.5, 1.1), sizeA: rnd(20, 46), sizeB: 6, fadeIn: .12, alpha: .9, delay: rnd(0, .8) }); }
  } },

  smoke: { label: 'Smoke', spawn(c) {
    const n = Math.round(34 * c.intensity);
    for (let i = 0; i < n; i++) c.addParticle({ tex: c.tex.smoke, color: c.color ?? 0x9a9aa6,
      x: c.origin.x + rnd(-30, 30), y: c.origin.y + rnd(-20, 20), vx: rnd(-30, 30), vy: rnd(50, 120),
      grav: -10, drag: .8, ang: rnd(-1, 1), life: rnd(1.4, 2.6), sizeA: rnd(40, 70), sizeB: 150, fadeIn: .25, alpha: .5, delay: rnd(0, 1) });
  } },

  // falling/ambient — particles staggered across the top, some already mid-fall
  leaves: { label: 'Leaves', spawn(c) { fall(c, c.tex.leaf, { colors: [0xd98a2b, 0xb5632a, 0x8a9a3a, 0xc99a2a], n: 46, vy: -rnd, fall: [70, 150], size: [16, 30], sway: [1, 3], swayA: 120, spin: [-3, 3] }); } },
  feathers: { label: 'Feathers', spawn(c) { fall(c, c.tex.feather, { colors: [0xf2efe6, 0xe6dcc6, 0xcfd6e6], n: 34, fall: [35, 80], size: [18, 34], sway: [.6, 1.6], swayA: 170, spin: [-1.4, 1.4] }); } },
  petals: { label: 'Petals', spawn(c) { fall(c, c.tex.petal, { colors: [0xff9ec4, 0xffc0d8, 0xffd9e6, 0xffffff], n: 50, fall: [60, 130], size: [10, 20], sway: [1.4, 3.2], swayA: 110, spin: [-3, 3] }); } },
  snow: { label: 'Snow', spawn(c) { fall(c, c.tex.snow, { colors: [0xffffff, 0xe8f4ff], n: 70, fall: [40, 95], size: [6, 16], sway: [.8, 2.2], swayA: 70, spin: [-1, 1] }); } },

  fog: { label: 'Fog', spawn(c) {
    const n = Math.round(16 * c.intensity);
    for (let i = 0; i < n; i++) { const dir = Math.random() < .5 ? 1 : -1;
      c.addParticle({ tex: c.tex.smoke, color: c.color ?? 0xb9c2d0, x: dir * c.W * 0.6, y: rnd(-c.H * 0.35, c.H * 0.35),
        vx: -dir * rnd(20, 55), vy: rnd(-6, 6), drag: 0, life: rnd(5, 8), sizeA: rnd(140, 260), sizeB: rnd(200, 340), fadeIn: .3, alpha: .28 }); }
  } },

  lightning: { label: 'Lightning', spawn(c) {
    c.addLightning({ x: c.origin.x, color: c.color ?? 0xbfe0ff, life: .45 });
    setTimeout(() => c.addLightning({ x: c.origin.x + rnd(-40, 40), color: c.color ?? 0xeaf4ff, life: .3 }), 120);
  } },

  // ── light / celestial effects (additive glow + sunburst rays) ──────────────
  halo: { label: 'Celestial Halo', spawn(c) {
    const col = c.color ?? 0xfff0c0, big = Math.min(c.W, c.H);
    for (let k = 0; k < 2; k++) c.addParticle({ tex: c.tex.dot, color: col, blending: ADD(c.THREE), x: c.origin.x, y: c.origin.y, vx: 0, vy: 0, life: 1.5, sizeA: 30, sizeB: big * 0.7, fadeIn: .2, alpha: .55, delay: k * 0.28 });
    for (let k = 0; k < 3; k++) c.addParticle({ tex: c.tex.ring, color: col, blending: ADD(c.THREE), x: c.origin.x, y: c.origin.y, life: 1.3, sizeA: 50, sizeB: big * 0.85, fadeIn: .08, alpha: .7, delay: k * 0.3 });
    c.addParticle({ tex: c.tex.rays, color: col, blending: ADD(c.THREE), x: c.origin.x, y: c.origin.y, life: 2, sizeA: big * 0.3, sizeB: big * 0.72, fadeIn: .25, alpha: .5, ang: 0.5 });
    const n = Math.round(26 * c.intensity);
    for (let i = 0; i < n; i++) c.addParticle({ tex: c.tex.snow, color: col, blending: ADD(c.THREE), x: c.origin.x + rnd(-110, 110), y: c.origin.y + rnd(-50, 70), vx: rnd(-20, 20), vy: rnd(40, 130), grav: -30, ang: rnd(-3, 3), life: rnd(1, 1.9), sizeA: rnd(6, 16), sizeB: 1, fadeIn: .2, alpha: 1 });
  } },

  godrays: { label: 'God Rays', spawn(c) {
    const col = c.color ?? 0xffe6a0, sz = Math.min(c.W, c.H) * 0.95;
    c.addParticle({ tex: c.tex.rays, color: col, blending: ADD(c.THREE), x: c.origin.x, y: c.origin.y, life: 2.6, sizeA: sz * 0.55, sizeB: sz, fadeIn: .35, alpha: .5, ang: 0.22 });
    c.addParticle({ tex: c.tex.rays, color: col, blending: ADD(c.THREE), x: c.origin.x, y: c.origin.y, life: 2.6, sizeA: sz * 0.7, sizeB: sz * 1.15, fadeIn: .4, alpha: .32, ang: -0.16 });
    c.addParticle({ tex: c.tex.dot, color: col, blending: ADD(c.THREE), x: c.origin.x, y: c.origin.y, life: 2.6, sizeA: 40, sizeB: sz * 0.5, fadeIn: .3, alpha: .5 });
  } },

  // ── motion fx (spawned by motion-fx.js, not clicked) ───────────────────────
  // one soft additive puff = a single frame of a die's motion trail. MotionFX
  // drops these along the die's path each frame while it's moving → a comet streak.
  trailPuff: { label: 'Trail Puff', spawn(c) {
    c.addParticle({ tex: c.tex.dot, color: c.color ?? 0x9ad8ff, blending: ADD(c.THREE),
      x: c.origin.x, y: c.origin.y, vx: 0, vy: 0, life: 0.34, sizeA: 52, sizeB: 6, fadeIn: .03, alpha: .5 });
  } },

  // a quick spark burst at a collision contact (die hits a wall / another die / floor)
  impactSparks: { label: 'Impact Sparks', spawn(c) {
    const n = Math.round(9 * c.intensity), col = c.color ?? 0xffce6a;
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, sp = rnd(120, 360) * c.intensity;
      c.addParticle({ tex: c.tex.spark, color: col, blending: ADD(c.THREE), x: c.origin.x, y: c.origin.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, grav: 220, drag: 2.4, life: rnd(.18, .5), sizeA: rnd(4, 11), sizeB: 1, alpha: 1 }); }
  } },

  // ── crit shine: a restrained warm glow + one ring pop + a few twinkles ─────
  // Pairs with the critGlow recipe (which pulses the die's own emissive). Kept
  // deliberately subtle — "visible, not crazy".
  critShine: { label: 'Crit Shine', spawn(c) {
    const col = c.color ?? 0xffe8a0;
    // soft halo that swells and fades around the die
    c.addParticle({ tex: c.tex.dot, color: col, blending: ADD(c.THREE), x: c.origin.x, y: c.origin.y,
      vx: 0, vy: 0, life: 0.95, sizeA: 40, sizeB: 230, fadeIn: .1, alpha: .5 });
    // one crisp expanding ring — the "shine" pop
    c.addParticle({ tex: c.tex.ring, color: col, blending: ADD(c.THREE), x: c.origin.x, y: c.origin.y,
      life: .55, sizeA: 24, sizeB: 190, fadeIn: .04, alpha: .8 });
    // a handful of twinkles drifting outward
    const n = Math.round(16 * c.intensity);
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, sp = rnd(50, 170);
      c.addParticle({ tex: c.tex.snow, color: col, blending: ADD(c.THREE),
        x: c.origin.x + rnd(-36, 36), y: c.origin.y + rnd(-36, 36),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, grav: -20, drag: 1.3, ang: rnd(-4, 4),
        life: rnd(.6, 1.2), sizeA: rnd(6, 14), sizeB: 1, fadeIn: .1, alpha: 1 }); }
  } },

  // ── void / black-hole swirl (a dark magic vortex that "sucks inward") ──────
  // Lies flat on the table (we view top-down), drawn under the doomed die. The
  // swirl arms + rim rings shrink toward the center (sizeA→sizeB small) and the
  // sparks start on a ring moving inward + tangentially → reads as suction.
  voidSwirl: { label: 'Void Swirl', spawn(c) {
    const col = c.color ?? 0x7b3ff2, big = Math.min(c.W, c.H);
    // murky dark core FIRST (drawn under the glow) — the "hole" itself. A wide,
    // opaque near-black violet puff so the center reads as depth, not light.
    c.addParticle({ tex: c.tex.smoke, color: 0x0c0118, x: c.origin.x, y: c.origin.y, vx: 0, vy: 0,
      life: 1.2, sizeA: big * 0.34, sizeB: big * 0.10, fadeIn: .08, alpha: .96 });
    // spinning swirl arms, counter-rotating, contracting toward the center (the "drain")
    for (let k = 0; k < 2; k++) c.addParticle({ tex: c.tex.rays, color: col, blending: ADD(c.THREE),
      x: c.origin.x, y: c.origin.y, vx: 0, vy: 0, life: 1.25 * c.intensity, sizeA: big * 0.36, sizeB: big * 0.04,
      fadeIn: .12, alpha: .7, ang: k ? 9 : -12, delay: k * 0.08 });
    // a bright energy rim that collapses inward (the event horizon)
    for (let k = 0; k < 2; k++) c.addParticle({ tex: c.tex.ring, color: col, blending: ADD(c.THREE),
      x: c.origin.x, y: c.origin.y, life: 1.0, sizeA: big * 0.30, sizeB: big * 0.02, fadeIn: .05, alpha: .85, delay: k * 0.16 });
    // inward-spiralling sparks: spawn on a ring, velocity = inward (suck) + tangential (swirl)
    const n = Math.round(40 * c.intensity);
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, R = big * 0.30 * rnd(.6, 1);
      const inward = rnd(160, 360), tang = rnd(220, 420);
      c.addParticle({ tex: c.tex.spark, color: col, blending: ADD(c.THREE),
        x: c.origin.x + Math.cos(a) * R, y: c.origin.y + Math.sin(a) * R,
        vx: -Math.cos(a) * inward - Math.sin(a) * tang, vy: -Math.sin(a) * inward + Math.cos(a) * tang,
        drag: 1.5, life: rnd(.5, 1.0), sizeA: rnd(5, 12), sizeB: 1, alpha: 1 }); }
  } },

  // ════════════════════════════════════════════════════════════════════════════
  //  KENNEY-TEXTURE EFFECTS — 5 examples using the particle pack + light masks.
  //  All additive (they emit light); smoke uses normal blending.
  // ════════════════════════════════════════════════════════════════════════════

  // 1) Arcane Burst — a spinning twirl + flare pop + magic-star sprites flying out.
  //    Pattern: light-cookie swirl as the base, tinted magic sprites as the burst.
  arcaneBurst: { label: 'Arcane Burst ✦', spawn(c) {
    const col = c.color ?? 0xb98bff;
    c.addParticle({ tex: c.tex.k.twirl1, color: col, blending: ADD(c.THREE), x: c.origin.x, y: c.origin.y,
      vx: 0, vy: 0, ang: 5, life: .95, sizeA: 50, sizeB: 240, fadeIn: .06, alpha: .85 });
    c.addParticle({ tex: c.tex.k.flare, color: 0xffffff, blending: ADD(c.THREE), x: c.origin.x, y: c.origin.y,
      vx: 0, vy: 0, life: .35, sizeA: 30, sizeB: 170, fadeIn: .02, alpha: .9 });
    const n = Math.round(22 * c.intensity);
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, sp = rnd(120, 360) * c.intensity;
      const t = [c.tex.k.magic1, c.tex.k.magic4, c.tex.k.magic5][i % 3];
      c.addParticle({ tex: t, color: col, blending: ADD(c.THREE), x: c.origin.x, y: c.origin.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, grav: -10, drag: 1.6, ang: rnd(-5, 5),
        life: rnd(.7, 1.4), sizeA: rnd(18, 36), sizeB: 4, fadeIn: .08, alpha: 1 }); }
  } },

  // 2) Flame Plume — layered flame sprites rising with curling smoke above.
  //    Pattern: pre-coloured fire textures (tint white), additive; smoke in normal blend.
  flamePlume: { label: 'Flame Plume', spawn(c) {
    const n = Math.round(26 * c.intensity);
    for (let i = 0; i < n; i++) { const t = [c.tex.k.flame3, c.tex.k.flame5, c.tex.k.fire2][i % 3];
      c.addParticle({ tex: t, color: c.color ?? 0xffffff, blending: ADD(c.THREE),
        x: c.origin.x + rnd(-26, 26), y: c.origin.y - 30, vx: rnd(-20, 20), vy: rnd(150, 300),
        grav: -90, drag: 1.0, life: rnd(.5, 1.0), sizeA: rnd(42, 84), sizeB: 16, fadeIn: .06, alpha: .95, delay: rnd(0, .5) }); }
    const m = Math.round(10 * c.intensity);
    for (let i = 0; i < m; i++) { const t = [c.tex.k.smoke5, c.tex.k.smoke7][i % 2];
      c.addParticle({ tex: t, color: 0x6a6a72, x: c.origin.x + rnd(-20, 20), y: c.origin.y + 40,
        vx: rnd(-20, 20), vy: rnd(60, 130), grav: -10, drag: .7, ang: rnd(-1, 1),
        life: rnd(1.2, 2.2), sizeA: rnd(50, 90), sizeB: 170, fadeIn: .2, alpha: .4, delay: rnd(.1, .8) }); }
  } },

  // 3) Muzzle Flash — a sharp two-layer radial flash + hard sparks shooting out.
  //    Pattern: short-lived muzzle cookies for the pop, spark sprites for shrapnel.
  muzzleFlash: { label: 'Muzzle Flash', spawn(c) {
    const col = c.color ?? 0xffd98a;
    c.addParticle({ tex: c.tex.k.muzzle4, color: col, blending: ADD(c.THREE), x: c.origin.x, y: c.origin.y,
      vx: 0, vy: 0, ang: rnd(0, 6.28), life: .22, sizeA: 60, sizeB: 150, fadeIn: .01, alpha: 1 });
    c.addParticle({ tex: c.tex.k.muzzle2, color: col, blending: ADD(c.THREE), x: c.origin.x, y: c.origin.y,
      vx: 0, vy: 0, ang: rnd(0, 6.28), life: .18, sizeA: 40, sizeB: 110, fadeIn: .01, alpha: 1 });
    const n = Math.round(16 * c.intensity);
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, sp = rnd(220, 520) * c.intensity;
      c.addParticle({ tex: c.tex.k.spark4, color: col, blending: ADD(c.THREE), x: c.origin.x, y: c.origin.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, grav: 160, drag: 2.4, ang: a, life: rnd(.2, .5), sizeA: rnd(10, 22), sizeB: 1, alpha: 1 }); }
  } },

  // 4) Light Shafts — two counter-drifting "streaks" light-masks + a soft core glow,
  //    with motes floating up. Pattern: light cookies as god-ray overlays.
  lightShafts: { label: 'Light Shafts ✦', spawn(c) {
    const col = c.color ?? 0xfff0c0, big = Math.min(c.W, c.H);
    c.addParticle({ tex: c.tex.k.lmStreaks, color: col, blending: ADD(c.THREE), x: c.origin.x, y: c.origin.y,
      vx: 0, vy: 0, ang: .35, life: 2.2, sizeA: big * 0.4, sizeB: big * 0.95, fadeIn: .4, alpha: .5 });
    c.addParticle({ tex: c.tex.k.lmStreaks, color: col, blending: ADD(c.THREE), x: c.origin.x, y: c.origin.y,
      vx: 0, vy: 0, ang: -.22, life: 2.4, sizeA: big * 0.55, sizeB: big * 1.1, fadeIn: .5, alpha: .32 });
    c.addParticle({ tex: c.tex.k.lmCircle, color: col, blending: ADD(c.THREE), x: c.origin.x, y: c.origin.y,
      vx: 0, vy: 0, life: 2.0, sizeA: 40, sizeB: big * 0.5, fadeIn: .3, alpha: .5 });
    const n = Math.round(18 * c.intensity);
    for (let i = 0; i < n; i++) c.addParticle({ tex: c.tex.k.light2, color: col, blending: ADD(c.THREE),
      x: c.origin.x + rnd(-110, 110), y: c.origin.y + rnd(-60, 80), vx: rnd(-12, 12), vy: rnd(20, 70),
      grav: -10, life: rnd(1.2, 2.2), sizeA: rnd(6, 16), sizeB: 2, fadeIn: .3, alpha: .8 });
  } },

  // 5) Radiant Halo — a soft circle glow + concentric ring-masks blooming out + a
  //    flare pop and rising star-sprites. Pattern: ring/circle light cookies as a halo.
  radiantHalo: { label: 'Radiant Halo ✦', spawn(c) {
    const col = c.color ?? 0xffe6a0, big = Math.min(c.W, c.H);
    c.addParticle({ tex: c.tex.k.lmCircle, color: col, blending: ADD(c.THREE), x: c.origin.x, y: c.origin.y,
      vx: 0, vy: 0, life: 1.6, sizeA: big * 0.2, sizeB: big * 0.7, fadeIn: .2, alpha: .6 });
    for (let kk = 0; kk < 3; kk++) c.addParticle({ tex: c.tex.k.lmRings, color: col, blending: ADD(c.THREE),
      x: c.origin.x, y: c.origin.y, vx: 0, vy: 0, ang: .3 * (kk ? 1 : -1), life: 1.4, sizeA: big * 0.15, sizeB: big * 0.8, fadeIn: .08, alpha: .55, delay: kk * 0.22 });
    c.addParticle({ tex: c.tex.k.flare, color: 0xffffff, blending: ADD(c.THREE), x: c.origin.x, y: c.origin.y,
      vx: 0, vy: 0, life: .5, sizeA: 20, sizeB: big * 0.45, fadeIn: .05, alpha: .8 });
    const n = Math.round(16 * c.intensity);
    for (let i = 0; i < n; i++) c.addParticle({ tex: c.tex.k.star4, color: col, blending: ADD(c.THREE),
      x: c.origin.x + rnd(-90, 90), y: c.origin.y + rnd(-40, 60), vx: rnd(-20, 20), vy: rnd(40, 110),
      grav: -30, ang: rnd(-3, 3), life: rnd(1, 1.9), sizeA: rnd(8, 18), sizeB: 2, fadeIn: .2, alpha: 1 });
  } },
};

// shared "falling from the top" emitter
function fall(c, tex, p) {
  const n = Math.round(p.n * c.intensity);
  for (let i = 0; i < n; i++) {
    const col = c.color ?? p.colors[i % p.colors.length];
    c.addParticle({ tex, color: col,
      x: rnd(-c.W / 2, c.W / 2), y: rnd(-c.H / 2, c.H / 2 + 40), // staggered: some already falling
      vx: rnd(-20, 20), vy: -rnd(p.fall[0], p.fall[1]), grav: 0, drag: 0,
      ang: rnd(p.spin[0], p.spin[1]), life: rnd(3.5, 6), sizeA: rnd(p.size[0], p.size[1]),
      fadeIn: .15, alpha: .95, swayF: rnd(p.sway[0], p.sway[1]), swayA: p.swayA });
  }
}
