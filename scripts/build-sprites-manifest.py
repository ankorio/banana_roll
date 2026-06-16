#!/usr/bin/env python3
"""Scan public/assets/fx sprite packs → public/assets/fx/sprites-manifest.json.
Two playback modes are emitted:
  • sheet  — one grid image, UV-stepped: {url, cell, rows, cols}. RPG_effects
             (64px cells, 9 colour rows × N frame cols → multicolor).
  • frames — an ordered list of frame image URLs, swapped per tick. The Frostwindz
             VFX packs, the explosions, and the portal.
Previews: a `preview` gif URL when the pack ships one (cheap <img>); the gallery
falls back to a canvas frame-cycler when it's absent (explosions).
Run:  python3 scripts/build-sprites-manifest.py
"""
import json, os, re, struct

ROOT = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'fx')
ROOT = os.path.normpath(ROOT)
WEB = '/assets/fx'          # web base for the same files

def png_size(path):
    with open(path, 'rb') as f:
        d = f.read(33)
    return struct.unpack('>II', d[16:24])      # (w, h)

def web(*parts):
    return WEB + '/' + '/'.join(parts)

def natkey(s):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r'(\d+)', s)]

def list_pngs(d):
    return sorted([f for f in os.listdir(d) if f.lower().endswith('.png')], key=natkey)

packs = []

# ── RPG_effects: 252 grid sheets (64px cells, 9 colour rows × N frames) ──────
RPG_COLORS = ['orange', 'magenta', 'cyan', 'green', 'gold', 'white', 'mauve', 'red', 'purple']
rpg = {'id': 'rpg', 'name': 'RPG Spell Effects',
       'note': '9 colour rows × N frames per sheet — pick a colour', 'colors': RPG_COLORS, 'effects': []}
rdir = os.path.join(ROOT, 'RPG_effects')
for part in sorted(os.listdir(rdir), key=natkey):
    pdir = os.path.join(rdir, part)
    if not os.path.isdir(pdir):
        continue
    pn = part.replace('Part ', '')
    for png in list_pngs(pdir):
        w, h = png_size(os.path.join(pdir, png))
        cols, rows = max(1, round(w / 64)), max(1, round(h / 64))
        rpg['effects'].append({
            'id': f'rpg_{pn}_{png[:-4]}', 'name': f'{pn}·{png[:-4]}', 'mode': 'sheet',
            'url': web('RPG_effects', part, png), 'cell': 64, 'rows': rows, 'cols': cols,
            'fps': 16, 'multicolor': rows > 1,
        })
packs.append(rpg)

def frames_effect(eid, name, dirpaths, fps, preview=None):
    """A frames-mode effect from one or more folders (concatenated, natural-sorted)."""
    frames = []
    for dp in dirpaths:
        rel = os.path.relpath(dp, ROOT).split(os.sep)
        for f in list_pngs(dp):
            frames.append(web(*rel, f))
    e = {'id': eid, 'name': name, 'mode': 'frames', 'fps': fps, 'frames': frames}
    if preview:
        e['preview'] = preview
    return e

# ── VFX_explosions: 10 effects, per-frame folders, no gif (canvas preview) ───
expl = {'id': 'explosions', 'name': 'Explosions', 'note': 'per-frame sequences', 'effects': []}
edir = os.path.join(ROOT, 'VFX_explosions', 'PNG')
for name in sorted(os.listdir(edir), key=natkey):
    d = os.path.join(edir, name)
    if os.path.isdir(d):
        expl['effects'].append(frames_effect(f'expl_{name.split("_")[-1]}', name.replace('_', ' '), [d], 18))
packs.append(expl)

# ── VFX_Fire_Mage: 3 skills, per-frame folders + gif previews ────────────────
fire = {'id': 'fire', 'name': 'Fire Mage', 'note': 'Frostwindz · single colour', 'effects': []}
fbase = os.path.join(ROOT, 'VFX_Fire_Mage')
fire_gifs = {'VFX1': web('VFX_Fire_Mage', 'VFX1', 'GIF.gif'),
             'VFX2': web('VFX_Fire_Mage', 'VFX2', 'GIF.gif'),
             'VFX3': web('VFX_Fire_Mage', 'VFX3', 'VFX3.gif')}
for v in ['VFX1', 'VFX2', 'VFX3']:
    fire['effects'].append(frames_effect(
        f'fire_{v.lower()}', f'Fire {v[-1]}', [os.path.join(fbase, v, 'frames')], 14, fire_gifs[v]))
packs.append(fire)

# ── VFX_Blood_Mag: VFX1 (start+loop+end phases), VFX2, VFX3 ───────────────────
blood = {'id': 'blood', 'name': 'Blood Mage', 'note': 'Frostwindz · single colour', 'effects': []}
bbase = os.path.join(ROOT, 'VFX_Blood_Mag')
blood['effects'].append(frames_effect('blood_vfx1', 'Blood 1',
    [os.path.join(bbase, 'VFX1', 'part1(start)', 'frames'),
     os.path.join(bbase, 'VFX1', 'part2(loop)', 'frames'),
     os.path.join(bbase, 'VFX1', 'part3(end)', 'frames')], 14,
    web('VFX_Blood_Mag', 'VFX1', 'part1(start)', 'GIF.gif')))
for v in ['VFX2', 'VFX3']:
    blood['effects'].append(frames_effect(
        f'blood_{v.lower()}', f'Blood {v[-1]}', [os.path.join(bbase, v, 'frames')], 14,
        web('VFX_Blood_Mag', v, 'GIF.gif')))
packs.append(blood)

# ── VFX_animated_portal: 1 effect ─────────────────────────────────────────────
portal = {'id': 'portal', 'name': 'Portal', 'effects': [frames_effect(
    'portal_1', 'Portal', [os.path.join(ROOT, 'VFX_animated_portal', 'Frames')], 14,
    web('VFX_animated_portal', 'GIF.gif'))]}
packs.append(portal)

out = {'packs': packs}
dest = os.path.join(ROOT, 'sprites-manifest.json')
with open(dest, 'w') as f:
    json.dump(out, f, indent=0)

total = sum(len(p['effects']) for p in packs)
print(f'wrote {dest}')
for p in packs:
    print(f"  {p['id']:12} {len(p['effects']):4} effects")
print(f'  {"TOTAL":12} {total:4}')
