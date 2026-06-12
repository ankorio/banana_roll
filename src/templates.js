'use strict';
// Plaque templates (server-owned, seeded) + plaque-config validation.
//
// A *template* is a named base plaque: text-free frame art + a default zone layout
// + a declaration of which color keys are editable. The customize editor loads these
// via GET /room/:id/templates; a saved *plaque config* (per player / room default) is
// validated here before it's stored. Zone schema mirrors public/assets/customizer/data.js
// (the editor's copy) — keep the two in sync.
//
// Backgrounds are stored INLINE as size-capped PNG dataURLs (see validateBackground):
// the editor's crop step re-renders to a 398x440 <canvas> and emits toDataURL('image/png'),
// so the bytes are a fresh PNG with no original EXIF/metadata. No file upload, no disk.

const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;
const ALIGNS = new Set(['left', 'center', 'right']);
const KINDS = new Set(['text', 'pill', 'image']);
const COLOR_KEYS = new Set(['accent', 'badge', 'name']);
const ZONE_IDS = new Set(['portrait', 'name', 'badge', 'total', 'rname', 'breakdown', 'tag']);

// Caps
const ZONES_MAX = 12;
const PLAQUE_BG_MAX = 400 * 1024; // ~400 KB of base64 background (cropped 398x440 PNG is well under)

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Default zone layout (matches the editor's zonesArcane()).
function zonesArcane() {
  return [
    { id: 'portrait',  kind: 'image', cx: 50, cy: 21.6, w: 21.5, coef: 0,     fs: 1, align: 'center', colorKey: null,     visible: true, locked: false },
    { id: 'name',      kind: 'text',  cx: 50, cy: 39.8, w: 70,   coef: 0.034, fs: 1, align: 'center', colorKey: 'name',   visible: true, locked: false },
    { id: 'badge',     kind: 'pill',  cx: 50, cy: 51.5, w: 0,    coef: 0.024, fs: 1, align: 'center', colorKey: 'badge',  visible: true, locked: false },
    { id: 'total',     kind: 'text',  cx: 50, cy: 62.8, w: 50,   coef: 0.205, fs: 1, align: 'center', colorKey: 'accent', visible: true, locked: false },
    { id: 'rname',     kind: 'text',  cx: 50, cy: 75.0, w: 82,   coef: 0.041, fs: 1, align: 'center', colorKey: 'accent', visible: true, locked: false },
    { id: 'breakdown', kind: 'text',  cx: 50, cy: 83.2, w: 60,   coef: 0.031, fs: 1, align: 'center', colorKey: 'name',   visible: true, locked: false },
    { id: 'tag',       kind: 'pill',  cx: 50, cy: 91.2, w: 0,    coef: 0.028, fs: 1, align: 'center', colorKey: 'accent', visible: true, locked: false },
  ];
}

// Seeded templates. Image templates share the Arcane zone layout; their art is a full
// background under /assets/plaque_templates/, so all color keys are editable by default.
// To add a template: drop a PNG in that folder and add one `[id, name, file]` line here.
const DEFAULT_COLORS = { accent: '#ffd24a', badge: '#2e7d32', name: '#e6c87f' };
const ALL_EDITABLE = { accent: true, badge: true, name: true };
const ART_TEMPLATES = [
  ['arcane',        'Arcane Plaque', 'arcane-plaque.png', { accent: true, badge: true, name: false }],
  ['generic',       'Generic',       'generic.png'],
  ['artificer',     'Artificer',     'artificer.png'],
  ['barbarian',     'Barbarian',     'barbarian.png'],
  ['bard',          'Bard',          'bard.png'],
  ['cleric',        'Cleric',        'cleric.png'],
  ['druid',         'Druid',         'druid.png'],
  ['fighter',       'Fighter',       'fighter.png'],
  ['monk',          'Monk',          'monk.png'],
  ['paladin',       'Paladin',       'paladin.png'],
  ['ranger',        'Ranger',        'ranger.png'],
  ['rogue',         'Rogue',         'rogue.png'],
  ['sorcerer',      'Sorcerer',      'sorcerer.png'],
  ['warlock',       'Warlock',       'warlock.png'],
  ['wizard',        'Wizard',        'wizard.png'],
  ['reymys',        'Reymys',        'reymys.png'],
  ['tiron',         'Tiron',         'tiron.png'],
  ['rafi',          'Rafi',          'rafi.png'],
  ['huesped',       'Huesped',       'huesped.png'],
  ['jenny',         'Jenny',         'jenny.png'],
  ['luna',          'Luna',          'luna.png'],
];
const TEMPLATES = ART_TEMPLATES.map(([id, name, file, editable]) => ({
  id, name,
  art: '/assets/plaque_templates/' + file,
  colors: { ...DEFAULT_COLORS },
  editable: editable || { ...ALL_EDITABLE },
  zones: zonesArcane(),
}));
const TEMPLATE_IDS = new Set(TEMPLATES.map((t) => t.id));
function getTemplate(id) { return TEMPLATES.find((t) => t.id === id) || null; }

// --- validation -------------------------------------------------------------
// Validate one zone defensively; returns a sanitized copy or null to drop it.
function validateZone(z) {
  if (!z || typeof z !== 'object') return null;
  if (!ZONE_IDS.has(z.id)) return null;
  const kind = KINDS.has(z.kind) ? z.kind : 'text';
  const colorKey = COLOR_KEYS.has(z.colorKey) ? z.colorKey : null;
  const cx = clamp(Number(z.cx), 0, 100);
  const cy = clamp(Number(z.cy), 0, 100);
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
  const w = Number.isFinite(z.w) ? clamp(Number(z.w), 0, 100) : 0;
  const fs = Number.isFinite(z.fs) ? clamp(Number(z.fs), 0.3, 3.5) : 1;
  const coef = Number.isFinite(z.coef) ? Math.max(0, Number(z.coef)) : 0;
  return {
    id: z.id, kind, cx, cy, w, fs, coef,
    align: ALIGNS.has(z.align) ? z.align : 'center',
    colorKey,
    visible: z.visible !== false,
    locked: !!z.locked,
  };
}

// Validate a base64 PNG dataURL background. Returns the string if it's a well-formed,
// size-capped PNG, otherwise null (background is cosmetic — drop, don't error).
function validateBackground(bg) {
  if (typeof bg !== 'string') return null;
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(bg);
  if (!m) return null;
  if (bg.length > PLAQUE_BG_MAX) return null;
  let buf;
  try { buf = Buffer.from(m[1], 'base64'); } catch { return null; }
  // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
  const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buf.length < SIG.length) return null;
  for (let i = 0; i < SIG.length; i++) if (buf[i] !== SIG[i]) return null;
  return bg;
}

// Validate a full plaque config. Returns a sanitized object, or null if not an object.
function validatePlaque(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const templateId = TEMPLATE_IDS.has(obj.templateId) ? obj.templateId : TEMPLATES[0].id;
  const tplColors = getTemplate(templateId).colors;
  const colors = {};
  for (const k of COLOR_KEYS) {
    const v = obj.colors && obj.colors[k];
    colors[k] = (typeof v === 'string' && HEX_RE.test(v)) ? v : tplColors[k];
  }
  const zones = Array.isArray(obj.zones)
    ? obj.zones.slice(0, ZONES_MAX).map(validateZone).filter(Boolean)
    : [];
  return {
    templateId,
    colors,
    zones,
    background: validateBackground(obj.background),
  };
}

module.exports = {
  TEMPLATES, getTemplate, validatePlaque, validateBackground,
  PLAQUE_BG_MAX, HEX_RE,
};
