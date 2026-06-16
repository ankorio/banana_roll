#!/usr/bin/env python3
"""Bake the 4K multilayer EXR lightning-bolt render into a 2K animated sprite sheet.

Source: textures/lightning_boltarc_01_4k_v2_EXR/ — 250 frames, 4096x4096, Blender
multilayer EXR (DWAA). The bolt lives in the `Composite.Combined` HDR RGBA layer.
The render's baked alpha only covers the hot core (~0.7% of px) and drops the glow,
so we IGNORE it and derive alpha from luminance (the full glow, ~19% of px).

Output: textures/lightning_bolt/lightning_bolt_sheet.png — 2048x2048, 8x8 grid of
64 evenly-sampled frames, each 256px, cropped to the union bbox of bolt content so
the strike stays put and fills the tile. RGB = tonemapped bolt colour (straight,
not premultiplied — the fx layer's additive-safe blend multiplies by alpha). Alpha =
soft luminance curve so the glow falls off instead of a hard box.

  python3 scripts/exr-bolt-to-spritesheet.py
"""
import os, numpy as np
from concurrent.futures import ProcessPoolExecutor
import OpenEXR
from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'fx'))
SRC  = os.path.join(ROOT, 'textures', 'lightning_boltarc_01_4k_v2_EXR')
OUTD = os.path.join(ROOT, 'textures', 'lightning_bolt')
NAME = 'lightning_boltarc_01_4k_v2_{:03d}.exr'

COLS, ROWS = 8, 8
NFRAMES    = COLS * ROWS          # 64
TILE       = 256                  # px per frame -> 2048 sheet
SRC_FRAMES = 250
LUM_W      = np.array([0.299, 0.587, 0.114], np.float32)
THR        = 0.02                 # content threshold for bbox / noise floor
DOWN       = 4                    # 4096 -> 1024 working res (mean pool)
WORK       = 4096 // DOWN

# alpha + tone tuning
ALPHA_K    = 2.6                  # 1-exp(-lum*K): higher = glow reads sooner
ALPHA_GAMMA= 1.15                 # >1 thins the faint glow edge
EXPOSURE   = 1.6                  # RGB tonemap exposure before reinhard


def srgb(x):
    a = 0.055
    return np.where(x <= 0.0031308, x * 12.92, (1 + a) * np.power(np.clip(x, 0, None), 1/2.4) - a)


def read_frame(fnum):
    """Read one EXR -> (fnum, working-res RGBA float32, full-res bbox)."""
    f = OpenEXR.File(os.path.join(SRC, NAME.format(fnum)))
    rgba = f.channels()['Composite.Combined'].pixels.astype(np.float32)  # (4096,4096,4)
    rgb  = rgba[..., :3]
    lum  = rgb @ LUM_W
    mask = lum > THR
    if mask.any():
        ys, xs = np.where(mask)
        bbox = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    else:
        bbox = None
    # mean-pool RGB to working res; keep only RGB (alpha derived later)
    small = rgb.reshape(WORK, DOWN, WORK, DOWN, 3).mean(axis=(1, 3)).astype(np.float32)
    return fnum, small, bbox


def main():
    os.makedirs(OUTD, exist_ok=True)
    idx = np.unique(np.linspace(0, SRC_FRAMES - 1, NFRAMES).round().astype(int))
    fnums = [int(i) + 1 for i in idx]
    print(f'sampling {len(fnums)} frames of {SRC_FRAMES}: {fnums[:5]}..{fnums[-3:]}')

    tiles, bboxes = {}, []
    with ProcessPoolExecutor(max_workers=8) as ex:
        for fnum, small, bbox in ex.map(read_frame, fnums):
            tiles[fnum] = small
            if bbox: bboxes.append(bbox)
            print('.', end='', flush=True)
    print()

    # union bbox (full res) -> square, padded, clamped
    x0 = min(b[0] for b in bboxes); y0 = min(b[1] for b in bboxes)
    x1 = max(b[2] for b in bboxes); y1 = max(b[3] for b in bboxes)
    pad = int(0.04 * max(x1 - x0, y1 - y0))
    x0, y0, x1, y1 = x0 - pad, y0 - pad, x1 + pad, y1 + pad
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    half = max(x1 - x0, y1 - y0) / 2
    x0, y0, x1, y1 = cx - half, cy - half, cx + half, cy + half
    x0 = max(0, int(x0)); y0 = max(0, int(y0)); x1 = min(4096, int(x1)); y1 = min(4096, int(y1))
    print(f'union square crop (full res): x[{x0}-{x1}] y[{y0}-{y1}] = {x1-x0}px')

    # crop region in working-res coords
    wx0, wy0, wx1, wy1 = x0 // DOWN, y0 // DOWN, x1 // DOWN, y1 // DOWN

    sheet = Image.new('RGBA', (COLS * TILE, ROWS * TILE), (0, 0, 0, 0))
    for i, fnum in enumerate(fnums):
        rgb = tiles[fnum][wy0:wy1, wx0:wx1, :]           # cropped working-res HDR rgb
        lum = rgb @ LUM_W
        # tonemap rgb: exposure -> reinhard -> sRGB
        e = rgb * EXPOSURE
        disp = srgb(e / (1.0 + e))
        rgb8 = np.clip(disp * 255.0 + 0.5, 0, 255).astype(np.uint8)
        # alpha from luminance glow, noise-floored
        a = 1.0 - np.exp(-lum * ALPHA_K)
        a = np.power(np.clip(a, 0, 1), ALPHA_GAMMA)
        a[lum <= THR] = 0.0
        a8 = np.clip(a * 255.0 + 0.5, 0, 255).astype(np.uint8)
        rgba8 = np.dstack([rgb8, a8])
        tile = Image.fromarray(rgba8, 'RGBA').resize((TILE, TILE), Image.BOX)
        c, r = i % COLS, i // COLS
        sheet.paste(tile, (c * TILE, r * TILE))

    out = os.path.join(OUTD, 'lightning_bolt_sheet.png')
    sheet.save(out)
    print(f'wrote {out}  ({COLS}x{ROWS}={len(fnums)} frames, {COLS*TILE}x{ROWS*TILE})')


if __name__ == '__main__':
    main()
