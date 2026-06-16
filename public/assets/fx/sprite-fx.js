/* ============================================================================
   SpriteFX — frame-animated 2D spell sprites, played as billboard quads inside
   the dice scene (the dice camera looks straight down −Z, so a flat XY quad
   already faces it — no billboard math). Everything is driven by a generated
   manifest (sprites-manifest.json, see scripts/build-sprites-manifest.py), so
   adding art is "drop files → rebuild manifest", never edit this file.

   Two playback modes per effect:
     • sheet  — one grid image, UV-stepped through cols×rows. The RPG_effects
                pack: 64px cells, 9 colour ROWS × N frame COLS (→ multicolor;
                pick a row). offset.x walks the frames, offset.y picks the colour.
     • frames — an ordered list of frame image URLs, swapped on material.map per
                tick. The Frostwindz packs, explosions, and the portal.

   Usage:  await SpriteFX.load();  SpriteFX.attach(Box);
           SpriteFX.play('expl_3', { worldPos, size })
           SpriteFX.play('rpg_16_766', { worldPos, row: 4 })
           SpriteFX.packs()  → manifest packs (drives the playground gallery)
   ========================================================================== */
import * as THREE from 'three';

const MANIFEST = '/assets/fx/sprites-manifest.json';
// default world size (height of the quad) per pack — the stage is ~2600 tall, dice ~120
const SIZE_BY_PACK = { rpg: 360, explosions: 720, fire: 560, blood: 560, portal: 460 };

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
        let frame = Math.floor(s.acc / s.frameDur);
        if (frame >= s.count) {
          if (s.loop) { s.acc %= s.count * s.frameDur; frame = Math.floor(s.acc / s.frameDur); }
          else { dispose(s); live.splice(i, 1); s.onDone && s.onDone(); continue; }
        }
        if (s.mode === 'sheet') {
          s.mat.map.offset.x = frame / s.cols;
        } else if (frame !== s.frame) {              // frames mode: swap texture
          s.mat.map = s.textures[frame]; s.mat.needsUpdate = true;
        }
        s.frame = frame;
      }
    });
    return SpriteFX;
  },

  // Warm an effect's textures so the first play has no hitch (call on hover).
  async preload(id) {
    const e = byId[id]; if (!e) return;
    if (e.mode === 'sheet') return loadTex(e.url);
    return Promise.all(e.frames.map(loadTex));
  },

  // Play one effect at a world (or screen) position.
  // opts: { worldPos|origin, row, size, fps, dur, blend:'add'|'normal', color, opacity, loop, z, onDone }
  async play(id, opts = {}) {
    if (!attached) { console.warn('[spriteFX] not attached'); return; }
    const e = byId[id]; if (!e) { console.warn('[spriteFX] unknown effect', id); return; }

    const blend = (opts.blend === 'add') ? THREE.AdditiveBlending : THREE.NormalBlending;
    const size = opts.size ?? SIZE_BY_PACK[e.pack] ?? 420;
    const fps = opts.fps ?? e.fps ?? 16;
    const z = opts.z ?? 140;                       // float toward the camera over the dice
    const wp = opts.worldPos
      ? new THREE.Vector3(opts.worldPos.x, opts.worldPos.y, opts.worldPos.z + z)
      : screenToWorld(opts.origin || { x: 0.5, y: 0.45 }, z);

    let mat, count, mode = e.mode, cols = 1, textures = null;
    if (mode === 'sheet') {
      const tex = (await loadTex(e.url)).clone(); tex.needsUpdate = true;
      cols = e.cols; const rows = e.rows;
      const row = (((opts.row ?? 0) % rows) + rows) % rows;
      tex.repeat.set(1 / cols, 1 / rows);
      tex.offset.set(0, 1 - (row + 1) / rows);     // UV origin bottom-left → flip rows
      count = cols;
      mat = baseMat(tex, blend, opts);
    } else {
      textures = await Promise.all(e.frames.map(loadTex));
      count = textures.length;
      mat = baseMat(textures[0], blend, opts);
    }

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
    mesh.position.copy(wp); mesh.renderOrder = 10;
    scene.add(mesh);

    live.push({ mesh, mat, mode, cols, count, textures, frame: -1, acc: 0,
      loop: !!opts.loop, frameDur: (opts.dur ? opts.dur / count : 1 / fps), onDone: opts.onDone });
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
    if (s.mode === 'sheet') s.mat.map?.dispose(); } catch {}
}

if (typeof window !== 'undefined') window.SpriteFX = SpriteFX;
export default SpriteFX;
