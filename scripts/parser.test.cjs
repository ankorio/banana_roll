'use strict';
// Unit tests for the server-side roll parser (src/parser.js). Covers the Roll20
// rolltemplate cases the userscript used to handle on the client. Run: npm test.
const assert = require('node:assert');
const { parseChatRecord } = require('../src/parser');

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); console.log('PASS  ' + name); pass++; }
  catch (e) { console.log('FAIL  ' + name + '\n      ' + e.message); fail++; }
}

// Minimal builders mirroring Roll20's Firebase transport (arrays encoded as objects).
const die = (sides, v, mods) => ({ dice: 1, sides, type: 'R', results: { 0: { v } }, ...(mods ? { mods } : {}) });
const inl = (expression, total, ...rolls) => ({ expression, results: { total, type: 'V', rolls: Object.assign({}, rolls) } });
const rec = (rolltemplate, content, inlinerolls) => ({ type: 'general', who: 'Blaze', playerid: 'p1', rolltemplate, content, inlinerolls });

t('plain /roll (rollresult) extracts total + dice', () => {
  const msg = { type: 'rollresult', who: 'Gandalf', origRoll: '2d6+3',
    content: JSON.stringify({ type: 'V', total: 11, rolls: [{ type: 'R', sides: 6, results: [{ v: 4 }, { v: 4 }] }] }) };
  const r = parseChatRecord('k1', msg, {});
  assert.strictEqual(r.total, 11);
  assert.strictEqual(r.dice.length, 2);
  assert.strictEqual(r.formula, '2d6+3');
});

t('skill check (normal) keeps r1, names the skill', () => {
  const msg = rec('simple', ' {{rname=^{deception-u}}} {{r1=$[[0]]}} {{normal=1}} {{r2=$[[1]]}} charname=Blaze', {
    0: inl('1d20+2[charisma]', 7, die(20, 5)),
    1: inl('0d20+2[charisma]', 2),
  });
  const r = parseChatRecord('k2', msg, {});
  assert.strictEqual(r.total, 7);
  assert.strictEqual(r.formula, 'deception: 1d20+2[charisma]');
});

t('advantage keeps the HIGHER d20 + reports both dice for the animation', () => {
  const msg = rec('simple', ' {{rname=^{history-u}}} {{r1=$[[0]]}} {{advantage=1}} {{r2=$[[1]]}}', {
    0: inl('1d20+5', 18, die(20, 13)),
    1: inl('1d20+5', 13, die(20, 8)),
  });
  const r = parseChatRecord('k3', msg, {});
  assert.strictEqual(r.total, 18);
  assert.strictEqual(r.mode, 'advantage');
  assert.deepStrictEqual(r.d20, { values: [13, 8], keptIndex: 0 });
  assert.strictEqual(r.modifier, 5); // total 18 − kept d20 13
});

t('disadvantage keeps the LOWER d20 + marks the kept index', () => {
  const msg = rec('simple', ' {{rname=^{insight-u}}} {{r1=$[[0]]}} {{disadvantage=1}} {{r2=$[[1]]}}', {
    0: inl('1d20+1', 12, die(20, 11)),
    1: inl('1d20+1', 4, die(20, 3)),
  });
  const r = parseChatRecord('k4', msg, {});
  assert.strictEqual(r.total, 4);
  assert.strictEqual(r.mode, 'disadvantage');
  assert.deepStrictEqual(r.d20, { values: [11, 3], keptIndex: 1 });
});

t('normal roll has mode "normal", no d20 pair, and a modifier', () => {
  const msg = rec('simple', ' {{rname=^{deception-u}}} {{r1=$[[0]]}} {{normal=1}} {{r2=$[[1]]}}', {
    0: inl('1d20+2', 7, die(20, 5)),
    1: inl('0d20+2', 2),
  });
  const r = parseChatRecord('kn', msg, {});
  assert.strictEqual(r.mode, 'normal');
  assert.strictEqual(r.d20, null);
  assert.strictEqual(r.modifier, 2);
});

t('attack nat-1 with customCrit point is a FUMBLE not a crit', () => {
  const cc = { customCrit: { 0: { comp: '>=', point: 20 } } };
  const msg = rec('atk', ' {{rname=[Fire Bolt](~x|y)}} {{r1=$[[0]]}} {{normal=1}} {{r2=$[[1]]}}', {
    0: inl('1d20cs>20 + 5[INT]', 8, die(20, 1, cc)),
    1: inl('0d20cs>20 + 5[INT]', 7),
  });
  const r = parseChatRecord('k5', msg, {});
  assert.strictEqual(r.isFumble, true);
  assert.strictEqual(r.isCrit, false);
  assert.strictEqual(r.formula, 'Fire Bolt: 1d20cs>20 + 5[INT]');
});

t('damage template (no r1/r2) captures dmg1', () => {
  const msg = rec('dmg', ' {{rname=Thunder Gauntlets}} {{dmg1=$[[0]]}} {{dmg2=$[[1]]}} {{globaldamage=$[[2]]}}', {
    0: inl('1d8 + 5[INT]', 13, die(8, 8)),
    1: inl('0', 0),
    2: inl('0', 0),
  });
  const r = parseChatRecord('k6', msg, {});
  assert.strictEqual(r.total, 13);
  assert.match(r.formula, /Thunder Gauntlets/);
  assert.strictEqual(r.isCrit, false); // d8, never a d20 crit
});

t('customCrit widens crit range (crit on 19)', () => {
  const cc = { customCrit: { 0: { comp: '>=', point: 19 } } };
  const msg = rec('atk', ' {{rname=[Greatsword](~x|y)}} {{r1=$[[0]]}} {{normal=1}} {{r2=$[[1]]}}', {
    0: inl('1d20cs>19', 19, die(20, 19, cc)),
    1: inl('0d20', 0),
  });
  assert.strictEqual(parseChatRecord('k7', msg, {}).isCrit, true);
});

t('generic system never flags crit/fumble', () => {
  const cc = { customCrit: { 0: { comp: '>=', point: 20 } } };
  const msg = rec('atk', ' {{rname=[X](~x|y)}} {{r1=$[[0]]}} {{normal=1}} {{r2=$[[1]]}}', {
    0: inl('1d20', 20, die(20, 20, cc)),
    1: inl('0d20', 0),
  });
  const r = parseChatRecord('k8', msg, { system: 'generic' });
  assert.strictEqual(r.isCrit, false);
  assert.strictEqual(r.isFumble, false);
});

t('whisper/secret types are not parsed as rolls', () => {
  // (The relay client already drops these, but the parser must refuse them too.)
  assert.strictEqual(parseChatRecord('k9', { type: 'gmrollresult', content: '{"total":20,"rolls":[]}' }, {}), null);
  assert.strictEqual(parseChatRecord('k10', { type: 'whisper', who: 'GM', content: 'secret' }, {}), null);
});

t('plain chat (no dice) returns null', () => {
  assert.strictEqual(parseChatRecord('k11', { type: 'general', who: 'Blaze', content: 'hi' }, {}), null);
});

t('ts is preserved when provided', () => {
  const r = parseChatRecord('k12', { type: 'rollresult', content: '{"total":3,"rolls":[]}', origRoll: '1d4' }, { ts: 1700000000000 });
  assert.strictEqual(r.ts, 1700000000000);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
