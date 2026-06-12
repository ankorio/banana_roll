// End-to-end smoke test against a running-or-spawned server.
// Asserts: create room, SSE retained replay + live delivery, dedup, 403 bad token.
import { spawn } from 'node:child_process';
import process from 'node:process';

const PORT = 8799;
const BASE = `http://localhost:${PORT}`;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
let failures = 0;
function check(name, ok) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failures++;
}

// Read SSE events off a fetch stream, invoking cb(dataObj) per `data:` line.
async function sseClient(url, onEvent) {
  const res = await fetch(url, { headers: { accept: 'text/event-stream' } });
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf('\n\n')) !== -1) {
          const frame = buf.slice(0, idx); buf = buf.slice(idx + 2);
          for (const line of frame.split('\n')) {
            if (line.startsWith('data:')) {
              const data = line.slice(5).trim();
              try { onEvent(JSON.parse(data)); } catch { onEvent(data); }
            }
          }
        }
      }
    } catch { /* stream aborted on close */ }
  })();
  return () => reader.cancel().catch(() => {});
}

async function main() {
  // 1. create a room
  const created = await (await fetch(`${BASE}/rooms`, { method: 'POST' })).json();
  check('create room returns id + token', !!created.room && !!created.publishToken);
  check('id and token differ', created.room !== created.publishToken);
  const { room, publishToken } = created;

  // 2. live SSE client
  const liveEvents = [];
  const closeLive = await sseClient(`${BASE}/room/${room}/events`, (e) => liveEvents.push(e));
  await sleep(150);

  // 3. post a roll
  const roll = { id: 'msg-1', who: 'Tester', formula: '1d20+5', total: 23,
    dice: [{ sides: '20', value: 18 }], isCrit: false, isFumble: false, ts: Date.now() };
  const r1 = await fetch(`${BASE}/room/${room}/roll?token=${publishToken}`,
    { method: 'POST', body: JSON.stringify(roll) });
  const j1 = await r1.json();
  check('valid roll -> 200', r1.status === 200 && j1.ok && j1.duplicate === false);
  await sleep(150);
  check('live SSE received the roll', liveEvents.some((e) => e && e.id === 'msg-1'));

  // 4. duplicate id is accepted but not re-broadcast
  const before = liveEvents.length;
  const r2 = await fetch(`${BASE}/room/${room}/roll?token=${publishToken}`,
    { method: 'POST', body: JSON.stringify(roll) });
  const j2 = await r2.json();
  check('duplicate roll -> 200 duplicate:true', r2.status === 200 && j2.duplicate === true);
  await sleep(150);
  check('duplicate not re-delivered over SSE', liveEvents.length === before);

  // 5. bad token rejected
  const r3 = await fetch(`${BASE}/room/${room}/roll?token=wrong`,
    { method: 'POST', body: JSON.stringify({ ...roll, id: 'msg-2' }) });
  check('bad token -> 403', r3.status === 403);

  // 5b. RAW chat record is parsed server-side and broadcast (advantage → higher d20).
  const advRecord = {
    id: 'chat-adv-1',
    ts: Date.now(),
    msg: {
      type: 'general', rolltemplate: 'simple', who: 'Blaze', playerid: 'p-1',
      content: ' {{rname=^{history-u}}} {{r1=$[[0]]}} {{advantage=1}} {{r2=$[[1]]}} charname=Blaze',
      inlinerolls: {
        '0': { expression: '1d20+5[intelligence]', results: { rolls: { '0': { dice: 1, results: { '0': { v: 13 } }, sides: 20, type: 'R' }, '1': { expr: '+5', type: 'M' } }, total: 18, type: 'V' } },
        '1': { expression: '1d20+5[intelligence]', results: { rolls: { '0': { dice: 1, results: { '0': { v: 8 } }, sides: 20, type: 'R' }, '1': { expr: '+5', type: 'M' } }, total: 13, type: 'V' } },
      },
    },
  };
  const rc = await fetch(`${BASE}/room/${room}/chat?token=${publishToken}`,
    { method: 'POST', body: JSON.stringify(advRecord) });
  const jc = await rc.json();
  check('raw chat parsed -> 200 with roll', rc.status === 200 && jc.roll && jc.roll.total === 18);
  check('chat roll names the skill (history)', !!jc.roll && /history/i.test(jc.roll.formula));
  check('advantage carries mode + both d20s for the animation',
    !!jc.roll && jc.roll.mode === 'advantage' && Array.isArray(jc.roll.d20?.values) &&
    jc.roll.d20.values.length === 2 && jc.roll.d20.keptIndex === 0 && jc.roll.modifier === 5);
  await sleep(150);
  check('chat roll broadcast over SSE', liveEvents.some((e) => e && e.id === 'chat-adv-1' && e.total === 18));

  // 5c. a non-roll chat record is accepted but not broadcast
  const before2 = liveEvents.length;
  const rn = await fetch(`${BASE}/room/${room}/chat?token=${publishToken}`,
    { method: 'POST', body: JSON.stringify({ id: 'chat-noroll', msg: { type: 'general', who: 'Blaze', content: 'hello table' } }) });
  const jn = await rn.json();
  check('non-roll chat -> 200 roll:null', rn.status === 200 && jn.roll === null);
  await sleep(100);
  check('non-roll not broadcast', liveEvents.length === before2);

  // 5d. players roster round-trip (userscript push → setup page read). Each player
  //     carries a per-campaign `id` plus a stable account `userid` (d20userid).
  const rp = await fetch(`${BASE}/room/${room}/players?token=${publishToken}`,
    { method: 'POST', body: JSON.stringify([{ id: 'p-1', name: 'Blaze', color: '#e74c3c', online: true, userid: 'u-1' }]) });
  const jp = await rp.json();
  check('players post -> 200 count', rp.status === 200 && jp.count === 1);
  const gp = await (await fetch(`${BASE}/room/${room}/players`)).json();
  check('players get returns roster', Array.isArray(gp.players) && gp.players[0] && gp.players[0].name === 'Blaze');
  check('roster carries the stable account userid', gp.players[0] && gp.players[0].userid === 'u-1');
  const rpBad = await fetch(`${BASE}/room/${room}/players?token=wrong`, { method: 'POST', body: '[]' });
  check('players post bad token -> 403', rpBad.status === 403);

  // 5e. plaque config round-trip + background validation (a valid 1x1 PNG passes,
  //     a non-PNG dataURL is dropped to null — cosmetic, never a hard error).
  const PNG_1x1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const plaqueCfg = { templateId: 'arcane', colors: { accent: '#ffd24a', badge: '#2e7d32', name: '#e6c87f' },
    zones: [{ id: 'total', kind: 'text', cx: 50, cy: 62.8, w: 50, fs: 1, coef: 0.2, align: 'center', colorKey: 'accent', visible: true, locked: false }],
    background: PNG_1x1 };
  const rpl = await fetch(`${BASE}/room/${room}/plaque?player=p-1`, { method: 'POST', body: JSON.stringify(plaqueCfg) });
  const jpl = await rpl.json();
  check('plaque post -> 200 with templateId', rpl.status === 200 && jpl.plaque && jpl.plaque.templateId === 'arcane');
  check('plaque keeps valid PNG background', !!jpl.plaque && jpl.plaque.background === PNG_1x1);
  const gpl = await (await fetch(`${BASE}/room/${room}/plaque`)).json();
  check('plaque get returns the saved config', !!gpl.plaques && gpl.plaques['p-1'] && gpl.plaques['p-1'].templateId === 'arcane');
  const rplBad = await fetch(`${BASE}/room/${room}/plaque?player=p-1`,
    { method: 'POST', body: JSON.stringify({ ...plaqueCfg, background: 'https://evil.example/x.png' }) });
  const jplBad = await rplBad.json();
  check('non-PNG background dropped to null', rplBad.status === 200 && jplBad.plaque.background === null);

  // 5f. seeded templates are readable for the editor
  const gtpl = await (await fetch(`${BASE}/room/${room}/templates`)).json();
  check('templates get returns seeded list', Array.isArray(gtpl.templates) && gtpl.templates.some((t) => t.id === 'arcane'));

  // 5g. room settings round-trip + drive the parser system
  const rset = await fetch(`${BASE}/room/${room}/settings`,
    { method: 'POST', body: JSON.stringify({ settings: { system: 'generic', displaySeconds: 6, confetti: false } }) });
  check('settings post -> 200', rset.status === 200);
  const gset = await (await fetch(`${BASE}/room/${room}/settings`)).json();
  check('settings get returns saved values', gset.settings && gset.settings.system === 'generic' && gset.settings.displaySeconds === 6);

  // 5h. CROSS-CAMPAIGN persistence: a player's saved look follows their ACCOUNT into
  //     a different campaign — even though Roll20 gives them a NEW per-campaign id.
  //     p-1 (account u-1) saved a plaque above; now save a dice style too. Both mirror
  //     to the profile keyed by u-1.
  const rsty = await fetch(`${BASE}/room/${room}/styles?player=p-1`,
    { method: 'POST', body: JSON.stringify({ style: { colorset: 'fire', material: 'metal', texture: 'fire' } }) });
  check('dice style post -> 200 (mirrors to account profile)', rsty.status === 200);
  const gprof = await (await fetch(`${BASE}/room/${room}/profile?player=p-1`)).json();
  check('profile (resolved via userid) carries style + plaque', gprof.style && gprof.style.colorset === 'fire' && gprof.plaque && gprof.plaque.templateId === 'arcane');

  // Fresh campaign: SAME account (userid u-1), DIFFERENT per-campaign player id (p-2).
  const room2 = (await (await fetch(`${BASE}/rooms`, { method: 'POST' })).json());
  await fetch(`${BASE}/room/${room2.room}/players?token=${room2.publishToken}`,
    { method: 'POST', body: JSON.stringify([{ id: 'p-2', name: 'Blaze', color: '#e74c3c', online: true, userid: 'u-1' }]) });
  await sleep(250); // seedProfiles runs async off the roster push
  const g2sty = await (await fetch(`${BASE}/room/${room2.room}/styles`)).json();
  check('new campaign seeds dice style onto the new player id', !!g2sty.styles && g2sty.styles['p-2'] && g2sty.styles['p-2'].colorset === 'fire');
  const g2pl = await (await fetch(`${BASE}/room/${room2.room}/plaque`)).json();
  check('new campaign seeds plaque onto the new player id', !!g2pl.plaques && g2pl.plaques['p-2'] && g2pl.plaques['p-2'].templateId === 'arcane');

  // 6. late subscriber gets retained last roll immediately
  const lateEvents = [];
  const closeLate = await sseClient(`${BASE}/room/${room}/events`, (e) => lateEvents.push(e));
  await sleep(200);
  check('late subscriber gets retained last roll', lateEvents.some((e) => e && e.id === 'chat-adv-1'));

  // 7. unknown room -> 404
  const r4 = await fetch(`${BASE}/room/nope/roll?token=x`, { method: 'POST', body: '{}' });
  check('unknown room -> 404', r4.status === 404);

  closeLive(); closeLate();
  console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
  process.exit(failures ? 1 : 0);
}

// spawn the server, wait for health, run, tear down
const srv = spawn(process.execPath, ['src/server.js'],
  { env: { ...process.env, PORT: String(PORT) }, stdio: 'inherit' });
process.on('exit', () => srv.kill());

(async () => {
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`${BASE}/healthz`)).ok) break; } catch {}
    await sleep(100);
  }
  try { await main(); } catch (e) { console.error(e); process.exit(1); }
  finally { srv.kill(); }
})();
