'use strict';
// Room store: id/token minting, dedup, TTL sweep, rate limiting, and the
// per-instance SSE client registry.
//
// State model:
//  - The in-memory `rooms` Map is the live working set on THIS instance. It holds
//    each room's durable fields PLUS process-local things that can never be shared
//    across instances (the Set of SSE client responses, the rate-limit buckets).
//  - Durable / cross-instance state is mirrored to a pluggable backend, chosen at
//    boot from the environment:
//      * REDIS_URL  -> Redis backend: per-room keys (TTL) + pub/sub fan-out, so
//                      multiple instances stay in sync AND a roll posted to one
//                      instance reaches the SSE clients of every other instance.
//                      This is the broker the architecture notes anticipated for
//                      ">1 server instance". Local-first: if Redis is unreachable,
//                      the instance still serves its own clients.
//      * STATE_FILE -> JSON-file backend (single instance; handy for local dev).
//      * neither    -> pure in-memory (no persistence).
const crypto = require('crypto');
const fs = require('fs');

// --- knobs (env-overridable) ------------------------------------------------
const ROOM_TTL = intEnv('ROOM_TTL', 1000 * 60 * 60 * 6);        // 6h idle -> room dropped
const SWEEP_INTERVAL = intEnv('SWEEP_INTERVAL', 1000 * 60);     // sweep every 60s
const MAX_ROOMS = intEnv('MAX_ROOMS', 5000);                    // global room cap
const SEEN_MAX = intEnv('SEEN_MAX', 500);                       // bounded dedup set per room
const CLIENTS_MAX = intEnv('CLIENTS_MAX', 50);                  // SSE clients per room

const CREATE_RATE_WINDOW = intEnv('CREATE_RATE_WINDOW', 1000 * 60); // per-IP /rooms window
const CREATE_RATE_MAX = intEnv('CREATE_RATE_MAX', 10);             // creates per window per IP

const ROLL_RATE_WINDOW = intEnv('ROLL_RATE_WINDOW', 1000);     // per-room roll window
const ROLL_RATE_MAX = intEnv('ROLL_RATE_MAX', 20);             // rolls per window per room

function intEnv(name, dflt) {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) ? v : dflt;
}

// --- state ------------------------------------------------------------------
const rooms = new Map();        // id -> room record
const createHits = new Map();   // ip -> [timestamps] (sliding window)
const INSTANCE_ID = crypto.randomBytes(8).toString('hex'); // tags pub/sub msgs so we skip our own echo
let remoteRollHandler = null;   // set by server.js: (room, roll) => broadcast to this instance's clients

function token() {
  return crypto.randomBytes(16).toString('base64url'); // 128-bit, URL-safe
}

// --- (de)serialization shared by every backend ------------------------------
// Only the durable fields cross the persistence boundary; ephemeral per-instance
// state (clients/seen/rollHits) is reconstructed empty on hydrate.
function serializeRoom(r) {
  return {
    id: r.id, publishToken: r.publishToken, lastRoll: r.lastRoll,
    styles: r.styles, defaultStyle: r.defaultStyle, players: r.players,
    seenOrder: r.seenOrder, createdAt: r.createdAt, lastActivity: r.lastActivity,
  };
}
function hydrate(d) {
  return {
    id: d.id, publishToken: d.publishToken, lastRoll: d.lastRoll || null,
    players: d.players || [], styles: d.styles || {}, defaultStyle: d.defaultStyle || null,
    clients: new Set(), seen: new Set(d.seenOrder || []), seenOrder: d.seenOrder || [],
    rollHits: [], createdAt: d.createdAt || Date.now(), lastActivity: d.lastActivity || Date.now(),
  };
}

// --- room lifecycle ---------------------------------------------------------
async function createRoom() {
  if (rooms.size >= MAX_ROOMS) {
    const err = new Error('room capacity reached');
    err.code = 'CAPACITY';
    throw err;
  }
  const id = token();
  const publishToken = token();
  const now = Date.now();
  const room = {
    id,
    publishToken,
    lastRoll: null,
    players: [],              // roster pushed by the userscript (for per-player links)
    styles: {},               // playerid -> dice style (set via the customize page)
    defaultStyle: null,       // fallback style for players with no entry / all-players overlay
    clients: new Set(),       // Set<ServerResponse> (per-instance, never persisted)
    seen: new Set(),          // bounded set of message ids
    seenOrder: [],            // FIFO order for bounding `seen`
    rollHits: [],             // timestamps for per-room roll rate limit (per-instance)
    createdAt: now,
    lastActivity: now,
  };
  rooms.set(id, room);
  // Await the first write so a follow-up request landing on another instance (or a
  // restart) sees the room. Later writes are fire-and-forget.
  await backend.persistRoom(room);
  return { id, publishToken };
}

function getRoom(id) {
  return rooms.get(id) || null;
}

function touch(room) {
  room.lastActivity = Date.now();
  backend.refreshTtl(room); // throttled inside the backend
}

// --- dedup ------------------------------------------------------------------
// Returns true if this id is new (and records it); false if already seen.
function markSeen(room, msgId) {
  if (room.seen.has(msgId)) return false;
  room.seen.add(msgId);
  room.seenOrder.push(msgId);
  while (room.seenOrder.length > SEEN_MAX) {
    room.seen.delete(room.seenOrder.shift());
  }
  return true;
}

// --- rate limits ------------------------------------------------------------
function slidingAllow(arr, windowMs, max) {
  const now = Date.now();
  const cutoff = now - windowMs;
  // drop expired from the front
  while (arr.length && arr[0] < cutoff) arr.shift();
  if (arr.length >= max) return false;
  arr.push(now);
  return true;
}

function allowCreate(ip) {
  let arr = createHits.get(ip);
  if (!arr) { arr = []; createHits.set(ip, arr); }
  return slidingAllow(arr, CREATE_RATE_WINDOW, CREATE_RATE_MAX);
}

function allowRoll(room) {
  return slidingAllow(room.rollHits, ROLL_RATE_WINDOW, ROLL_RATE_MAX);
}

// --- SSE client bookkeeping (always per-instance) ---------------------------
function addClient(room, res) {
  if (room.clients.size >= CLIENTS_MAX) return false;
  room.clients.add(res);
  return true;
}

function removeClient(room, res) {
  room.clients.delete(res);
}

// --- TTL sweeper ------------------------------------------------------------
// Per-instance: frees idle rooms from THIS process's memory. With the Redis
// backend, Redis key TTL is the durable expiry; pub/sub activity from other
// instances refreshes lastActivity here, so a room that's busy elsewhere is not
// swept locally.
let sweepTimer = null;
function startSweeper() {
  if (sweepTimer) return;
  sweepTimer = setInterval(() => {
    const cutoff = Date.now() - ROOM_TTL;
    for (const [id, room] of rooms) {
      if (room.lastActivity < cutoff) {
        for (const res of room.clients) { try { res.end(); } catch {} }
        rooms.delete(id);
      }
    }
    // prune empty per-IP create buckets so the map doesn't grow forever
    for (const [ip, arr] of createHits) {
      if (!arr.length) createHits.delete(ip);
    }
  }, SWEEP_INTERVAL);
  if (sweepTimer.unref) sweepTimer.unref(); // don't keep process alive for the sweeper
}

function stopSweeper() {
  if (sweepTimer) { clearInterval(sweepTimer); sweepTimer = null; }
}

// --- cross-instance sync helper ---------------------------------------------
// Merge a room snapshot received from another instance into the local Map,
// preserving this instance's ephemeral fields (its own SSE clients, dedup set,
// rate-limit bucket). Bumps lastActivity so an elsewhere-busy room survives the
// local sweep.
function upsertFromRemote(d) {
  if (!d || !d.id) return;
  const existing = rooms.get(d.id);
  if (existing) {
    existing.publishToken = d.publishToken;
    if (d.lastRoll) existing.lastRoll = d.lastRoll;
    existing.styles = d.styles || {};
    existing.defaultStyle = d.defaultStyle || null;
    if (d.players) existing.players = d.players;
    existing.lastActivity = Date.now();
  } else {
    rooms.set(d.id, hydrate(d));
  }
}

// --- persistence backends ---------------------------------------------------
// Each backend implements: init(), persistRoom(room), persistRoll(room, roll),
// refreshTtl(room), flush(), close(). persistRoll persists the room AND fans the
// roll out to other instances (a no-op beyond persistence when there's no broker).

function nullBackend() {
  return {
    async init() {},
    persistRoom() {}, persistRoll() {}, refreshTtl() {},
    flush() {}, async close() {},
  };
}

// JSON file: single instance. Debounced async writes coalesce bursts of rolls
// into one disk write; sync flush on shutdown. No cross-instance fan-out.
function fileBackend(STATE_FILE) {
  let saveTimer = null;
  let dirty = false;
  function serialize() {
    const out = [];
    for (const r of rooms.values()) out.push(serializeRoom(r));
    return JSON.stringify({ v: 1, rooms: out });
  }
  function save() {
    dirty = true;
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      if (!dirty) return;
      dirty = false;
      fs.writeFile(STATE_FILE, serialize(), (e) => {
        if (e) console.error('[state] save failed:', e.message);
      });
    }, 500);
    if (saveTimer.unref) saveTimer.unref();
  }
  return {
    async init() {
      if (!fs.existsSync(STATE_FILE)) return;
      try {
        const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        for (const r of (data.rooms || [])) rooms.set(r.id, hydrate(r));
        console.log(`[state] loaded ${rooms.size} room(s) from ${STATE_FILE}`);
      } catch (e) {
        console.error('[state] load failed:', e.message);
      }
    },
    persistRoom() { save(); },
    persistRoll() { save(); },
    refreshTtl() { save(); },
    flush() {
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
      try { fs.writeFileSync(STATE_FILE, serialize()); }
      catch (e) { console.error('[state] flush failed:', e.message); }
    },
    async close() {},
  };
}

// Redis: durable per-room keys + pub/sub fan-out across instances.
function redisBackend(url) {
  const Redis = require('ioredis');
  // Default offline queue (enableOfflineQueue: true) so the boot-time subscribe +
  // warm-load issued before the socket is ready are queued until 'connected'
  // rather than rejected. maxRetriesPerRequest bounds hangs if Redis goes away.
  const opts = { maxRetriesPerRequest: 3 };
  const redis = new Redis(url, opts);     // commands
  const sub = new Redis(url, opts);       // dedicated subscriber connection
  const KEY = (id) => `br:room:${id}`;
  const TTL = Math.max(1, Math.round(ROOM_TTL / 1000)); // seconds
  const CH_ROLL = 'br:roll';
  const CH_ROOM = 'br:room';

  let warned = false;
  const onErr = (e) => { if (!warned) { warned = true; console.error('[redis] error:', e.message); } };
  redis.on('error', onErr);
  sub.on('error', onErr);
  redis.on('ready', () => { warned = false; console.log('[redis] connected'); });

  async function write(room) {
    await redis.set(KEY(room.id), JSON.stringify(serializeRoom(room)), 'EX', TTL);
  }

  return {
    async init() {
      // Subscribe FIRST so we don't miss create/update events during the initial load.
      try {
        await sub.subscribe(CH_ROLL, CH_ROOM);
        sub.on('message', (ch, payload) => {
          let msg;
          try { msg = JSON.parse(payload); } catch { return; }
          if (msg.i === INSTANCE_ID) return; // our own echo — already applied locally
          if (ch === CH_ROOM) {
            upsertFromRemote(msg.room);
          } else if (ch === CH_ROLL) {
            const room = rooms.get(msg.id);
            if (room) {
              room.lastRoll = msg.roll;
              room.lastActivity = Date.now();
              if (remoteRollHandler) remoteRollHandler(room, msg.roll);
            }
          }
        });
      } catch (e) { onErr(e); }
      // Warm the local cache with every known room.
      try {
        let cursor = '0';
        do {
          const [next, keys] = await redis.scan(cursor, 'MATCH', 'br:room:*', 'COUNT', 200);
          cursor = next;
          if (keys.length) {
            const vals = await redis.mget(keys);
            for (const v of vals) {
              if (!v) continue;
              try { upsertFromRemote(JSON.parse(v)); } catch {}
            }
          }
        } while (cursor !== '0');
        console.log(`[redis] loaded ${rooms.size} room(s)`);
      } catch (e) { onErr(e); }
    },
    async persistRoom(room) {
      try {
        await write(room);
        await redis.publish(CH_ROOM, JSON.stringify({ i: INSTANCE_ID, room: serializeRoom(room) }));
      } catch (e) { onErr(e); }
    },
    async persistRoll(room, roll) {
      // The local broadcast already happened in server.js; here we persist the new
      // retained roll and fan it out to OTHER instances' SSE clients.
      try {
        await write(room);
        await redis.publish(CH_ROLL, JSON.stringify({ i: INSTANCE_ID, id: room.id, roll }));
      } catch (e) { onErr(e); }
    },
    refreshTtl(room) {
      // Throttle: at most once per 30s per room (touch/ping is hot).
      const now = Date.now();
      if (room._ttlAt && now - room._ttlAt < 30000) return;
      room._ttlAt = now;
      redis.expire(KEY(room.id), TTL).catch(onErr);
    },
    flush() {},
    async close() {
      try { await redis.quit(); } catch {}
      try { await sub.quit(); } catch {}
    },
  };
}

function makeBackend() {
  const url = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL || '';
  if (url) { console.log('[state] backend: redis'); return redisBackend(url); }
  if (process.env.STATE_FILE) { console.log('[state] backend: file'); return fileBackend(process.env.STATE_FILE); }
  return nullBackend();
}

const backend = makeBackend();

// --- public API (thin wrappers over the chosen backend) ---------------------
function persist(room) { return backend.persistRoom(room); }
function persistRoll(room, roll) { return backend.persistRoll(room, roll); }
function onRemoteRoll(fn) { remoteRollHandler = fn; }
function init() { return backend.init(); }
function flush() { return backend.flush(); }
function close() { return backend.close(); }

module.exports = {
  createRoom, getRoom, touch,
  markSeen,
  allowCreate, allowRoll,
  addClient, removeClient,
  startSweeper, stopSweeper,
  persist, persistRoll, onRemoteRoll,
  init, flush, close,
  _rooms: rooms, // exposed for tests
  limits: { SEEN_MAX, CLIENTS_MAX, MAX_ROOMS, ROOM_TTL },
};
