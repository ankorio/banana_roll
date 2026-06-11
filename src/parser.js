'use strict';
// Roll20 chat record → overlay roll.
//
// All dice/game-rule parsing lives here (server-side) so the userscript can stay a
// thin, stable relay: it forwards raw Roll20 chat records and never needs updating
// when a rule changes or a new game system is added. The Roll20 *transport* shape
// (chat records, inlinerolls, rolltemplates) is identical across systems; only the
// *ruleset* — what counts as a crit/fumble — differs, so that part is pluggable via
// `system` (default 'dnd5e').

// --- tiny helpers -----------------------------------------------------------
const clean = (s) => (s ? String(s).replace(/\s+/g, ' ').trim() : '');
const num = (s) => { const n = Number(s); return Number.isFinite(n) ? n : NaN; };
function tryParse(text) { try { return JSON.parse(text); } catch { return null; } }

// The Firebase Realtime transport encodes arrays as objects with numeric-string keys
// ({"0":…,"1":…}) — so inlinerolls / results.rolls / a die's results often arrive as
// objects. Normalize them back to arrays.
function toArray(v) {
  if (Array.isArray(v)) return v;
  if (v && typeof v === 'object') {
    const keys = Object.keys(v).filter((k) => /^\d+$/.test(k));
    if (keys.length) return keys.sort((a, b) => a - b).map((k) => v[k]);
  }
  return [];
}

// Read a custom crit/fumble threshold off a die segment's mods, if present.
function modPoint(mods, name) {
  const arr = toArray(mods && mods[name]);
  for (const m of arr) { const p = num(m && m.point); if (Number.isFinite(p)) return p; }
  return null;
}

// --- game systems (pluggable crit/fumble rules) -----------------------------
// Each die carries the Roll20-provided thresholds (critAt/fumbleAt) so a ruleset can
// honor or ignore them. Add a system here; no client change is needed.
const SYSTEMS = {
  dnd5e: {
    crit: (d) => d.sides === '20' && d.value != null && d.critAt != null && d.value >= d.critAt,
    fumble: (d) => d.sides === '20' && d.value != null && d.fumbleAt != null && d.value <= d.fumbleAt,
  },
  // No highlights — totals only.
  generic: { crit: () => false, fumble: () => false },
};
const DEFAULT_SYSTEM = 'dnd5e';

// --- dice flattening --------------------------------------------------------
// Walk Roll20's nested roll structure into flat dice. Segments: "R" = a die roll
// (sides + results[].v); "G" = group of sub-rolls; "M"/"L" = modifier/label (skipped).
function flattenDice(rolls, out = [], depth = 0) {
  const segs = toArray(rolls);
  if (!segs.length || depth > 6) return out;
  for (const seg of segs) {
    if (!seg || typeof seg !== 'object') continue;
    if (seg.type === 'R') {
      const sides = String(seg.sides != null ? seg.sides : '');
      const critAt = sides === '20' ? (modPoint(seg.mods, 'customCrit') ?? 20) : null;
      const fumbleAt = sides === '20' ? (modPoint(seg.mods, 'customFumble') ?? 1) : null;
      for (const res of toArray(seg.results)) {
        if (res && res.d) continue; // dropped die (keep-highest/lowest) — not counted
        const v = num(res && res.v);
        out.push({ sides, value: Number.isFinite(v) ? v : null, critAt, fumbleAt });
      }
    } else if (seg.type === 'G') {
      for (const sub of toArray(seg.rolls)) flattenDice(sub, out, depth + 1);
    } else if (seg.rolls) {
      flattenDice(seg.rolls, out, depth + 1);
    }
  }
  return out;
}

// --- rolltemplate (sheet roll) helpers --------------------------------------
// Sheet rolls put dice in `inlinerolls`, referenced from `content` via $[[N]]
// placeholders, e.g. {{r1=$[[0]]}} {{r2=$[[1]]}} (the two d20s of an attack/check)
// or {{dmg1=$[[0]]}} (damage). The mode ({{normal|advantage|disadvantage=1}}) decides
// which of r1/r2 counts.
const inlTotal = (x) => { const t = num(x && x.results && x.results.total); return Number.isFinite(t) ? t : NaN; };
function hasRealDie(x) {
  return toArray(x && x.results && x.results.rolls)
    .some((seg) => seg && seg.type === 'R' && toArray(seg.results).length > 0);
}
function refIndex(content, field) {
  const m = new RegExp('\\{\\{' + field + '=\\$\\[\\[(\\d+)\\]\\]\\}\\}').exec(content || '');
  return m ? Number(m[1]) : -1;
}

function pickPrimaryInline(inl, content) {
  if (!inl.length) return null;
  const adv = /\{\{\s*advantage\s*=\s*1\s*\}\}/.test(content);
  const dis = /\{\{\s*disadvantage\s*=\s*1\s*\}\}/.test(content);
  let i1 = refIndex(content, 'r1');
  const i2 = refIndex(content, 'r2');
  if (i1 < 0) i1 = refIndex(content, 'dmg1'); // damage template has no r1/r2
  if ((adv || dis) && inl[i1] && inl[i2]) {
    const t1 = inlTotal(inl[i1]), t2 = inlTotal(inl[i2]);
    const keepFirst = adv ? (t1 >= t2) : (t1 <= t2);
    return keepFirst ? inl[i1] : inl[i2];
  }
  if (i1 >= 0 && inl[i1] && hasRealDie(inl[i1])) return inl[i1];
  return inl.find(hasRealDie) || inl[0];
}

// Pull a readable label out of {{rname=…}}: a [Name](link), a ^{loc-key}, or plain text.
function parseRname(content) {
  const m = /\{\{rname=(\^\{[^}]*\}|\[[^\]]*\]\([^)]*\)|[^}]*)\}\}/.exec(content || '');
  if (!m) return '';
  const s = m[1].trim();
  const link = /\[([^\]]+)\]\([^)]*\)/.exec(s);
  if (link) return clean(link[1]);
  const loc = /^\^\{(.+?)\}$/.exec(s);
  if (loc) return clean(loc[1].replace(/-u$/, '').replace(/[-_]/g, ' '));
  return clean(s);
}

// Which Roll20 chat types are rolls we publish. (Secret types — whisper/gmrollresult —
// are filtered by the relay client and never reach here.)
const ROLL_TYPES = new Set(['rollresult', 'general']);

// --- main entry -------------------------------------------------------------
// Parse one raw Roll20 chat record into an overlay roll, or null if it isn't a roll.
//   id   — the Firebase chat push-id (used as the dedup id)
//   msg  — the raw chat record
//   opts — { system, ts }  (ts = Firebase commit time, for the latency probe)
function parseChatRecord(id, msg, opts = {}) {
  if (!msg || typeof msg !== 'object') return null;
  if (typeof msg.type === 'string' && !ROLL_TYPES.has(msg.type)) return null;

  const inl = toArray(msg.inlinerolls);
  let total = null, rolls = null, formula = '';

  if (msg.type === 'rollresult' && typeof msg.content === 'string') {
    // Plain /roll — content is the roll JSON ({ type:"V", rolls:[…], total }).
    const parsed = tryParse(msg.content);
    if (!parsed) return null;
    total = num(parsed.total);
    rolls = parsed.rolls;
    formula = clean(msg.origRoll);
  } else if (inl.length) {
    // Sheet roll template (attack/check/save/damage).
    const content = typeof msg.content === 'string' ? msg.content : '';
    const primary = pickPrimaryInline(inl, content);
    const r = primary && primary.results;
    if (!r) return null;
    total = num(r.total);
    rolls = r.rolls;
    const expr = clean(primary.expression) || clean(msg.origRoll);
    const name = parseRname(content);
    formula = name ? (expr ? `${name}: ${expr}` : name) : expr;
  } else {
    return null; // plain chat / emote with no dice
  }

  const rules = SYSTEMS[opts.system] || SYSTEMS[DEFAULT_SYSTEM];
  const dice = flattenDice(rolls, []).map((d) => ({
    sides: d.sides,
    value: d.value,
    crit: rules.crit(d),
    fumble: rules.fumble(d),
  }));
  let isCrit = false, isFumble = false;
  for (const d of dice) { if (d.crit) isCrit = true; if (d.fumble) isFumble = true; }
  if (isCrit && isFumble) { isCrit = false; isFumble = false; } // mixed nat20+nat1 → neither

  const ts = Number.isFinite(opts.ts) ? opts.ts : Date.now();
  return {
    id: id || ('fb-' + ts),
    who: clean(msg.who) || 'Someone',
    formula,
    total: Number.isFinite(total) ? total : null,
    dice,
    isCrit,
    isFumble,
    playerid: typeof msg.playerid === 'string' ? msg.playerid : undefined,
    ts,
  };
}

module.exports = { parseChatRecord, SYSTEMS, DEFAULT_SYSTEM };
