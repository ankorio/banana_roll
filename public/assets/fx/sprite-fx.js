/* ============================================================================
   SpriteFX — frame-animated 2D spell sprites, played as billboard quads inside
   the dice scene (the dice camera looks straight down −Z, so a flat XY quad
   already faces it — no billboard math). Everything is driven by a generated
   manifest (sprites-manifest.json, see scripts/build-sprites-manifest.py), so
   adding art is "drop files → rebuild manifest", never edit this file.

   Playback modes per effect:
     • sheet    — one grid image; each ROW is a colour variant, frames walk the
                  COLUMNS of the chosen row. The RPG_effects pack (pick a colour).
     • gridanim — one grid image animated across the WHOLE grid (frame → col,row),
                  e.g. the TimelineFX .tpa sheets (HaloAnim1 8×4, SmokeString 10×7).
     • frames   — an ordered list of frame image URLs, swapped per tick. The
                  Frostwindz packs, explosions, the portal.
     • still    — a single static image (held, then faded). Auras/halos/flares.

   Any one-shot can carry a `hold` (extra seconds on the last frame) and a `fade`
   (opacity ramp at the tail) so stills bloom in and out instead of flashing once.

   Usage:  await SpriteFX.load();  SpriteFX.attach(Box);
           SpriteFX.play('expl_3', { worldPos, size })
           SpriteFX.play('rpg_16_766', { worldPos, row: 4 })
           SpriteFX.packs()  → manifest packs (drives the playground gallery)
   ========================================================================== */
import * as THREE from 'three';

const MANIFEST = '/assets/fx/sprites-manifest.json';
// default world size (height of the quad) per pack — the stage is ~2600 tall, dice ~120
const SIZE_BY_PACK = { rpg: 360, explosions: 720, fire: 560, blood: 560, portal: 460, auras: 620 };

let Box = null, scene = null, camera = null, off = null, attached = false;
let last = 0;
const live = [];               // active sprites being ticked
let manifest = null;           // { packs: [...] }
const byId = {};               // effect id → { ...effect, pack }

const loader = new THREE.TextureLoader();
const texCache = {};           // url → Promise<Texture>  (frames + base sheets)
function loadTex(url) {
  if (texCache[url]) return texCache[url];
  return (texCache[url] = new Promise((res, rej) => loader.load(encodeURI(url), (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    res(t);
  }, undefined, rej)));
}

// Cast the camera ray through a normalized screen point onto z = targetZ.
function screenToWorld(origin, targetZ) {
  const ndc = new THREE.Vector3(origin.x * 2 - 1, -(origin.y * 2 - 1), 0.5).unproject(camera);
  const dir = ndc.sub(camera.position).normalize();
  const t = (targetZ - camera.position.z) / dir.z;
  return new THREE.Vector3().copy(camera.position).addScaledVector(dir, t);
}

export const SpriteFX = {
  async load() {
    if (manifest) return manifest;
    manifest = await fetch(MANIFEST).then((r) => r.json());
    for (const pack of manifest.packs)
      for (const e of pack.effects) byId[e.id] = Object.assign({ pack: pack.id }, e);
    return manifest;
  },
  packs: () => (manifest ? manifest.packs : []),
  get: (id) => byId[id],

  attach(box) {
    if (attached && Box === box) return SpriteFX;
    Box = box; scene = box.scene; camera = box.camera; attached = true;
    last = performance.now();
    off = box.onBeforeRender(() => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      for (let i = live.length - 1; i >= 0; i--) {
        const s = live[i];
        s.acc += dt;
        const animDur = s.count * s.frameDur;
        let frame = Math.floor(s.acc / s.frameDur);
        if (frame >= s.count) {
          if (s.loop) { s.acc %= animDur; frame = Math.floor(s.acc / s.frameDur); }
          else frame = s.count - 1;              // clamp; hold on the last frame
        }
        // advance the visible frame per mode
        if (s.mode === 'sheet') {
          s.map.offset.x = frame / s.cols;
        } else if (s.mode === 'gridanim') {
          const col = frame % s.cols, row = (frame / s.cols) | 0;
          s.map.offset.x = col / s.cols; s.map.offset.y = 1 - (row + 1) / s.rows;
        } else if (s.mode === 'frames' && frame !== s.frame) {
          s.mat.map = s.textures[frame]; s.mat.needsUpdate = true;
        }
        s.frame = frame;
        // procedural motion — gives single-frame stills (halos/flares) life
        if (s.spin) s.mesh.rotation.z += s.spin * dt;
        if (s.pulse) { const k = 1 + s.pulse * Math.sin(s.acc * 4); s.mesh.scale.set(k, k, 1); }
        // tail fade + end-of-life (one-shots only)
        if (!s.loop) {
          const life = animDur + s.hold;
          if (s.fade > 0) { const rem = life - s.acc; if (rem < s.fade) s.mat.opacity = s.baseOpacity * Math.max(0, rem / s.fade); }
          if (s.acc >= life) { dispose(s); live.splice(i, 1); s.onDone && s.onDone(); }
        }
      }
    });
    return SpriteFX;
  },

  // Warm an effect's textures so the first play has no hitch (call on hover).
  async preload(id) {
    const e = byId[id]; if (!e) return;
    if (e.mode === 'frames') return Promise.all(e.frames.map(loadTex));
    return loadTex(e.url);
  },

  // Play one effect at a world (or screen) position.
  // opts: { worldPos|origin, row, size, fps, dur, blend:'add'|'normal', color, opacity, loop, hold, fade, z, onDone }
  async play(id, opts = {}) {
    if (!attached) { console.warn('[spriteFX] not attached'); return; }
    const e = byId[id]; if (!e) { console.warn('[spriteFX] unknown effect', id); return; }

    const blend = (opts.blend ?? e.blend) === 'add' ? THREE.AdditiveBlending : THREE.NormalBlending;
    const size = opts.size ?? SIZE_BY_PACK[e.pack] ?? 420;
    const fps = opts.fps ?? e.fps ?? 16;
    const z = opts.z ?? 140;                       // float toward the camera over the dice
    const wp = opts.worldPos
      ? new THREE.Vector3(opts.worldPos.x, opts.worldPos.y, opts.worldPos.z + z)
      : screenToWorld(opts.origin || { x: 0.5, y: 0.45 }, z);

    const mode = e.mode;
    let mat, count, cols = e.cols || 1, rows = e.rows || 1, textures = null, map = null;
    if (mode === 'frames') {
      textures = await Promise.all(e.frames.map(loadTex));
      count = textures.length;
      mat = baseMat(textures[0], blend, opts);
    } else {
      map = (await loadTex(e.url)).clone(); map.needsUpdate = true;   // own UV offset per instance
      if (mode === 'sheet') {                       // RPG: pick a colour row, walk its columns
        const row = (((opts.row ?? 0) % rows) + rows) % rows;
        map.repeat.set(1 / cols, 1 / rows); map.offset.set(0, 1 - (row + 1) / rows);
        count = cols;
      } else if (mode === 'gridanim') {             // .tpa: animate across the whole grid
        map.repeat.set(1 / cols, 1 / rows); map.offset.set(0, 1 - 1 / rows);
        count = e.count || cols * rows;
      } else {                                       // still: one static frame
        count = 1;
      }
      mat = baseMat(map, blend, opts);
    }

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
    mesh.position.copy(wp); mesh.renderOrder = 10;
    scene.add(mesh);

    // stills bloom & fade rather than flash; anims get a short tail fade
    const hold = opts.hold ?? (mode === 'still' ? 1.4 : 0);
    const fade = opts.fade ?? (mode === 'still' ? 0.5 : (e.pack === 'auras' ? 0.3 : 0));
    // a single-frame still has no frames to play — animate it procedurally instead
    const spin = opts.spin ?? (mode === 'still' ? 0.7 : 0);
    const pulse = opts.pulse ?? (mode === 'still' ? 0.08 : 0);
    live.push({ mesh, mat, map, mode, cols, rows, count, textures, frame: -1, acc: 0,
      loop: !!opts.loop, frameDur: (opts.dur ? opts.dur / count : 1 / fps),
      hold, fade, spin, pulse, baseOpacity: opts.opacity ?? 1, onDone: opts.onDone });
    return mesh;
  },

  detach() {
    try { off && off(); } catch {}
    for (const s of live) dispose(s);
    live.length = 0; off = null; attached = false; Box = null;
  },
};

function baseMat(map, blending, opts) {
  const mat = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false,
    blending, opacity: opts.opacity ?? 1, side: THREE.DoubleSide, toneMapped: false });
  if (opts.color != null) mat.color = new THREE.Color(opts.color);
  return mat;
}
function dispose(s) {
  try { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mat.dispose();
    if (s.map) s.map.dispose(); } catch {}   // cloned per-instance texture (frames reuse the cache)
}

if (typeof window !== 'undefined') window.SpriteFX = SpriteFX;
export default SpriteFX;
