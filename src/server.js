'use strict';
// HTTP server + routing. Single file until it hurts (~250 lines).
const http = require('http');
const fs = require('fs');
const path = require('path');
const rooms = require('./rooms');
const parser = require('./parser');

const PORT = parseInt(process.env.PORT, 10) || 8765;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const MAX_BODY = 16 * 1024; // 16KB cap on POST bodies

// BASE_URL is used to build absolute links handed to users. Falls back per-request.
function baseUrl(req) {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
  return `${proto}://${host}`;
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function readBody(req, limit, cb) {
  let size = 0;
  const chunks = [];
  let done = false;
  const finish = (err, buf) => { if (!done) { done = true; cb(err, buf); } };
  req.on('data', (c) => {
    size += c.length;
    if (size > limit) {
      finish(new Error('body too large'));
      req.destroy();
      return;
    }
    chunks.push(c);
  });
  req.on('end', () => finish(null, Buffer.concat(chunks)));
  req.on('error', (e) => finish(e));
}

// --- static file serving (overlay/setup templates live in public/) ----------
const STATIC_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
};
function serveFile(res, file, headers = {}) {
  fs.readFile(file, (err, data) => {
    if (err) { sendJson(res, 404, { error: 'not found' }); return; }
    const type = STATIC_TYPES[path.extname(file)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, ...headers });
    res.end(data);
  });
}

// Serve a vendored static asset under public/assets/ (overlay art/fonts, the dice
// engine bundle, textures, sounds, manifest). Supports nested paths (e.g.
// /assets/textures/marble.webp) with a path-traversal guard: the resolved path must
// stay inside public/assets/.
const ASSETS_DIR = path.join(PUBLIC_DIR, 'assets');
function serveAsset(res, rel) {
  const target = path.normalize(path.join(ASSETS_DIR, rel));
  if (target !== ASSETS_DIR && !target.startsWith(ASSETS_DIR + path.sep)) {
    return sendJson(res, 403, { error: 'forbidden' });
  }
  serveFile(res, target, { 'Cache-Control': 'public, max-age=86400' });
}

// Landing/setup page, served at `/` with this deployment's origin baked in so the
// Tampermonkey install link + shown URLs always point at wherever this is running
// (localhost, a LAN IP, or a public domain) — no hardcoding.
let landingTemplate = null;
function serveLanding(req, res) {
  try {
    if (landingTemplate == null) {
      landingTemplate = fs.readFileSync(path.join(PUBLIC_DIR, 'landing.html'), 'utf8');
    }
  } catch { return sendJson(res, 404, { error: 'not found' }); }
  const body = landingTemplate.replace(/__ORIGIN__/g, baseUrl(req));
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(body);
}

// Serve the capture userscript with this deployment's origin baked in, so users
// don't hand-edit SERVER / @connect. (The token is NOT baked in — the script
// self-provisions, keeping the token off room-id-only responses.)
let userscriptTemplate = null;
function buildUserscript(req) {
  if (userscriptTemplate == null) {
    userscriptTemplate = fs.readFileSync(path.join(PUBLIC_DIR, 'roll20-capture.user.js'), 'utf8');
  }
  const origin = baseUrl(req);
  const host = origin.replace(/^https?:\/\//, '').split(':')[0];
  return userscriptTemplate
    .replace(/const SERVER = '[^']*';/, `const SERVER = '${origin}';`)
    .replace(/^\/\/ @connect\s+localhost$/m, `// @connect      ${host}`)
    .replace(/__ORIGIN__/g, origin); // @updateURL/@downloadURL point back here
}
function serveUserscript(req, res) {
  let body;
  try { body = buildUserscript(req); } catch { return sendJson(res, 404, { error: 'not found' }); }
  res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
  res.end(body);
}
// Tampermonkey fetches <name>.meta.js (just the header) to check @version for updates.
function serveUserscriptMeta(req, res) {
  let body;
  try { body = buildUserscript(req); } catch { return sendJson(res, 404, { error: 'not found' }); }
  const marker = '// ==/UserScript==';
  const end = body.indexOf(marker);
  const meta = end >= 0 ? body.slice(0, end + marker.length) + '\n' : body;
  res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
  res.end(meta);
}

// --- roll validation --------------------------------------------------------
function validateRoll(obj) {
  if (!obj || typeof obj !== 'object') return null;
  if (typeof obj.id !== 'string' || !obj.id || obj.id.length > 200) return null;
  const dice = Array.isArray(obj.dice) ? obj.dice.slice(0, 100).map((d) => ({
    sides: String(d && d.sides != null ? d.sides : ''),
    value: Number(d && d.value),
    crit: !!(d && d.crit),
    fumble: !!(d && d.fumble),
  })) : [];
  const out = {
    id: obj.id,
    who: typeof obj.who === 'string' ? obj.who.slice(0, 100) : 'Someone',
    formula: typeof obj.formula === 'string' ? obj.formula.slice(0, 200) : '',
    total: Number(obj.total),
    dice,
    modifier: Number.isFinite(obj.modifier) ? obj.modifier : 0,
    isCrit: !!obj.isCrit,
    isFumble: !!obj.isFumble,
    ts: Number.isFinite(obj.ts) ? obj.ts : Date.now(),
  };
  // Roll mode drives the dice animation: advantage/disadvantage rolls two d20s and
  // selects the winner. `d20` carries both raw values + which index was kept.
  if (obj.mode === 'advantage' || obj.mode === 'disadvantage') {
    out.mode = obj.mode;
    if (obj.d20 && Array.isArray(obj.d20.values)) {
      out.d20 = {
        values: obj.d20.values.slice(0, 2).map((v) => Number(v)),
        keptIndex: obj.d20.keptIndex === 1 ? 1 : 0,
      };
    }
  } else {
    out.mode = 'normal';
  }
  // Optional: which Roll20 player made this roll, so per-player overlays can filter.
  if (typeof obj.playerid === 'string' && obj.playerid) out.playerid = obj.playerid.slice(0, 100);
  // Optional avatar URL for the plaque portrait — only http(s) so it's safe in an <img src>.
  if (typeof obj.avatar === 'string' && /^https?:\/\//.test(obj.avatar)) out.avatar = obj.avatar.slice(0, 500);
  return out;
}

// --- dice styles ------------------------------------------------------------
// A style is a small cosmetic object describing how a player's dice look. All
// fields optional; anything unrecognized/malformed is dropped. Returns a sanitized
// style (possibly {}), or null if the input isn't an object.
const STYLE_MATERIALS = new Set(['none', 'metal', 'wood', 'glass', 'plastic']);
const KEY_RE = /^[\w-]{1,40}$/;
const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;
function validateStyle(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const out = {};
  if (typeof obj.texture === 'string' && KEY_RE.test(obj.texture)) out.texture = obj.texture;
  if (typeof obj.colorset === 'string' && KEY_RE.test(obj.colorset)) out.colorset = obj.colorset;
  if (typeof obj.material === 'string' && STYLE_MATERIALS.has(obj.material)) out.material = obj.material;
  for (const k of ['foreground', 'background', 'edge']) {
    if (typeof obj[k] === 'string' && HEX_RE.test(obj[k])) out[k] = obj[k];
  }
  return out;
}

// Resolve the style to stamp on a roll: the rolling player's style, else the room
// default, else null (overlay falls back to its built-in CONFIG defaults).
function styleForRoll(room, playerid) {
  if (playerid && room.styles && room.styles[playerid]) return room.styles[playerid];
  return room.defaultStyle || null;
}

// --- SSE --------------------------------------------------------------------
function writeSse(res, data, id) {
  if (id != null) res.write(`id: ${id}\n`);
  res.write(`data: ${data}\n\n`);
}

function broadcast(room, roll) {
  const data = JSON.stringify(roll);
  for (const res of room.clients) {
    try { writeSse(res, data, roll.id); } catch {}
  }
}

// --- routes -----------------------------------------------------------------
function handleCreateRoom(req, res) {
  if (!rooms.allowCreate(clientIp(req))) {
    return sendJson(res, 429, { error: 'rate limited' });
  }
  let created;
  try { created = rooms.createRoom(); }
  catch (e) {
    if (e.code === 'CAPACITY') return sendJson(res, 503, { error: 'at capacity' });
    throw e;
  }
  const base = baseUrl(req);
  console.log(`  ↳ room created: ${created.id}`);
  console.log(`    overlay: ${base}/room/${created.id}/overlay`);
  sendJson(res, 201, {
    room: created.id,
    publishToken: created.publishToken,
    overlayUrl: `${base}/room/${created.id}/overlay`,
    setupUrl: `${base}/room/${created.id}/setup`,
    eventsUrl: `${base}/room/${created.id}/events`,
    chatUrl: `${base}/room/${created.id}/chat`,
    rollUrl: `${base}/room/${created.id}/roll`,
  });
}

function handleRoll(req, res, id, query) {
  const room = rooms.getRoom(id);
  if (!room) return sendJson(res, 404, { error: 'unknown room' });
  if (query.get('token') !== room.publishToken) {
    return sendJson(res, 403, { error: 'bad token' });
  }
  if (!rooms.allowRoll(room)) return sendJson(res, 429, { error: 'rate limited' });

  readBody(req, MAX_BODY, (err, buf) => {
    if (err) return sendJson(res, 400, { error: 'bad body' });
    let parsed;
    try { parsed = JSON.parse(buf.toString('utf8')); }
    catch { return sendJson(res, 400, { error: 'invalid json' }); }
    const roll = validateRoll(parsed);
    if (!roll) return sendJson(res, 400, { error: 'invalid roll shape' });

    rooms.touch(room);
    const isNew = rooms.markSeen(room, roll.id);
    if (isNew) {
      const style = styleForRoll(room, roll.playerid);
      if (style) roll.style = style;
      room.lastRoll = roll;
      broadcast(room, roll);
      rooms.save(); // persist retained last-roll (no-op unless STATE_FILE set)
      console.log(`  ↳ roll in ${id}: ${roll.who} ${roll.formula} = ${roll.total}` +
        `${roll.isCrit ? ' [CRIT]' : roll.isFumble ? ' [FUMBLE]' : ''} → ${room.clients.size} client(s)`);
    } else {
      console.log(`  ↳ duplicate roll ${roll.id} in ${id} (ignored)`);
    }
    sendJson(res, 200, { ok: true, duplicate: !isNew });
  });
}

// Ingest a RAW Roll20 chat record and parse it server-side. The userscript relays
// records verbatim (no dice logic on the client); all game-rule parsing lives in
// parser.js, so rule changes / new systems ship without touching the userscript.
// Body: { id: "<chat push-id>", msg: <raw record>, ts?: <firebase commit ms> }.
function handleChat(req, res, id, query) {
  const room = rooms.getRoom(id);
  if (!room) return sendJson(res, 404, { error: 'unknown room' });
  if (query.get('token') !== room.publishToken) {
    return sendJson(res, 403, { error: 'bad token' });
  }
  if (!rooms.allowRoll(room)) return sendJson(res, 429, { error: 'rate limited' });

  readBody(req, MAX_BODY, (err, buf) => {
    if (err) return sendJson(res, 400, { error: 'bad body' });
    let parsed;
    try { parsed = JSON.parse(buf.toString('utf8')); }
    catch { return sendJson(res, 400, { error: 'invalid json' }); }
    if (!parsed || typeof parsed !== 'object' || typeof parsed.id !== 'string' || !parsed.id) {
      return sendJson(res, 400, { error: 'expected { id, msg }' });
    }

    rooms.touch(room);
    // Dedup on the chat push-id before the (cheap) parse work and before broadcast.
    const isNew = rooms.markSeen(room, parsed.id);
    if (!isNew) {
      console.log(`  ↳ duplicate chat ${parsed.id} in ${id} (ignored)`);
      return sendJson(res, 200, { ok: true, duplicate: true });
    }

    const raw = parser.parseChatRecord(parsed.id, parsed.msg, {
      system: room.system || parser.DEFAULT_SYSTEM,
      ts: Number(parsed.ts),
    });
    const roll = validateRoll(raw); // null if not a roll, or normalize/cap a parsed roll
    if (!roll) {
      console.log(`  ↳ chat ${parsed.id} in ${id}: not a roll (ignored)`);
      return sendJson(res, 200, { ok: true, roll: null });
    }

    const style = styleForRoll(room, roll.playerid);
    if (style) roll.style = style;
    room.lastRoll = roll;
    broadcast(room, roll);
    rooms.save();
    console.log(`  ↳ roll in ${id}: ${roll.who} ${roll.formula} = ${roll.total}` +
      `${roll.isCrit ? ' [CRIT]' : roll.isFumble ? ' [FUMBLE]' : ''} → ${room.clients.size} client(s)`);
    sendJson(res, 200, { ok: true, roll });
  });
}

// Normalize the roster the userscript observes on Roll20's /players node.
function validatePlayers(arr) {
  if (!Array.isArray(arr)) return null;
  return arr.slice(0, 200).map((p) => ({
    id: typeof p.id === 'string' ? p.id.slice(0, 100) : '',
    name: typeof p.name === 'string' ? p.name.slice(0, 100) : 'Player',
    color: typeof p.color === 'string' ? p.color.slice(0, 32) : '#888',
    online: !!p.online,
  })).filter((p) => p.id);
}

// Userscript → server: push the players roster so the setup page can render
// per-player overlay links (the server otherwise never sees Roll20's player list).
function handlePlayersPost(req, res, id, query) {
  const room = rooms.getRoom(id);
  if (!room) return sendJson(res, 404, { error: 'unknown room' });
  if (query.get('token') !== room.publishToken) {
    return sendJson(res, 403, { error: 'bad token' });
  }
  readBody(req, MAX_BODY, (err, buf) => {
    if (err) return sendJson(res, 400, { error: 'bad body' });
    let parsed;
    try { parsed = JSON.parse(buf.toString('utf8')); }
    catch { return sendJson(res, 400, { error: 'invalid json' }); }
    const players = validatePlayers(Array.isArray(parsed) ? parsed : parsed && parsed.players);
    if (!players) return sendJson(res, 400, { error: 'expected players array' });
    rooms.touch(room);
    room.players = players;
    sendJson(res, 200, { ok: true, count: players.length });
  });
}

// Room-id-only read for the setup page. Returns the roster (no token); these are the
// same names/ids already encoded in the per-player overlay URLs (bearer capabilities).
function handlePlayersGet(req, res, id) {
  const room = rooms.getRoom(id);
  if (!room) return sendJson(res, 404, { error: 'unknown room' });
  sendJson(res, 200, { players: room.players || [] });
}

// Room-id-only read of the dice styles map (no token; cosmetic, bearer-capability
// model like the per-player overlay URL). Drives the customize page's current state.
function handleStylesGet(req, res, id) {
  const room = rooms.getRoom(id);
  if (!room) return sendJson(res, 404, { error: 'unknown room' });
  sendJson(res, 200, { styles: room.styles || {}, defaultStyle: room.defaultStyle || null });
}

// Set one player's dice style (or the room default when player=default). Room-id
// capability only: a self-serve player link can't carry the secret publish token,
// and styles are purely cosmetic. Validated, size-capped, and rate-limited.
const STYLES_MAX = 200; // cap distinct per-player styles per room
function handleStylesPost(req, res, id, query) {
  const room = rooms.getRoom(id);
  if (!room) return sendJson(res, 404, { error: 'unknown room' });
  if (!rooms.allowRoll(room)) return sendJson(res, 429, { error: 'rate limited' });
  const player = query.get('player');
  if (!player) return sendJson(res, 400, { error: 'missing ?player=' });

  readBody(req, MAX_BODY, (err, buf) => {
    if (err) return sendJson(res, 400, { error: 'bad body' });
    let parsed;
    try { parsed = JSON.parse(buf.toString('utf8')); }
    catch { return sendJson(res, 400, { error: 'invalid json' }); }
    const style = validateStyle(parsed && parsed.style != null ? parsed.style : parsed);
    if (!style) return sendJson(res, 400, { error: 'invalid style' });

    rooms.touch(room);
    if (player === 'default') {
      room.defaultStyle = style;
    } else {
      if (!/^[\w-]{1,100}$/.test(player)) {
        return sendJson(res, 400, { error: 'invalid player id' });
      }
      if (!room.styles) room.styles = {};
      if (!room.styles[player] && Object.keys(room.styles).length >= STYLES_MAX) {
        return sendJson(res, 507, { error: 'too many styles' });
      }
      room.styles[player] = style;
    }
    rooms.save();
    sendJson(res, 200, { ok: true, style });
  });
}

function handleEvents(req, res, id) {
  const room = rooms.getRoom(id);
  if (!room) return sendJson(res, 404, { error: 'unknown room' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // disable proxy buffering (nginx) for SSE
  });
  res.write('retry: 3000\n\n');

  if (!rooms.addClient(room, res)) {
    res.write('event: error\ndata: room full\n\n');
    return res.end();
  }
  rooms.touch(room);
  console.log(`  ↳ overlay connected to ${id} (${room.clients.size} client(s))`);

  // Replay retained last roll so a late subscriber isn't blank.
  if (room.lastRoll) writeSse(res, JSON.stringify(room.lastRoll), room.lastRoll.id);

  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); } catch {}
  }, 15000);

  const cleanup = () => {
    clearInterval(heartbeat);
    rooms.removeClient(room, res);
  };
  req.on('close', cleanup);
  res.on('error', cleanup);
}

// --- dispatcher -------------------------------------------------------------
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;
  const method = req.method;

  // Request logging: one line per request when the response finishes.
  // /healthz is skipped to keep liveness probes from spamming the log.
  if (pathname !== '/healthz') {
    const started = Date.now();
    res.on('finish', () => {
      console.log(`${new Date().toISOString()} ${clientIp(req)} ${method} ${pathname} → ${res.statusCode} (${Date.now() - started}ms)`);
    });
  }

  if (pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('ok');
  }
  if ((pathname === '/' || pathname === '/index.html') && method === 'GET') {
    return serveLanding(req, res);
  }
  if (pathname === '/rooms' && method === 'POST') {
    return handleCreateRoom(req, res);
  }
  if (pathname === '/roll20-capture.user.js' && method === 'GET') {
    return serveUserscript(req, res);
  }
  // Static overlay assets (plaque art, fonts, dice engine bundle, textures, sounds,
  // dice manifest). Nested paths allowed; serveAsset() guards against traversal.
  const asset = pathname.match(/^\/assets\/(.+)$/);
  if (asset && method === 'GET') {
    return serveAsset(res, decodeURIComponent(asset[1]));
  }
  if (pathname === '/roll20-capture.meta.js' && method === 'GET') {
    return serveUserscriptMeta(req, res);
  }

  // /room/:id/<action>
  const m = pathname.match(/^\/room\/([^/]+)\/(roll|chat|events|overlay|setup|ping|players|styles|customize)$/);
  if (m) {
    const id = decodeURIComponent(m[1]);
    const action = m[2];
    if (action === 'chat' && method === 'POST') return handleChat(req, res, id, url.searchParams);
    if (action === 'roll' && method === 'POST') return handleRoll(req, res, id, url.searchParams);
    if (action === 'players' && method === 'POST') return handlePlayersPost(req, res, id, url.searchParams);
    if (action === 'players' && method === 'GET') return handlePlayersGet(req, res, id);
    if (action === 'styles' && method === 'POST') return handleStylesPost(req, res, id, url.searchParams);
    if (action === 'styles' && method === 'GET') return handleStylesGet(req, res, id);
    if (action === 'events' && method === 'GET') return handleEvents(req, res, id);
    if (action === 'ping' && method === 'GET') {
      // Heartbeat: room-id-only liveness check (no token). 404 tells the userscript
      // its room was lost (server restart / TTL sweep) so it can re-provision.
      const room = rooms.getRoom(id);
      if (!room) return sendJson(res, 404, { error: 'unknown room' });
      rooms.touch(room); // an open capture tab keeps the room from idling out
      return sendJson(res, 200, { ok: true, clients: room.clients.size });
    }
    if (action === 'overlay' && method === 'GET') {
      // overlay reads its room id from the path on the client side
      return serveFile(res, path.join(PUBLIC_DIR, 'overlay.html'));
    }
    if (action === 'setup' && method === 'GET') {
      return serveFile(res, path.join(PUBLIC_DIR, 'setup.html'));
    }
    if (action === 'customize' && method === 'GET') {
      // self-serve dice styling page; reads room id + ?player= on the client side
      return serveFile(res, path.join(PUBLIC_DIR, 'customize.html'));
    }
    return sendJson(res, 405, { error: 'method not allowed' });
  }

  sendJson(res, 404, { error: 'not found' });
});

rooms.startSweeper();
server.listen(PORT, () => {
  console.log(`relay listening on http://localhost:${PORT}`);
});

// Flush persisted state on shutdown so a clean restart keeps rooms.
function shutdown() {
  rooms.flush();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 500).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = server;
