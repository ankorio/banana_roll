#!/usr/bin/env python3
"""Scan public/assets/fx texture packs → public/assets/fx/sprites-manifest.json.

Only the TimelineFX "Auras & Halos" pack ships in the gallery right now (harvested
from source/AurasAndHalos.eff into textures/auras_halos). Playback modes emitted:
  • gridanim — one grid image animated across the whole grid (frame → col,row).
               The .tpa sheets (HaloAnim1 8×4, SmokeString 10×7, …).
  • still    — a single static glow image (held + faded; animated procedurally).

To add more packs, build another `pack` dict and append it to `packs`.
Run:  python3 scripts/build-sprites-manifest.py
"""
import json, os, re, struct

ROOT = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'fx')
ROOT = os.path.normpath(ROOT)
WEB = '/assets/fx'          # web base for the same files

def web(*parts):
    return WEB + '/' + '/'.join(parts)

def natkey(s):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r'(\d+)', s)]

packs = []

# ── Auras & Halos: harvested from the TimelineFX AurasAndHalos.eff library ───
# .tpa sheets are grid animations (frame walks the whole grid); the rest are stills.
# Everything is a white/colour glow → additive blend, tintable.
AURA_DIR = ('textures', 'auras_halos')
AURA_ANIM = {  # base → (cols, rows, count, fps)
    'HaloAnim1': (8, 4, 32, 24), 'smokeball': (8, 4, 32, 24),
    'SmokeString': (10, 7, 64, 30), 'ElectricGroup1': (2, 2, 4, 12),
}
AURA_NAMES = {'HaloAnim1': 'Halo Ring (anim)', 'smokeball': 'Smoke Ball (anim)',
              'SmokeString': 'Smoke String (anim)', 'ElectricGroup1': 'Electric (anim)',
              'Halo1': 'Halo · specks', 'Halo2': 'Halo · cloud', 'Halo3': 'Halo · glow disc',
              'SmokeyHalo1': 'Smokey Halo', 'SmokeyHalo2': 'Smokey Halo 2',
              'Flare1': 'Flare', 'Flare2': 'Flare 2', 'Flare10': 'Flare 10',
              'plume': 'Plume', 'Smoke1': 'Smoke'}
auras = {'id': 'auras', 'name': 'Auras & Halos', 'note': 'TimelineFX glows — additive, tintable', 'effects': []}
adir = os.path.join(ROOT, *AURA_DIR)
for f in sorted(os.listdir(adir), key=natkey):
    if not f.endswith('.png'):
        continue
    base = f[:-4]
    name = AURA_NAMES.get(base, base)
    if base in AURA_ANIM:
        cols, rows, count, fps = AURA_ANIM[base]
        auras['effects'].append({'id': f'aura_{base.lower()}', 'name': name, 'mode': 'gridanim',
            'url': web(*AURA_DIR, f), 'cols': cols, 'rows': rows, 'count': count,
            'fps': fps, 'blend': 'add'})
    else:
        auras['effects'].append({'id': f'aura_{base.lower()}', 'name': name, 'mode': 'still',
            'url': web(*AURA_DIR, f), 'blend': 'add'})
packs.append(auras)

# ── cgHeven VFX: 8×8 sprite-sheet atlases (2K WebP, optimized from 4K masters) ─
# Full-colour RGBA energy FX (portals, shield). Normal alpha blend (not pure glow),
# animated across the whole 8×8 grid (64 frames). Sheets live in textures/VFX_cgheven.
CGH_DIR = ('textures', 'VFX_cgheven')
CGH = [  # (file base, effect id, display name, fps, blend)
    ('Magic_Portal_02_Front_2K_8x8_purple', 'cgh_portal_front', 'Magic Portal · front', 30, 'normal'),
    ('Magical_Sheild_Block_01_Fpv_2K_8x8', 'cgh_shield_block', 'Magic Shield · block', 30, 'normal'),
    ('Portal_04_Side_2K_8x8', 'cgh_portal_side', 'Portal · side', 30, 'normal'),
    ('Violet_Portal_Tendrils_2K_8x8', 'cgh_tendrils', 'Violet Tendrils', 24, 'add'),
]
cgheven = {'id': 'cgheven', 'name': 'cgHeven VFX', 'note': '8×8 atlases — 2K, alpha-blended', 'effects': []}
for base, eid, name, fps, blend in CGH:
    if not os.path.exists(os.path.join(ROOT, *CGH_DIR, base + '.webp')):
        continue
    cgheven['effects'].append({'id': eid, 'name': name, 'mode': 'gridanim',
        'url': web(*CGH_DIR, base + '.webp'), 'cols': 8, 'rows': 8, 'count': 64,
        'fps': fps, 'blend': blend})
if cgheven['effects']:
    packs.append(cgheven)

out = {'packs': packs}
dest = os.path.join(ROOT, 'sprites-manifest.json')
with open(dest, 'w') as f:
    json.dump(out, f, indent=0)

total = sum(len(p['effects']) for p in packs)
print(f'wrote {dest}')
for p in packs:
    print(f"  {p['id']:12} {len(p['effects']):4} effects")
print(f'  {"TOTAL":12} {total:4}')
