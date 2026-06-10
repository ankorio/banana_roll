// ==UserScript==
// @name         Roll20 → OBS Overlay Capture
// @namespace    roll20-obs-overlay
// @version      0.1.0
// @description  Capture Roll20 dice rolls and POST them to your overlay relay.
// @match        https://app.roll20.net/editor/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_openInTab
// @connect      localhost
// @connect      self
// @run-at       document-idle
// ==/UserScript==

/* eslint-disable no-undef */
(function () {
  'use strict';

  // ── CONFIG ────────────────────────────────────────────────────────────────
  // Point this at your deployed relay. For local testing keep localhost.
  // Must match an @connect entry above (add your domain there for production).
  const SERVER = 'http://localhost:8765';

  // ── room provisioning (self-provision on first run) ────────────────────────
  function getCreds() {
    const room = GM_getValue('room', '');
    const token = GM_getValue('token', '');
    return room && token ? { room, token } : null;
  }

  function provision(done) {
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
          // Surface the setup page so the user can wire up OBS.
          try { GM_openInTab(r.setupUrl, { active: true }); } catch {}
          done({ room: r.room, token: r.publishToken });
        } catch (e) {
          console.error('[overlay] provision failed', e, resp.responseText);
        }
      },
      onerror: (e) => console.error('[overlay] provision request error', e),
    });
  }

  // ── roll parsing ────────────────────────────────────────────────────────────
  function parseRoll(el) {
    const id = el.getAttribute('data-messageid');
    if (!id) return null;

    const result = el.querySelector('.rollresult') || el;

    const whoEl = el.querySelector('.by');
    const who = whoEl ? whoEl.textContent.replace(/:$/, '').trim() : 'Someone';

    const formulaEl = result.querySelector('.formula:not(.formattedformula)');
    const formula = formulaEl
      ? formulaEl.textContent.replace(/^rolling/i, '').trim()
      : '';

    // total: the last `.rolled` is the grand total Roll20 renders
    const rolledEls = result.querySelectorAll('.rolled, .total');
    let total = NaN;
    if (rolledEls.length) {
      const t = rolledEls[rolledEls.length - 1].textContent.replace(/[^\d.-]/g, '');
      total = Number(t);
    }

    // per-die: each .diceroll carries a dN class + .didroll value + crit classes
    const dice = [];
    let isCrit = false, isFumble = false;
    result.querySelectorAll('.diceroll').forEach((dr) => {
      const sidesMatch = (dr.className.match(/\bd(\d+)\b/) || [])[1] || '';
      const didroll = dr.querySelector('.didroll');
      const value = didroll ? Number(didroll.textContent.replace(/[^\d.-]/g, '')) : NaN;
      const crit = dr.classList.contains('critsuccess');
      const fumble = dr.classList.contains('critfail');
      dice.push({ sides: sidesMatch, value, crit, fumble });
      // crit/fumble only meaningful on a d20
      if (sidesMatch === '20') {
        if (crit || value === 20) isCrit = true;
        if (fumble || value === 1) isFumble = true;
      }
    });
    // a roll can't be both; nat-20 + nat-1 in one formula -> treat as neither special
    if (isCrit && isFumble) { isCrit = false; isFumble = false; }

    return {
      id, who, formula,
      total: Number.isFinite(total) ? total : null,
      dice, isCrit, isFumble, ts: Date.now(),
    };
  }

  // ── posting (idempotency handled server-side by id) ─────────────────────────
  function postRoll(creds, roll) {
    GM_xmlhttpRequest({
      method: 'POST',
      url: `${SERVER}/room/${creds.room}/roll?token=${encodeURIComponent(creds.token)}`,
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify(roll),
      onload: (resp) => {
        if (resp.status === 403) {
          // token rotated / room gone — clear creds so next load re-provisions
          console.warn('[overlay] 403 from relay, clearing stored room');
          GM_setValue('room', ''); GM_setValue('token', '');
        }
      },
      onerror: (e) => console.error('[overlay] post error', e),
    });
  }

  // ── observe the chat log ────────────────────────────────────────────────────
  const localSeen = new Set(); // avoid double-posting within this tab

  function handleNode(creds, node) {
    if (!(node instanceof HTMLElement)) return;
    // a message element either is, or contains, a .rollresult
    const candidates = node.matches('.message') ? [node]
      : node.querySelectorAll ? Array.from(node.querySelectorAll('.message')) : [];
    for (const msg of candidates) {
      if (!msg.querySelector('.rollresult')) continue;
      const id = msg.getAttribute('data-messageid');
      if (!id || localSeen.has(id)) continue;
      localSeen.add(id);
      const roll = parseRoll(msg);
      if (roll) postRoll(creds, roll);
    }
  }

  function start(creds) {
    const log = document.querySelector('#textchat .content') || document.querySelector('#textchat');
    if (!log) { setTimeout(() => start(creds), 1000); return; }
    console.log('[overlay] watching chat for room', creds.room);
    const obs = new MutationObserver((muts) => {
      for (const mut of muts) {
        mut.addedNodes.forEach((n) => handleNode(creds, n));
      }
    });
    obs.observe(log, { childList: true, subtree: true });
  }

  // ── boot ────────────────────────────────────────────────────────────────────
  const creds = getCreds();
  if (creds) start(creds);
  else provision((c) => start(c));
})();
