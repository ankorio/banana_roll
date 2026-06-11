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
