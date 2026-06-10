'use strict';
// In-memory room store: id/token minting, dedup, TTL sweep, rate limiting.
// Single instance only — losing this process loses all state (by design).
const crypto = require('crypto');

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

function token() {
  return crypto.randomBytes(16).toString('base64url'); // 128-bit, URL-safe
}

// --- room lifecycle ---------------------------------------------------------
function createRoom() {
  if (rooms.size >= MAX_ROOMS) {
    const err = new Error('room capacity reached');
    err.code = 'CAPACITY';
    throw err;
  }
  const id = token();
  const publishToken = token();
  const now = Date.now();
  rooms.set(id, {
    id,
    publishToken,
    lastRoll: null,
    clients: new Set(),       // Set<ServerResponse>
    seen: new Set(),          // bounded set of message ids
    seenOrder: [],            // FIFO order for bounding `seen`
    rollHits: [],             // timestamps for per-room roll rate limit
    createdAt: now,
    lastActivity: now,
  });
  return { id, publishToken };
}

function getRoom(id) {
  return rooms.get(id) || null;
}

function touch(room) {
  room.lastActivity = Date.now();
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

// --- SSE client bookkeeping -------------------------------------------------
function addClient(room, res) {
  if (room.clients.size >= CLIENTS_MAX) return false;
  room.clients.add(res);
  return true;
}

function removeClient(room, res) {
  room.clients.delete(res);
}

// --- TTL sweeper ------------------------------------------------------------
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

module.exports = {
  createRoom, getRoom, touch,
  markSeen,
  allowCreate, allowRoll,
  addClient, removeClient,
  startSweeper, stopSweeper,
  _rooms: rooms, // exposed for tests
  limits: { SEEN_MAX, CLIENTS_MAX, MAX_ROOMS, ROOM_TTL },
};
