#!/usr/bin/env node
// Re-vendor the dice engine from our own fork's PUBLISHED build (not a local checkout),
// so what ships is exactly what's tagged on GitHub. Pulls three files from a pinned tag
// via jsdelivr /gh into public/assets/dice-box/upstream/:
//   dist/dice-box-threejs.es.js  → upstream/dice-box-threejs.es.js   (engine; three externalized)
//   src/const/texturelist.js     → upstream/const/texturelist.mjs    (manifest source of truth)
//   src/const/colorsets.js       → upstream/const/colorsets.mjs
// Then run `npm run dice:build` (chained by the dice:vendor npm script) to inject custom
// textures + regenerate the manifest.
//
// Pin/override the tag:  DICE_TAG=v0.1.1 npm run dice:vendor
// Keep DICE_TAG in sync with the jsdelivr /gh fallback URLs in overlay/customize/playground.

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO = process.env.DICE_FORK || 'ankorio/dice-box-threejs';
const TAG = process.env.DICE_TAG || 'v0.1.0';
const BASE = `https://cdn.jsdelivr.net/gh/${REPO}@${TAG}`;

const __dirname = dirname(fileURLToPath(import.meta.url));
const UP = join(__dirname, '..', 'public', 'assets', 'dice-box', 'upstream');

const FILES = [
  [`${BASE}/dist/dice-box-threejs.es.js`, join(UP, 'dice-box-threejs.es.js')],
  [`${BASE}/src/const/texturelist.js`, join(UP, 'const', 'texturelist.mjs')],
  [`${BASE}/src/const/colorsets.js`, join(UP, 'const', 'colorsets.mjs')],
];

mkdirSync(join(UP, 'const'), { recursive: true });

console.log(`[dice:vendor] source ${REPO}@${TAG}`);
for (const [url, dest] of FILES) {
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`[dice:vendor] ERROR ${res.status} fetching ${url}`);
    console.error('[dice:vendor] is the tag pushed and the dist committed at that tag? (jsdelivr serves files at a git ref)');
    process.exit(1);
  }
  const body = await res.text();
  if (body.length < 100) { console.error(`[dice:vendor] suspiciously small response from ${url}`); process.exit(1); }
  writeFileSync(dest, body);
  console.log(`[dice:vendor] ${url.replace(BASE + '/', '')}  →  ${dest.split('/assets/')[1]}  (${body.length} bytes)`);
}
console.log('[dice:vendor] done — now run `npm run dice:build` to rebuild the bundle + manifest.');
