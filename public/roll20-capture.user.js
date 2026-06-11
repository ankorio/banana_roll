// ==UserScript==
// @name         Roll20 → OBS Overlay Capture
// @namespace    roll20-obs-overlay
// @version      0.7.0
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
// @noframes
// ==/UserScript==

/* eslint-disable no-undef */
(function () {
  'use strict';

  // Run only in the top-level Roll20 tab. Roll20 renders each open character sheet
  // in its own same-origin <iframe> (name="iframe_<charid>"); without this guard
  // Tampermonkey injects this whole script into every sheet too, so each one builds
  // its own OBS Overlay panel and installs a duplicate set of hooks. @noframes above
  // is the declarative form of this; the runtime check is the belt-and-suspenders.
  try { if (window.top !== window.self) return; } catch { return; }

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
  console.log('%c[overlay] userscript v0.7.0 loaded on ' + location.href,
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
    let root, dot, statusText, urlInput, lastLine, playersWrap, playersList, bodyEl, titleEl, minBtn;
    const pending = { room: null, status: null, roster: null };
    // Persisted collapsed state: minimized shows just the 🎲 icon + status dot.
    let collapsed = (() => { try { return GM_getValue('panel_collapsed', '') === '1'; } catch { return false; } })();

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
        '<div id="ov-head" style="display:flex;align-items:center;gap:6px;font-weight:700;cursor:move;user-select:none">' +
          '<span id="ov-dot" style="flex:0 0 auto;width:9px;height:9px;border-radius:50%;background:#f5a623"></span>' +
          '<span id="ov-icon" style="cursor:pointer" title="expand / minimize">🎲</span>' +
          '<span id="ov-title">OBS Overlay</span>' +
          '<span id="ov-status" style="margin-left:auto;font-weight:400;opacity:.7"></span>' +
          '<span id="ov-min" style="cursor:pointer;opacity:.6;padding:0 4px;font-weight:700" title="minimize">–</span>' +
          '<span id="ov-x" style="cursor:pointer;opacity:.6;padding:0 4px" title="hide">✕</span>' +
        '</div>' +
        '<div id="ov-body">' +
          '<div style="opacity:.7;margin:6px 0 3px">Overlay URL (all players — paste into OBS):</div>' +
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
          '<div id="ov-last" style="margin-top:6px;opacity:.6">no rolls captured yet</div>' +
        '</div>';
      (document.body || document.documentElement).appendChild(root);
      dot = root.querySelector('#ov-dot');
      statusText = root.querySelector('#ov-status');
      urlInput = root.querySelector('#ov-url');
      lastLine = root.querySelector('#ov-last');
      playersWrap = root.querySelector('#ov-players');
      playersList = root.querySelector('#ov-plist');
      bodyEl = root.querySelector('#ov-body');
      titleEl = root.querySelector('#ov-title');
      minBtn = root.querySelector('#ov-min');
      root.querySelector('#ov-x').onclick = () => root.remove();
      root.querySelector('#ov-copy').onclick = () => copy(urlInput.value, urlInput);
      minBtn.onclick = () => setCollapsed(!collapsed);
      root.querySelector('#ov-icon').onclick = () => setCollapsed(!collapsed);
      makeDraggable(root, root.querySelector('#ov-head'));
      applyCollapsed();
      // Re-apply anything that arrived before <body> existed.
      if (pending.room) api.setRoom(pending.room);
      if (pending.status) api.status(pending.status.text, pending.status.ok);
      if (pending.roster) api.setPlayers(pending.roster.list, pending.roster.room);
      return true;
    }

    // Minimized = just the dice icon + the colored status dot. Everything else
    // (body, title, status text, the minimize/close buttons) is hidden; clicking
    // the dice icon expands again.
    function applyCollapsed() {
      if (!root) return;
      const hide = collapsed ? 'none' : '';
      bodyEl.style.display = hide;
      titleEl.style.display = hide;
      statusText.style.display = hide;
      minBtn.style.display = hide;
      root.querySelector('#ov-x').style.display = hide;
      root.style.width = collapsed ? 'auto' : '300px';
      root.style.padding = collapsed ? '6px 9px' : '10px 12px';
      root.querySelector('#ov-icon').title = collapsed ? 'expand' : 'minimize';
    }
    function setCollapsed(v) {
      collapsed = v;
      try { GM_setValue('panel_collapsed', v ? '1' : '0'); } catch {}
      applyCollapsed();
    }

    // Drag the panel by its header. We render with position:fixed at a max z-index
    // so it floats above every Roll20 element; dragging just rewrites left/top
    // (switching off the initial bottom/right anchor on first grab).
    function makeDraggable(el, handle) {
      let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;
      const onMove = (e) => {
        if (!dragging) return;
        const nx = Math.max(0, Math.min(window.innerWidth - 40, ox + e.clientX - sx));
        const ny = Math.max(0, Math.min(window.innerHeight - 20, oy + e.clientY - sy));
        el.style.left = nx + 'px';
        el.style.top = ny + 'px';
      };
      const onUp = () => {
        dragging = false;
        document.removeEventListener('mousemove', onMove, true);
        document.removeEventListener('mouseup', onUp, true);
      };
      const noDrag = new Set(['ov-x', 'ov-min', 'ov-icon']);
      handle.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || (e.target && noDrag.has(e.target.id))) return;
        const r = el.getBoundingClientRect();
        el.style.left = r.left + 'px';
        el.style.top = r.top + 'px';
        el.style.right = 'auto';
        el.style.bottom = 'auto';
        ox = r.left; oy = r.top; sx = e.clientX; sy = e.clientY;
        dragging = true;
        e.preventDefault();
        document.addEventListener('mousemove', onMove, true);
        document.addEventListener('mouseup', onUp, true);
      });
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
  const chatBuffer = []; // chat records captured before creds exist; flushed once provisioned

  function getCreds() {
    const room = GM_getValue('room', '');
    const token = GM_getValue('token', '');
    return room && token ? { room, token } : null;
  }

  let provisioning = false;       // guard so concurrent 404s don't spawn many rooms
  let openedSetupTab = false;     // only auto-open the setup tab on the very first provision

  function onCreds(creds) {
    CREDS = creds;
    ui.setRoom(creds.room);
    ui.status('watching rolls', true);
    renderPlayers(); // links need the room id
    while (chatBuffer.length) postChat(creds, chatBuffer.shift());
    startHeartbeat();
    console.log('[overlay] capturing for room', creds.room, '→ overlay:', `${SERVER}/room/${creds.room}/overlay`);
  }

  function provision() {
    if (provisioning) return;
    provisioning = true;
    ui.status('creating room…', null);
    GM_xmlhttpRequest({
      method: 'POST',
      url: SERVER + '/rooms',
      headers: { 'Content-Type': 'application/json' },
      data: '{}',
      onload: (resp) => {
        provisioning = false;
        try {
          const r = JSON.parse(resp.responseText);
          if (!r.room || !r.publishToken) throw new Error('bad provision response');
          GM_setValue('room', r.room);
          GM_setValue('token', r.publishToken);
          console.log('[overlay] provisioned room', r.room);
          // Open the setup page once (may be popup-blocked — the panel is the fallback).
          // Skip on re-provision so a server restart doesn't keep spawning tabs.
          if (!openedSetupTab) { openedSetupTab = true; try { GM_openInTab(r.setupUrl, { active: true }); } catch {} }
          onCreds({ room: r.room, token: r.publishToken });
        } catch (e) {
          console.error('[overlay] provision failed', e, resp.responseText);
          ui.status('provision failed (see console)', false);
        }
      },
      onerror: (e) => {
        provisioning = false;
        console.error('[overlay] provision request error', e);
        ui.status(`can't reach ${SERVER}`, false);
      },
    });
  }

  // ── heartbeat ────────────────────────────────────────────────────────────────
  // The relay holds rooms in memory, so a server restart (or TTL sweep) silently
  // drops ours and every roll then 404s. Poll a token-free liveness endpoint so we
  // notice and auto-re-provision a fresh room — no more manual CTRL+F5. The new
  // room means a new overlay URL (shown in the panel); set STATE_FILE on the relay
  // if you want URLs to survive restarts instead.
  let heartbeatTimer = null;
  const HEARTBEAT_MS = 10000;

  function reprovision(reason) {
    console.warn('[overlay] room lost (' + reason + ') — re-provisioning');
    GM_setValue('room', ''); GM_setValue('token', '');
    CREDS = null;
    ui.status('reconnecting…', null);
    provision();
  }

  function startHeartbeat() {
    if (heartbeatTimer) return;
    heartbeatTimer = setInterval(() => {
      if (!CREDS || provisioning) return;
      const room = CREDS.room;
      GM_xmlhttpRequest({
        method: 'GET',
        url: `${SERVER}/room/${room}/ping`,
        onload: (resp) => {
          if (CREDS && CREDS.room !== room) return; // creds changed mid-flight
          if (resp.status === 404) reprovision('heartbeat 404');
          else if (resp.status >= 200 && resp.status < 300) ui.status('watching rolls', true);
          else ui.status('relay error ' + resp.status, false);
        },
        onerror: () => { ui.status(`can't reach ${SERVER}`, false); },
      });
    }, HEARTBEAT_MS);
  }

  // ── posting (raw chat record → server parses; dedup server-side by id) ──────────
  function postChat(creds, record) {
    const sentAt = Date.now();
    GM_xmlhttpRequest({
      method: 'POST',
      url: `${SERVER}/room/${creds.room}/chat?token=${encodeURIComponent(creds.token)}`,
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify(record),
      onload: (resp) => {
        dbg(`POST ${record.id} → ${resp.status} in ${Date.now() - sentAt}ms`);
        if (resp.status === 403 || resp.status === 404) {
          // bad token (403) or room gone after a server restart (404). Re-queue this
          // record and auto-re-provision a fresh room so it lands without a reload.
          chatBuffer.push(record);
          if (chatBuffer.length > 50) chatBuffer.shift();
          reprovision('chat ' + resp.status);
        } else if (resp.status >= 200 && resp.status < 300) {
          // Server echoes the parsed roll (or null if the record wasn't a roll) — use
          // it for the panel's "last roll" line so the client still shows nothing local.
          const roll = (() => { try { return JSON.parse(resp.responseText).roll; } catch { return null; } })();
          if (roll) {
            console.log(`[overlay]   ↳ parsed ${roll.who} ${roll.formula}=${roll.total} · firebase→relayed ${Date.now() - record.ts}ms`);
            ui.lastRoll(roll);
          }
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

  // ── chat record detection ────────────────────────────────────────────────────
  // The client no longer parses rolls — it relays raw chat records and the server
  // (parser.js) decides what's a roll. We only need to (a) recognize a chat record in
  // the Firebase tree and (b) never relay SECRET types, so private rolls never leave
  // the Roll20 page.
  const CHAT_TYPES = new Set(['general', 'emote', 'whisper', 'desc', 'rollresult', 'gmrollresult', 'api']);
  const SECRET_TYPES = new Set(['whisper', 'gmrollresult']);

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

  function msgTime(key, msg) {
    const fromId = pushIdTime(key);
    if (Number.isFinite(fromId)) return fromId;
    const pr = num(msg && (msg['.priority'] != null ? msg['.priority'] : msg.priority));
    return Number.isFinite(pr) ? pr : NaN;
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
    syncPlayers(list);
  }

  // Push the roster to the relay (debounced) so the setup page can list per-player
  // overlay links. Presence toggles can burst, so coalesce into one POST.
  let playersTimer = null, lastPlayersJson = '';
  function syncPlayers(list) {
    if (!CREDS) return;
    const payload = JSON.stringify(list.map((p) => ({ id: p.id, name: p.name, color: p.color, online: p.online })));
    if (payload === lastPlayersJson) return; // nothing changed
    if (playersTimer) return;
    playersTimer = setTimeout(() => {
      playersTimer = null;
      if (!CREDS) return;
      lastPlayersJson = payload;
      GM_xmlhttpRequest({
        method: 'POST',
        url: `${SERVER}/room/${CREDS.room}/players?token=${encodeURIComponent(CREDS.token)}`,
        headers: { 'Content-Type': 'application/json' },
        data: payload,
        onerror: () => { lastPlayersJson = ''; }, // allow a retry on the next change
      });
    }, 500);
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

  // ── character portraits (per-character token image for the overlay) ──────────
  // The roll's profile image isn't in the chat record, so we index Roll20's
  // /characters node (snapshotted on sync, same WS frames as chat/players) and
  // resolve each roll to its character's token image — preferring the default
  // token (personalised per character) and falling back to the bio avatar.
  const charById = new Map();   // characterid       -> img url
  const charByName = new Map(); // lowercased name   -> img url

  function normImg(src) {
    if (typeof src !== 'string') return '';
    let s = src.trim();
    if (!s) return '';
    if (s.startsWith('//')) s = 'https:' + s;
    return /^https?:\/\//.test(s) ? s : '';
  }
  function characterImg(rec) {
    // Default token first (each character personalises it), then the avatar image.
    if (typeof rec.defaulttoken === 'string' && rec.defaulttoken) {
      let dt = rec.defaulttoken;
      try { dt = decodeURIComponent(dt); } catch {}
      const tok = tryParse(dt);
      const url = normImg(tok && (tok.imgsrc || tok.imgSrc));
      if (url) return url;
    }
    return normImg(rec.avatar);
  }
  function indexChar(cid, rec) {
    if (!cid || !rec || typeof rec !== 'object') return;
    const img = characterImg(rec);
    if (!img) return;
    charById.set(cid, img);
    const name = clean(rec.name);
    if (name) charByName.set(name.toLowerCase(), img);
  }
  // Walk a synced value on the /characters path and (re)index whatever it carries.
  function collectCharacters(path, value) {
    const p = String(path || '');
    if (!/\/characters(\/|$)/.test(p)) return;
    const after = p.split('/characters/')[1]; // undefined => the /characters collection
    if (after === undefined || after === '') {
      if (!value || typeof value !== 'object') return;
      for (const [cid, rec] of Object.entries(value)) {
        if (cid[0] !== '.') indexChar(cid, rec);
      }
    } else {
      const segs = after.split('/');
      const cid = segs[0];
      if (segs.length === 1) { indexChar(cid, value); }
      else if (segs[1] === 'avatar') { const u = normImg(value); if (u) charById.set(cid, u); }
    }
  }
  // Resolve a chat record to its character's token image (characterid → name).
  function resolveAvatar(msg) {
    if (!msg) return '';
    const cid = msg.characterid || msg.characterId;
    if (cid && charById.has(cid)) return charById.get(cid);
    const who = clean(msg.who).toLowerCase();
    if (who && charByName.has(who)) return charByName.get(who);
    return '';
  }

  // ── the single capture pipeline ──────────────────────────────────────────────
  // The client is a thin relay: it forwards each LIVE chat record verbatim to the
  // server, which parses it (parser.js) into an overlay roll. So new game systems /
  // rule tweaks ship server-side with no userscript update.
  const seenKeys = new Set(); // chat keys relayed this tab (relay-once)

  function onFirebaseData(path, value) {
    try { collectCharacters(path, value); } catch (e) { dbg('character handling failed', e); }
    try {
      for (const { key, msg } of collectMessages(path, value)) {
        // Drop chat history replayed on initial Firebase sync; keep only live events.
        const t = msgTime(key, msg);
        if (Number.isFinite(t) && t < START_TS - HISTORY_GRACE_MS) continue;
        if (key && seenKeys.has(key)) continue;
        // Never relay secret rolls — they must not leave the Roll20 page.
        if (msg && SECRET_TYPES.has(msg.type)) continue;
        if (key) { seenKeys.add(key); if (seenKeys.size > 3000) seenKeys.clear(); }

        // Attach the rolling character's token image so the overlay portrait fills.
        if (msg && !msg.avatar) {
          const av = resolveAvatar(msg);
          if (av) { msg.avatar = av; dbg('avatar for', msg.who, '→', av); }
        }
        const record = { id: key, msg, ts: Number.isFinite(t) ? t : Date.now() };
        console.log('[overlay] relaying chat', key, 'type=' + (msg && msg.type));
        if (CREDS) postChat(CREDS, record);
        else { chatBuffer.push(record); if (chatBuffer.length > 50) chatBuffer.shift(); }
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
