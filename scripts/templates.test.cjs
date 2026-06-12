'use strict';
// Unit tests for plaque-config validation (src/templates.js). Run: npm test.
const assert = require('node:assert');
const zlib = require('node:zlib');
const { validatePlaque, validateBackground, TEMPLATES, PLAQUE_BG_MAX } = require('../src/templates');

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); console.log('PASS  ' + name); pass++; }
  catch (e) { console.log('FAIL  ' + name + '\n      ' + e.message); fail++; }
}

// Build a minimal valid 1x1 PNG dataURL (real PNG signature + chunks).
function tinyPngDataUrl() {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); // CRC isn't checked by validateBackground (magic bytes only)
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 6;
  const idat = zlib.deflateSync(Buffer.from([0, 0, 0, 0, 0]));
  const png = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
  return 'data:image/png;base64,' + png.toString('base64');
}

t('valid config clamps out-of-range zone fields', () => {
  const out = validatePlaque({
    templateId: 'arcane',
    colors: { accent: '#fff', badge: '#2e7d32', name: '#e6c87f' },
    zones: [{ id: 'total', kind: 'text', cx: 250, cy: -5, w: 999, fs: 99, coef: 0.2, align: 'center', colorKey: 'accent', visible: true, locked: false }],
  });
  assert.ok(out);
  assert.strictEqual(out.zones[0].cx, 100);
  assert.strictEqual(out.zones[0].cy, 0);
  assert.strictEqual(out.zones[0].w, 100);
  assert.strictEqual(out.zones[0].fs, 3.5);
});

t('unknown zone ids and bad align are rejected/normalized', () => {
  const out = validatePlaque({ templateId: 'arcane', zones: [
    { id: 'bogus', kind: 'text', cx: 50, cy: 50 },
    { id: 'rname', kind: 'text', cx: 50, cy: 50, align: 'justify', colorKey: 'nope' },
  ] });
  assert.strictEqual(out.zones.length, 1, 'bogus zone dropped');
  assert.strictEqual(out.zones[0].align, 'center');
  assert.strictEqual(out.zones[0].colorKey, null);
});

t('unknown templateId falls back to first seeded template', () => {
  const out = validatePlaque({ templateId: 'does-not-exist' });
  assert.strictEqual(out.templateId, TEMPLATES[0].id);
});

t('non-object input → null', () => {
  assert.strictEqual(validatePlaque(null), null);
  assert.strictEqual(validatePlaque('x'), null);
  assert.strictEqual(validatePlaque([]), null);
});

t('valid PNG dataURL background passes', () => {
  const bg = tinyPngDataUrl();
  assert.strictEqual(validateBackground(bg), bg);
  const out = validatePlaque({ templateId: 'arcane', background: bg });
  assert.strictEqual(out.background, bg);
});

t('non-PNG / non-dataURL backgrounds → null (dropped, not error)', () => {
  assert.strictEqual(validateBackground('data:image/jpeg;base64,/9j/4AAQ'), null);
  assert.strictEqual(validateBackground('https://evil.example/x.png'), null);
  assert.strictEqual(validateBackground('data:image/png;base64,' + Buffer.from('not a png').toString('base64')), null);
  const out = validatePlaque({ templateId: 'arcane', background: 'https://evil.example/x.png' });
  assert.strictEqual(out.background, null);
});

t('oversized background → null', () => {
  const huge = 'data:image/png;base64,' + 'A'.repeat(PLAQUE_BG_MAX + 10);
  assert.strictEqual(validateBackground(huge), null);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
