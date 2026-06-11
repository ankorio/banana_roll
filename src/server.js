'use strict';
// HTTP server + routing. Single file until it hurts (~250 lines).
const http = require('http');
const fs = require('fs');
const path = require('path');
const rooms = require('./rooms');

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
};
function serveFile(res, file, headers = {}) {
  fs.readFile(file, (err, data) => {
    if (err) { sendJson(res, 404, { error: 'not found' }); return; }
    const type = STATIC_TYPES[path.extname(file)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, ...headers });
    res.end(data);
  });
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
    isCrit: !!obj.isCrit,
    isFumble: !!obj.isFumble,
    ts: Number.isFinite(obj.ts) ? obj.ts : Date.now(),
  };
  // Optional: which Roll20 player made this roll, so per-player overlays can filter.
  if (typeof obj.playerid === 'string' && obj.playerid) out.playerid = obj.playerid.slice(0, 100);
  return out;
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
  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Roll20 → OBS overlay relay. POST /rooms to begin.');
  }
  if (pathname === '/rooms' && method === 'POST') {
    return handleCreateRoom(req, res);
  }
  if (pathname === '/roll20-capture.user.js' && method === 'GET') {
    return serveUserscript(req, res);
  }
  if (pathname === '/roll20-capture.meta.js' && method === 'GET') {
    return serveUserscriptMeta(req, res);
  }

  // /room/:id/<action>
  const m = pathname.match(/^\/room\/([^/]+)\/(roll|events|overlay|setup)$/);
  if (m) {
    const id = decodeURIComponent(m[1]);
    const action = m[2];
    if (action === 'roll' && method === 'POST') return handleRoll(req, res, id, url.searchParams);
    if (action === 'events' && method === 'GET') return handleEvents(req, res, id);
    if (action === 'overlay' && method === 'GET') {
      // overlay reads its room id from the path on the client side
      return serveFile(res, path.join(PUBLIC_DIR, 'overlay.html'));
    }
    if (action === 'setup' && method === 'GET') {
      return serveFile(res, path.join(PUBLIC_DIR, 'setup.html'));
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
