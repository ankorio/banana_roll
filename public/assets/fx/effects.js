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
  return {
    dot: tex((x, s) => radial(x, s, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,.9)'], [1, 'rgba(255,255,255,0)']])),
    spark: tex((x, s) => radial(x, s, [[0, 'rgba(255,255,255,1)'], [0.18, 'rgba(255,255,255,1)'], [0.5, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,0)']])),
    smoke: tex((x, s) => radial(x, s, [[0, 'rgba(255,255,255,.55)'], [0.5, 'rgba(255,255,255,.28)'], [1, 'rgba(255,255,255,0)']])),
    leaf: tex((x, s) => { x.translate(s/2, s/2); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(0, -s*0.42); x.quadraticCurveTo(s*0.36, -s*0.1, 0, s*0.42); x.quadraticCurveTo(-s*0.36, -s*0.1, 0, -s*0.42); x.fill(); x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, -s*0.36); x.lineTo(0, s*0.36); x.stroke(); }),
    petal: tex((x, s) => { x.translate(s/2, s/2); x.fillStyle = '#fff'; x.beginPath(); x.ellipse(0, 0, s*0.22, s*0.42, 0, 0, 7); x.fill(); }),
    feather: tex((x, s) => { x.translate(s/2, s/2); x.rotate(0.2); x.fillStyle = '#fff'; x.beginPath(); x.ellipse(0, 0, s*0.13, s*0.44, 0, 0, 7); x.fill(); x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 1.5; for (let i = -7; i <= 7; i++) { const yy = i * s * 0.028; x.beginPath(); x.moveTo(0, yy); x.lineTo(s*0.12, yy - s*0.05); x.moveTo(0, yy); x.lineTo(-s*0.12, yy - s*0.05); x.stroke(); } }),
    snow: tex((x, s) => { x.translate(s/2, s/2); x.strokeStyle = '#fff'; x.lineWidth = 3; x.lineCap = 'round'; for (let i = 0; i < 6; i++) { x.rotate(Math.PI/3); x.beginPath(); x.moveTo(0, 0); x.lineTo(0, s*0.4); x.moveTo(0, s*0.26); x.lineTo(s*0.1, s*0.36); x.moveTo(0, s*0.26); x.lineTo(-s*0.1, s*0.36); x.stroke(); } }),
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
