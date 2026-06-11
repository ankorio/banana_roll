// ==UserScript==
// @name         Roll20 → OBS Overlay Capture
// @namespace    roll20-obs-overlay
// @version      0.3.0
// @description  Capture Roll20 dice rolls from the Firebase transport and POST them to your overlay relay.
// @match        https://app.roll20.net/editor*
// @match        https://app.roll20.net/campaigns/*
// @updateURL    __ORIGIN__/roll20-capture.meta.js
// @downloadURL  __ORIGIN__/roll20-capture.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_openInTab
// @connect      localhost
// @connect      self
// @run-at       document-start
// ==/UserScript==

/* eslint-disable no-undef */
(function () {
  'use strict';

  // We hook Roll20's Firebase Realtime Database transport (a WebSocket to
  // *.firebaseio.com) instead of scraping the chat DOM. The transport carries
  // structured roll JSON for EVERY player (inbound frames), each keyed by a
  // stable Firebase push-id we reuse as the dedup id. To intercept the page's
  // WebSocket constructor we must run at document-start (before Roll20 opens
  // the socket) and operate on the *page* window — under a @grant, `window` is
  // the sandbox, so reach the real page globals via unsafeWindow.
  const PAGE = (typeof unsafeWindow !== 'undefined' && unsafeWindow) || window;

  // Loud, first-thing-that-runs banner so you can confirm injection in DevTools.
  // If you DON'T see this in the Roll20 tab's console, the script isn't matching
  // this URL (check Tampermonkey is enabled + the script is on) — nothing below ran.
  console.log('%c[overlay] userscript v0.3.0 loaded on ' + location.href,
    'background:#ffd24a;color:#000;padding:2px 6px;border-radius:3px;font-weight:700');

  // Only the editor page has live play; bail quietly on the campaign launch page.
  if (!/\/editor/.test(location.pathname)) {
    console.log('[overlay] not the editor page yet — waiting for game to launch');
    return;
  }

  // ── CONFIG ────────────────────────────────────────────────────────────────
  // Point this at your deployed relay. For local testing keep localhost.
  // Must match an @connect entry above (add your domain there for production).
  const SERVER = 'http://localhost:8765';

  const DEBUG = (() => { try { return localStorage.getItem('roll20_overlay_debug') === '1'; } catch { return false; } })();
  const dbg = (...a) => { if (DEBUG) console.debug('[overlay]', ...a); };

  // ── on-page status panel ────────────────────────────────────────────────────
  // A persistent widget so you always see the overlay URL + connection state,
  // even if the setup tab gets popup-blocked. Built lazily once <body> exists
  // (we run at document-start, so the DOM may not be ready yet).
  const ui = (() => {
    let root, dot, statusText, urlInput, lastLine, playersWrap, playersList;
    const pending = { room: null, status: null, roster: null };

    function build() {
      if (root) return true;
      if (!document.body) return false;
      root = document.createElement('div');
      root.style.cssText = [
        'position:fixed', 'bottom:12px', 'right:12px', 'z-index:2147483647',
        'width:300px', 'padding:10px 12px', 'border-radius:10px',
        'background:rgba(18,18,26,0.95)', 'color:#eee', 'font:12px/1.5 system-ui,sans-serif',
        'box-shadow:0 6px 24px rgba(0,0,0,0.5)', 'border:1px solid #333',
      ].join(';');
      root.innerHTML =
        '<div style="display:flex;align-items:center;gap:6px;font-weight:700;margin-bottom:6px">' +
          '<span id="ov-dot" style="width:9px;height:9px;border-radius:50%;background:#f5a623"></span>' +
          '🎲 OBS Overlay' +
          '<span id="ov-status" style="margin-left:auto;font-weight:400;opacity:.7"></span>' +
          '<span id="ov-x" style="cursor:pointer;opacity:.6;padding:0 4px" title="hide">✕</span>' +
        '</div>' +
        '<div style="opacity:.7;margin-bottom:3px">Overlay URL (all players — paste into OBS):</div>' +
        '<div style="display:flex;gap:5px">' +
          '<input id="ov-url" readonly style="flex:1;min-width:0;padding:5px 6px;border-radius:6px;' +
            'border:1px solid #444;background:#0c0c12;color:#ffd24a;font:11px monospace">' +
          '<button id="ov-copy" style="border:0;border-radius:6px;background:#ffd24a;color:#2a2000;' +
            'font-weight:700;cursor:pointer;padding:0 9px">Copy</button>' +
        '</div>' +
        '<div style="display:flex;gap:10px;margin-top:6px">' +
          '<a id="ov-setup" target="_blank" style="color:#7db8ff">Setup page</a>' +
          '<a id="ov-open" target="_blank" style="color:#7db8ff">Open overlay</a>' +
        '</div>' +
        '<div id="ov-players" style="margin-top:8px;display:none">' +
          '<div style="opacity:.7;margin-bottom:3px">Per-player overlays:</div>' +
          '<div id="ov-plist" style="display:flex;flex-direction:column;gap:3px;max-height:170px;overflow:auto"></div>' +
        '</div>' +
        '<div id="ov-last" style="margin-top:6px;opacity:.6">no rolls captured yet</div>';
      (document.body || document.documentElement).appendChild(root);
      dot = root.querySelector('#ov-dot');
      statusText = root.querySelector('#ov-status');
      urlInput = root.querySelector('#ov-url');
      lastLine = root.querySelector('#ov-last');
      playersWrap = root.querySelector('#ov-players');
      playersList = root.querySelector('#ov-plist');
      root.querySelector('#ov-x').onclick = () => root.remove();
      root.querySelector('#ov-copy').onclick = () => copy(urlInput.value, urlInput);
      // Re-apply anything that arrived before <body> existed.
      if (pending.room) api.setRoom(pending.room);
      if (pending.status) api.status(pending.status.text, pending.status.ok);
      if (pending.roster) api.setPlayers(pending.roster.list, pending.roster.room);
      return true;
    }

    function copy(text, selectEl) {
      if (selectEl) { try { selectEl.select(); } catch {} }
      try { document.execCommand('copy'); } catch {}
      try { navigator.clipboard.writeText(text); } catch {}
    }

    const api = {
      setRoom(room) {
        if (!build()) { pending.room = room; return; }
        const overlayUrl = `${SERVER}/room/${room}/overlay`;
        urlInput.value = overlayUrl;
        root.querySelector('#ov-open').href = overlayUrl;
        root.querySelector('#ov-setup').href = `${SERVER}/room/${room}/setup`;
      },
      status(text, ok) {
        if (!build()) { pending.status = { text, ok }; return; }
        statusText.textContent = text;
        dot.style.background = ok === true ? '#3ad17a' : ok === false ? '#ff5050' : '#f5a623';
      },
      lastRoll(roll) {
        if (!build()) return;
        const tag = roll.isCrit ? ' ⭐CRIT' : roll.isFumble ? ' 💀FUMBLE' : '';
        lastLine.textContent = `last: ${roll.who} ${roll.formula} = ${roll.total}${tag}`;
      },
      // list: [{ id, name, color, online }], room: room id for link building
      setPlayers(list, room) {
        if (!build()) { pending.roster = { list, room }; return; }
        if (!list || !list.length || !room) { playersWrap.style.display = 'none'; return; }
        playersWrap.style.display = 'block';
        playersList.textContent = '';
        for (const p of list) {
          const url = `${SERVER}/room/${room}/overlay?player=${encodeURIComponent(p.id)}`;
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:6px';
          const dotSpan = document.createElement('span');
          dotSpan.style.cssText = 'width:8px;height:8px;border-radius:50%;flex:0 0 auto;background:' +
            (p.color || '#888') + (p.online ? ';box-shadow:0 0 0 2px rgba(58,209,122,.5)' : '');
          const link = document.createElement('a');
          link.href = url;
          link.target = '_blank';
          link.textContent = p.name;
          link.title = url;
          link.style.cssText = 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' +
            'color:#cfe0ff;text-decoration:none;opacity:' + (p.online ? '1' : '.45');
          const btn = document.createElement('button');
          btn.textContent = '⧉';
          btn.title = 'copy this player\'s overlay URL';
          btn.style.cssText = 'flex:0 0 auto;border:0;border-radius:5px;background:#2a2a38;color:#cfe0ff;' +
            'cursor:pointer;padding:1px 6px;font-size:12px';
          btn.onclick = () => copy(url);
          row.append(dotSpan, link, btn);
          playersList.appendChild(row);
        }
      },
    };
    return api;
  })();

  // Build the panel as soon as the DOM is usable.
  if (document.body) ui.status('starting…', null);
  else document.addEventListener('DOMContentLoaded', () => ui.status('starting…', null), { once: true });

  // ── room provisioning (self-provision on first run) ────────────────────────
  let CREDS = null;
  const rollBuffer = []; // rolls captured before creds exist; flushed once provisioned

  function getCreds() {
    const room = GM_getValue('room', '');
    const token = GM_getValue('token', '');
    return room && token ? { room, token } : null;
  }

  function onCreds(creds) {
    CREDS = creds;
    ui.setRoom(creds.room);
    ui.status('watching rolls', true);
    renderPlayers(); // links need the room id
    while (rollBuffer.length) postRoll(creds, rollBuffer.shift());
    console.log('[overlay] capturing for room', creds.room, '→ overlay:', `${SERVER}/room/${creds.room}/overlay`);
  }

  function provision() {
    ui.status('creating room…', null);
    GM_xmlhttpRequest({
      method: 'POST',
      url: SERVER + '/rooms',
      headers: { 'Content-Type': 'application/json' },
      data: '{}',
      onload: (resp) => {
        try {
          const r = JSON.parse(resp.responseText);
          if (!r.room || !r.publishToken) throw new Error('bad provision response');
          GM_setValue('room', r.room);
          GM_setValue('token', r.publishToken);
          console.log('[overlay] provisioned room', r.room);
          // Also try to open the setup page (may be popup-blocked — the panel is the fallback).
          try { GM_openInTab(r.setupUrl, { active: true }); } catch {}
          onCreds({ room: r.room, token: r.publishToken });
        } catch (e) {
          console.error('[overlay] provision failed', e, resp.responseText);
          ui.status('provision failed (see console)', false);
        }
      },
      onerror: (e) => {
        console.error('[overlay] provision request error', e);
        ui.status(`can't reach ${SERVER}`, false);
      },
    });
  }

  // ── posting (idempotency handled server-side by id) ─────────────────────────
  function postRoll(creds, roll) {
    GM_xmlhttpRequest({
      method: 'POST',
      url: `${SERVER}/room/${creds.room}/roll?token=${encodeURIComponent(creds.token)}`,
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify(roll),
      onload: (resp) => {
        if (resp.status === 403 || resp.status === 404) {
          // bad token (403) or room gone after a server restart (404) — drop creds
          // so a page reload re-provisions a fresh room.
          console.warn('[overlay] relay returned', resp.status, '- clearing stored room');
          GM_setValue('room', ''); GM_setValue('token', '');
          CREDS = null;
          ui.status('room gone — reload page to reconnect', false);
        } else if (resp.status >= 200 && resp.status < 300) {
          ui.lastRoll(roll);
        }
      },
      onerror: (e) => { console.error('[overlay] post error', e); ui.status('post failed', false); },
    });
  }

  // ── small helpers ────────────────────────────────────────────────────────────
  const clean = (s) => (s ? String(s).replace(/\s+/g, ' ').trim() : '');
  const num = (s) => { const n = Number(s); return Number.isFinite(n) ? n : NaN; };
  function tryParse(text) { try { return JSON.parse(text); } catch { return null; } }

  function isFirebaseUrl(url) {
    return /firebaseio\.com/.test(String(url || ''));
  }
  // Strip auth/token query params before logging a transport URL.
  function safeUrl(url) {
    try {
      const u = new URL(String(url), location.href);
      for (const k of ['auth', 'token', 'access_token', 'key', 'apiKey', 'cred']) u.searchParams.delete(k);
      return u.toString();
    } catch { return String(url || '').replace(/(auth|token|key)=[^&]+/gi, '$1=[REDACTED]'); }
  }

  // Firebase push-ids encode their creation time (ms epoch) in the first 8 chars.
  // We use this to tell a *live* roll from chat history replayed on initial sync.
  const PUSH_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
  function pushIdTime(id) {
    if (typeof id !== 'string' || id.length < 8) return NaN;
    let t = 0;
    for (let i = 0; i < 8; i++) {
      const c = PUSH_CHARS.indexOf(id[i]);
      if (c < 0) return NaN;
      t = t * 64 + c;
    }
    return t;
  }

  const START_TS = Date.now();
  const HISTORY_GRACE_MS = 8000; // rolls older than this at load time are treated as history

  // ── roll extraction (Firebase chat record → overlay roll shape) ──────────────
  const CHAT_TYPES = new Set(['general', 'emote', 'whisper', 'desc', 'rollresult', 'gmrollresult', 'api']);
  // Only public rolls reach the overlay. gmrollresult/whisper are secret; emote/desc/api aren't rolls.
  const POSTABLE = new Set(['rollresult', 'general']);

  function looksLikeMessage(o) {
    if (!o || typeof o !== 'object') return false;
    if (typeof o.type === 'string' && CHAT_TYPES.has(o.type)) return true;
    return typeof o.content === 'string' &&
      (o.inlinerolls || o.rolltemplate || o.origRoll || typeof o.who === 'string');
  }

  const lastSeg = (p) => { const s = String(p || '').replace(/\/+$/, ''); const i = s.lastIndexOf('/'); return i >= 0 ? s.slice(i + 1) : s; };

  // Walk a synced value, yielding { key, msg } for each chat record. Handles both a
  // single record (path .../chat/<key>) and the chat collection map (path .../chat).
  function collectMessages(path, value, out = [], depth = 0) {
    if (depth > 4 || value == null || typeof value !== 'object') return out;
    if (looksLikeMessage(value)) { out.push({ key: lastSeg(path), msg: value }); return out; }
    if (Array.isArray(value)) return out;
    for (const [k, v] of Object.entries(value)) {
      if (k[0] === '.') continue; // .priority / .value firebase metadata
      if (looksLikeMessage(v)) out.push({ key: k, msg: v });
      else if (v && typeof v === 'object') collectMessages(path + '/' + k, v, out, depth + 1);
    }
    return out;
  }

  // Flatten Roll20's nested roll structure into flat dice for the overlay.
  // Segments: type "R" = a die roll (sides + results[].v); type "G" = group of sub-rolls.
  function flattenDice(rolls, out = [], depth = 0) {
    if (!Array.isArray(rolls) || depth > 6) return out;
    for (const seg of rolls) {
      if (!seg || typeof seg !== 'object') continue;
      if (seg.type === 'R' && Array.isArray(seg.results)) {
        const sides = String(seg.sides != null ? seg.sides : '');
        for (const res of seg.results) {
          if (res && res.d) continue; // dropped die (keep-highest/lowest) — not counted
          const v = num(res && res.v);
          out.push({ sides, value: Number.isFinite(v) ? v : null, crit: false, fumble: false });
        }
      } else if (seg.type === 'G' && Array.isArray(seg.rolls)) {
        for (const sub of seg.rolls) flattenDice(sub, out, depth + 1);
      } else if (Array.isArray(seg.rolls)) {
        flattenDice(seg.rolls, out, depth + 1);
      }
    }
    return out;
  }

  function msgTime(key, msg) {
    const fromId = pushIdTime(key);
    if (Number.isFinite(fromId)) return fromId;
    const pr = num(msg && (msg['.priority'] != null ? msg['.priority'] : msg.priority));
    return Number.isFinite(pr) ? pr : NaN;
  }

  // Returns an overlay roll, or null for non-roll / secret / stale-history messages.
  function extractRoll(key, msg) {
    if (!msg || typeof msg !== 'object') return null;
    if (typeof msg.type === 'string' && !POSTABLE.has(msg.type)) return null;

    let total = null, rolls = null, formula = '';
    if (msg.type === 'rollresult' && typeof msg.content === 'string') {
      // Plain /roll — content is the roll JSON ({ type:"V", rolls:[…], total }).
      const parsed = tryParse(msg.content);
      if (!parsed) return null;
      total = num(parsed.total);
      rolls = parsed.rolls;
      formula = clean(msg.origRoll);
    } else if (Array.isArray(msg.inlinerolls) && msg.inlinerolls.length) {
      // Sheet roll template (attack/save/etc) — dice live in inlinerolls[].results.
      const primary = msg.inlinerolls.find((r) => r && r.results && Array.isArray(r.results.rolls)) || msg.inlinerolls[0];
      const r = primary && primary.results;
      if (!r) return null;
      total = num(r.total);
      rolls = r.rolls;
      formula = clean(primary.expression) || clean(msg.origRoll);
    } else {
      return null; // plain chat / emote with no dice
    }

    const dice = flattenDice(rolls, []);
    let isCrit = false, isFumble = false;
    for (const d of dice) {
      if (d.sides === '20') { if (d.value === 20) isCrit = true; if (d.value === 1) isFumble = true; }
    }
    if (isCrit && isFumble) { isCrit = false; isFumble = false; } // mixed nat20+nat1 → neither

    // Drop chat history replayed on initial Firebase sync; keep only live rolls.
    const t = msgTime(key, msg);
    if (Number.isFinite(t) && t < START_TS - HISTORY_GRACE_MS) return null;

    return {
      id: key || ('fb-' + (Number.isFinite(t) ? t : Date.now())),
      who: clean(msg.who) || 'Someone',
      formula,
      total: Number.isFinite(total) ? total : null,
      dice,
      isCrit,
      isFumble,
      playerid: typeof msg.playerid === 'string' ? msg.playerid : undefined,
      ts: Number.isFinite(t) ? t : Date.now(),
    };
  }

  // ── players roster (online presence → per-player overlay links) ──────────────
  const roster = new Map(); // playerid -> { id, name, color, online }

  function playerFrom(pid, rec) {
    return {
      id: pid,
      name: clean(rec.displayname) || clean(rec.who) || 'Player',
      color: typeof rec.color === 'string' ? rec.color : '#888',
      online: !!rec.online,
    };
  }

  function renderPlayers() {
    const list = Array.from(roster.values())
      .sort((a, b) => (Number(b.online) - Number(a.online)) || a.name.localeCompare(b.name));
    ui.setPlayers(list, CREDS && CREDS.room);
  }

  // Update the roster from any synced value whose path is the /players node.
  function collectPlayers(path, value) {
    const p = String(path || '');
    if (!/\/players(\/|$)/.test(p)) return;
    const after = p.split('/players/')[1]; // undefined => the /players collection itself
    let changed = false;

    if (after === undefined || after === '') {
      // Full snapshot: map of playerid -> record. Rebuild the roster.
      if (!value || typeof value !== 'object') return;
      roster.clear();
      for (const [pid, rec] of Object.entries(value)) {
        if (pid[0] === '.' || !rec || typeof rec !== 'object') continue;
        roster.set(pid, playerFrom(pid, rec));
      }
      changed = true;
    } else {
      const segs = after.split('/');
      const pid = segs[0];
      if (segs.length === 1) {
        if (value && typeof value === 'object') { roster.set(pid, playerFrom(pid, value)); changed = true; }
        else if (value === null) { changed = roster.delete(pid); }
      } else if (roster.has(pid)) {
        // Single-field update, e.g. .../players/<pid>/online.
        const cur = roster.get(pid);
        if (segs[1] === 'online') cur.online = !!value;
        else if (segs[1] === 'displayname') cur.name = clean(value) || cur.name;
        else if (segs[1] === 'color' && typeof value === 'string') cur.color = value;
        changed = true;
      }
    }
    if (changed) renderPlayers();
  }

  // ── the single capture pipeline ──────────────────────────────────────────────
  const localSeen = new Set(); // avoid re-posting the same roll within this tab

  function onFirebaseData(path, value) {
    try {
      for (const { key, msg } of collectMessages(path, value)) {
        const roll = extractRoll(key, msg);
        if (!roll || localSeen.has(roll.id)) continue;
        localSeen.add(roll.id);
        if (localSeen.size > 2000) localSeen.clear(); // crude bound for marathon sessions
        dbg('roll', roll.who, roll.formula, '=', roll.total);
        if (CREDS) postRoll(CREDS, roll);
        else { rollBuffer.push(roll); if (rollBuffer.length > 50) rollBuffer.shift(); }
      }
    } catch (e) { dbg('message handling failed', e); }
    try { collectPlayers(path, value); } catch (e) { dbg('player handling failed', e); }
  }

  // Unwrap a Firebase Realtime transport frame and feed its { path, data } payload
  // to the pipeline. Both inbound server pushes (a:"d"/"m") and outbound client
  // writes (a:"p") carry their payload under d.b = { p: path, d: data }.
  function inspectTransportFrame(text) {
    if (typeof text !== 'string') return;
    const parsed = tryParse(text);
    const body = parsed && parsed.d && parsed.d.b;
    if (!body || body.p == null || !Object.prototype.hasOwnProperty.call(body, 'd')) return;
    onFirebaseData(body.p, body.d);
  }

  // ── WebSocket hook — Roll20's Firebase transport ─────────────────────────────
  function installWebSocketHook() {
    const Native = PAGE.WebSocket;
    if (!Native) return;

    function Hooked(url, protocols) {
      const ws = protocols !== undefined ? new Native(url, protocols) : new Native(url);
      if (isFirebaseUrl(url)) {
        console.log('[overlay] hooked Firebase socket:', safeUrl(url));
        ws.addEventListener('message', (ev) => inspectTransportFrame(ev.data));
        const nativeSend = ws.send;
        ws.send = function (data) {
          if (typeof data === 'string') inspectTransportFrame(data); // our own outbound rolls
          return nativeSend.call(this, data);
        };
      }
      return ws;
    }
    Hooked.prototype = Native.prototype;
    for (const k of ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']) {
      try { Object.defineProperty(Hooked, k, { value: Native[k], configurable: true }); } catch {}
    }
    PAGE.WebSocket = Hooked;
    console.log('[overlay] WebSocket hook installed');
  }

  // ── Firebase SDK hook — clean snapshots (chiefly the players roster) ─────────
  // Roll20 syncs the players list via firebase .ref('…/players').on('value'); wrapping
  // that callback gives us full presence snapshots (incl. online toggles) already parsed.
  let SDK_HOOKED = false;
  function hookFirebaseSdkOnce() {
    if (SDK_HOOKED) return true;
    const fb = PAGE.firebase;
    if (!fb || typeof fb.database !== 'function') return false;

    let ref;
    try { ref = fb.database().ref('/'); } catch { return false; }
    const proto = ref && Object.getPrototypeOf(ref);
    if (!proto || typeof proto.on !== 'function' || proto.on.__ovHooked) {
      SDK_HOOKED = !!(proto && proto.on && proto.on.__ovHooked);
      return SDK_HOOKED;
    }

    const originalOn = proto.on;
    proto.on = function (eventType, callback, cancel, context) {
      const wrapped = typeof callback === 'function'
        ? function (snapshot, prevChild) {
            try {
              const val = snapshot && typeof snapshot.val === 'function' ? snapshot.val() : undefined;
              let p = '';
              try { p = snapshot && snapshot.ref ? String(snapshot.ref) : String(this); } catch {}
              onFirebaseData(p, val);
            } catch (e) { dbg('sdk callback failed', e); }
            return callback.apply(this, arguments);
          }
        : callback;
      return originalOn.call(this, eventType, wrapped, cancel, context);
    };
    proto.on.__ovHooked = true;
    SDK_HOOKED = true;
    console.log('[overlay] Firebase SDK hook installed');
    return true;
  }

  function startFirebaseSdkHooker() {
    if (hookFirebaseSdkOnce()) return;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (hookFirebaseSdkOnce() || Date.now() - startedAt > 30000) clearInterval(timer);
    }, 150);
  }

  // ── boot ────────────────────────────────────────────────────────────────────
  try {
    installWebSocketHook();   // must win the race against Roll20 opening its socket
    startFirebaseSdkHooker(); // polls until window.firebase exists
  } catch (e) {
    console.error('[overlay] hook install failed', e);
  }

  try {
    const creds = getCreds();
    console.log('[overlay] stored creds:', creds ? creds.room : '(none, will provision)');
    if (creds) onCreds(creds);
    else provision();
  } catch (e) {
    console.error('[overlay] boot failed', e);
    try { ui.status('boot error (see console)', false); } catch {}
  }
})();
