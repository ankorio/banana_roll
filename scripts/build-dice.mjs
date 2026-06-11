#!/usr/bin/env node
// Build the dice engine the overlay actually loads.
//
// Takes the vendored upstream @3d-dice/dice-box-threejs bundle and injects any
// drop-in custom textures (public/assets/custom-textures/) into its internal
// texturelist, then emits:
//   - public/assets/dice-box/dice-box.bundle.js   (engine the overlay/customize page import)
//   - public/assets/dice-manifest.json            (texture/colorset/material options for pickers)
//
// Custom textures are declared in public/assets/custom-textures/dice-textures.json:
//   { "<id>": { "file": "x.webp", "name"?, "material"?, "bump"?, "composite"? }, ... }
// Keys starting with "_" are ignored (README/examples). Run via `npm run dice:build`.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ASSETS = join(ROOT, 'public', 'assets');
const UPSTREAM = join(ASSETS, 'dice-box', 'upstream', 'dice-box-threejs.es.js');
const OUT_BUNDLE = join(ASSETS, 'dice-box', 'dice-box.bundle.js');
const OUT_MANIFEST = join(ASSETS, 'dice-manifest.json');
const CUSTOM_DIR = join(ASSETS, 'custom-textures');
const CUSTOM_JSON = join(CUSTOM_DIR, 'dice-textures.json');
const TEXTURES_DIR = join(ASSETS, 'textures');

const MATERIALS = ['none', 'metal', 'wood', 'glass', 'plastic'];
const ID_RE = /^[a-z0-9_-]{1,40}$/;

function die(msg) { console.error(`[dice:build] ERROR: ${msg}`); process.exit(1); }

// ── load upstream const modules (source of truth for built-ins) ──────────────
const { TEXTURELIST } = await import(pathToFileURL(join(ASSETS, 'dice-box', 'upstream', 'const', 'texturelist.mjs')));
const { COLORSETS } = await import(pathToFileURL(join(ASSETS, 'dice-box', 'upstream', 'const', 'colorsets.mjs')));

// ── read custom-texture manifest ─────────────────────────────────────────────
let customDecl = {};
if (existsSync(CUSTOM_JSON)) {
  try { customDecl = JSON.parse(readFileSync(CUSTOM_JSON, 'utf8')); }
  catch (e) { die(`custom-textures/dice-textures.json is not valid JSON: ${e.message}`); }
}

const custom = {}; // id -> texturelist entry
for (const [id, decl] of Object.entries(customDecl)) {
  if (id.startsWith('_')) continue; // README / examples
  if (!ID_RE.test(id)) die(`custom texture id "${id}" must match ${ID_RE} (lowercase letters/digits/-/_)`);
  if (TEXTURELIST[id]) die(`custom texture id "${id}" collides with a built-in texture`);
  const file = decl && decl.file;
  if (!file || !/^[\w.-]+\.webp$/i.test(file)) die(`custom texture "${id}" needs a "file" ending in .webp`);
  if (!existsSync(join(CUSTOM_DIR, file))) die(`custom texture "${id}" file not found: custom-textures/${file}`);
  const material = decl.material || 'none';
  if (!MATERIALS.includes(material)) die(`custom texture "${id}" material "${material}" not in ${MATERIALS.join('|')}`);
  let bump = '';
  if (decl.bump) {
    if (!existsSync(join(CUSTOM_DIR, decl.bump))) die(`custom texture "${id}" bump not found: custom-textures/${decl.bump}`);
    bump = `custom-textures/${decl.bump}`;
  }
  custom[id] = {
    name: decl.name || id,
    composite: decl.composite || 'multiply',
    source: `custom-textures/${file}`,
    source_bump: bump,
    material,
  };
}

// ── patch the upstream bundle: inject custom entries into the texturelist ─────
let src = readFileSync(UPSTREAM, 'utf8');

if (Object.keys(custom).length) {
  // Anchor on the texturelist object's first key. In the bundle it appears as
  //   const <mangled> = {\n  cloudy: {\n    name: "Clouds (Transparent)", ...
  // We match `cloudy: {` that is the texturelist one (its name follows shortly).
  const anchor = /cloudy:\s*\{/g;
  let injectAt = -1;
  for (let m; (m = anchor.exec(src)); ) {
    if (src.slice(m.index, m.index + 160).includes('Clouds (Transparent)')) { injectAt = m.index; break; }
  }
  if (injectAt < 0) {
    die('could not locate the texturelist anchor (`cloudy:` → "Clouds (Transparent)") in the upstream bundle. ' +
        'The vendored @3d-dice/dice-box-threejs version may have changed — update this script.');
  }
  const entries = Object.entries(custom).map(([id, t]) =>
    `"${id}": { name: ${JSON.stringify(t.name)}, composite: ${JSON.stringify(t.composite)}, ` +
    `source: ${JSON.stringify(t.source)}, source_bump: ${JSON.stringify(t.source_bump)}, ` +
    `material: ${JSON.stringify(t.material)} }`
  ).join(', ');
  src = src.slice(0, injectAt) + entries + ', ' + src.slice(injectAt);
}

writeFileSync(OUT_BUNDLE, src);

// ── emit the manifest (only textures whose source file actually exists) ──────
function textureFileExists(t) {
  if (!t.source) return true; // 'none' / preset — no file needed
  const rel = t.source.replace(/^textures\//, '');
  if (t.source.startsWith('custom-textures/')) return true; // already validated above
  return existsSync(join(TEXTURES_DIR, rel));
}

const textures = [];
// 'none' first (built-in, no texture), then the rest of the usable built-ins, then customs.
for (const [id, t] of Object.entries(TEXTURELIST)) {
  if (id === '') continue;            // "~ Preset ~" placeholder — not user-facing
  if (id !== 'none' && !textureFileExists(t)) continue; // skip built-ins whose art we didn't vendor
  textures.push({ id, name: t.name || id, material: t.material || '', custom: false });
}
for (const [id, t] of Object.entries(custom)) {
  textures.push({ id, name: t.name, material: t.material || '', custom: true });
}

const colorsets = Object.entries(COLORSETS)
  .map(([id, c]) => ({ id, name: (c && c.name) || id }))
  .sort((a, b) => a.name.localeCompare(b.name));

const manifest = {
  generatedAt: new Date().toISOString(),
  materials: MATERIALS,
  textures,
  colorsets,
};
writeFileSync(OUT_MANIFEST, JSON.stringify(manifest, null, 2) + '\n');

console.log(`[dice:build] bundle  → ${OUT_BUNDLE.replace(ROOT + '/', '')}`);
console.log(`[dice:build] manifest→ ${OUT_MANIFEST.replace(ROOT + '/', '')} ` +
  `(${textures.length} textures incl. ${Object.keys(custom).length} custom, ${colorsets.length} colorsets)`);
