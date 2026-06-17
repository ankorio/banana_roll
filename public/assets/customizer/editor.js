/* ============================================================================
   Banana Roll — Customizer editor (Canva-style)
   Depends on data.js (window.BR). Dice 3D engine is wired in a module script
   in the HTML and exposes BR.playRoll / BR.refreshDice.
   ========================================================================== */
(function () {
  const BR = window.BR;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Two run modes:
  //  • room mode  — /room/<id>/customize?player=<pid> : edits this room's per-player store.
  //  • token mode — /u/<token>/customize               : a clean, room-free permalink that
  //    edits ONE player's cross-room PROFILE (keyed by their stable account id). The token is
  //    an unguessable capability scoped to that single player — a shared link can never touch
  //    anyone else's config and carries no room data.
  const TOKEN = (location.pathname.match(/^\/u\/([^/]+)\/customize/) || [])[1] || null;
  const ROOM = TOKEN ? null : ((location.pathname.match(/\/room\/([^/]+)\//) || [])[1] || 'demo');
  const PLAYER = TOKEN ? 'me' : (new URLSearchParams(location.search).get('player') || 'default');
  BR.room = ROOM; BR.player = PLAYER; BR.token = TOKEN;

  let lang = (() => { const s = localStorage.getItem('ovr_lang'); if (s === 'en' || s === 'es') return s; return (navigator.language || 'en').toLowerCase().startsWith('es') ? 'es' : 'en'; })();
  const D = () => BR.I18N[lang] || BR.I18N.en;

  // ---- state ----------------------------------------------------------------
  const st = BR.state = {
    templateId: BR.TEMPLATES[0].id,
    colors: BR.clone(BR.TEMPLATES[0].colors),
    editable: BR.clone(BR.TEMPLATES[0].editable),
    zones: BR.clone(BR.TEMPLATES[0].zones),
    art: BR.TEMPLATES[0].art,
    frame: BR.TEMPLATES[0].frame || null,
    customBg: null,           // dataURL of uploaded+cropped art
    dice: { material: 'glass', texture: 'marble', custom: { foreground: '#ffffff', background: '#a01010', edge: '#220000' } },
    trigger: 'crit',
    tool: 'templates',
    mode: 'plaque',           // plaque | dice (canvas emphasis)
    selected: null,           // zone id | 'bg' | null
    zoom: 1,
    portraitImg: null,
    charName: null,           // character name for the preview (from the player's roll); survives template reloads
  };

  const tpl = () => BR.TEMPLATES.find((t) => t.id === st.templateId);
  const zone = (id) => st.zones.find((z) => z.id === id);

  // ---- DOM refs -------------------------------------------------------------
  const plaqueEl = $('#plaque');
  const stageEl = $('#stage');
  const scaleEl = $('#canvasScale');
  const propsEl = $('#props');

  // ============================================================ RENDER PLAQUE
  // Rendering is delegated to the shared renderer (window.BRPlaque) so the edit
  // view, "Play test roll", and (later) the live overlay all draw identically.
  // Editor-only chrome (resize handles + drag/select events) is layered on after build.
  function recomputeFont() { BRPlaque.recomputeFont(plaqueEl, st.zones); }

  // The data the plaque shows = the selected trigger's example (name / roll name come
  // from the editable zone samples or the fetched player). Same shape a real roll uses.
  function triggerData() {
    const trg = BR.TRIGGERS.find((t) => t.id === st.trigger) || BR.TRIGGERS[0];
    return {
      total: trg.total,
      breakdown: trg.die + '  +  ' + trg.mod,
      name: st.charName || zone('name')?.sample || 'Seraphina',
      rname: zone('rname')?.sample || 'Longsword Attack',
      badge: trg.badge, tag: trg.tag, cls: trg.cls,
      portraitImg: st.portraitImg,
    };
  }

  function buildZones() {
    BRPlaque.build(plaqueEl, st.zones, { editable: true });
    st.zones.forEach((z) => { const el = $(`.zone[data-id="${z.id}"]`); if (el) attachZoneEvents(el, z); });
    layoutZones();
    paintZoneContent();
    applyColors();
    requestAnimationFrame(recomputeFont);
  }
  function layoutZones() { BRPlaque.layout(plaqueEl, st.zones); }
  function paintZoneContent() { BRPlaque.paint(plaqueEl, st.zones, triggerData(), D()); }
  function applyColors() { BRPlaque.applyColors(plaqueEl, st.colors, st.zones); }
  function applyArt() { BRPlaque.applyArt(plaqueEl, { art: st.art, frame: st.frame, background: st.customBg }); }

  // ============================================================ ZONE INTERACT
  function attachZoneEvents(el, z) {
    el.addEventListener('pointerdown', (e) => {
      if (e.target.classList.contains('h')) return; // handle has its own
      if (z.locked) { selectZone(z.id); return; }
      selectZone(z.id);
      startDrag(e, z, el);
    });
    $$('.h', el).forEach((h) => h.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (z.locked) return; selectZone(z.id); startResize(e, z, el, h.dataset.h); }));
  }

  let drag = null;
  function startDrag(e, z, el) {
    e.preventDefault();
    const rect = plaqueEl.getBoundingClientRect();
    drag = { z, el, rect, sx: e.clientX, sy: e.clientY, cx0: z.cx, cy0: z.cy };
    el.classList.add('dragging'); el.setPointerCapture(e.pointerId);
    el.addEventListener('pointermove', onDrag); el.addEventListener('pointerup', endDrag, { once: true });
  }
  function onDrag(e) {
    if (!drag) return;
    const dx = ((e.clientX - drag.sx) / drag.rect.width) * 100;
    const dy = ((e.clientY - drag.sy) / drag.rect.height) * 100;
    let ncx = clamp(drag.cx0 + dx, 2, 98), ncy = clamp(drag.cy0 + dy, 2, 98);
    const snap = applySnap(ncx, ncy, drag.z.id);
    ncx = snap.cx; ncy = snap.cy;
    drag.z.cx = ncx; drag.z.cy = ncy;
    drag.el.style.left = ncx + '%'; drag.el.style.top = ncy + '%';
    syncPropNumbers();
  }
  function endDrag(e) { if (!drag) return; drag.el.classList.remove('dragging'); clearGuides(); drag.el.removeEventListener('pointermove', onDrag); drag = null; }

  let rez = null;
  function startResize(e, z, el, corner) {
    e.preventDefault();
    const rect = plaqueEl.getBoundingClientRect();
    const cxpx = rect.left + (z.cx / 100) * rect.width;
    const cypx = rect.top + (z.cy / 100) * rect.height;
    const d0 = Math.hypot(e.clientX - cxpx, e.clientY - cypx) || 1;
    rez = { z, el, rect, cxpx, cypx, d0, w0: z.w, fs0: z.fs };
    el.setPointerCapture(e.pointerId);
    el.addEventListener('pointermove', onResize); el.addEventListener('pointerup', () => { el.removeEventListener('pointermove', onResize); rez = null; }, { once: true });
  }
  function onResize(e) {
    if (!rez) return;
    const d = Math.hypot(e.clientX - rez.cxpx, e.clientY - rez.cypx);
    const ratio = clamp(d / rez.d0, 0.3, 4);
    if (rez.z.kind !== 'pill') rez.z.w = clamp(rez.w0 * ratio, 5, 100);
    rez.z.fs = clamp(rez.fs0 * ratio, 0.3, 3.5);
    layoutZones(); recomputeFont(); syncPropNumbers();
  }

  // snapping to center + other zone centers
  function applySnap(cx, cy, selfId) {
    clearGuides(); const T = 1.4; let sx = cx, sy = cy;
    const xs = [50, ...st.zones.filter((z) => z.id !== selfId && z.visible).map((z) => z.cx)];
    const ys = [50, ...st.zones.filter((z) => z.id !== selfId && z.visible).map((z) => z.cy)];
    for (const x of xs) if (Math.abs(cx - x) < T) { sx = x; guide('v', x); break; }
    for (const y of ys) if (Math.abs(cy - y) < T) { sy = y; guide('h', y); break; }
    return { cx: sx, cy: sy };
  }
  function guide(dir, pct) { const g = document.createElement('div'); g.className = 'guide ' + dir; if (dir === 'v') g.style.left = pct + '%'; else g.style.top = pct + '%'; g.dataset.guide = '1'; plaqueEl.appendChild(g); }
  function clearGuides() { $$('.guide', plaqueEl).forEach((g) => g.remove()); }

  function selectZone(id) {
    st.selected = id;
    $$('.zone', plaqueEl).forEach((e) => e.classList.toggle('sel', e.dataset.id === id));
    $$('.zrow').forEach((r) => r.classList.toggle('active', r.dataset.zone === id));
    renderProps();
    showNudge();
  }
  function deselect() { st.selected = null; $$('.zone', plaqueEl).forEach((e) => e.classList.remove('sel')); $$('.zrow').forEach((r) => r.classList.remove('active')); renderProps(); }

  // nudge
  let nudgeT = null;
  function showNudge() { const n = $('#nudgeNote'); n.classList.add('show'); clearTimeout(nudgeT); nudgeT = setTimeout(() => n.classList.remove('show'), 2600); }
  document.addEventListener('keydown', (e) => {
    if (!st.selected || st.selected === 'bg') return;
    if (e.target.matches('input, select, textarea')) return;
    const z = zone(st.selected); if (!z || z.locked) return;
    const step = e.shiftKey ? 2 : 0.4; let used = true;
    if (e.key === 'ArrowLeft') z.cx = clamp(z.cx - step, 2, 98);
    else if (e.key === 'ArrowRight') z.cx = clamp(z.cx + step, 2, 98);
    else if (e.key === 'ArrowUp') z.cy = clamp(z.cy - step, 2, 98);
    else if (e.key === 'ArrowDown') z.cy = clamp(z.cy + step, 2, 98);
    else used = false;
    if (used) { e.preventDefault(); layoutZones(); syncPropNumbers(); }
  });

  // deselect on canvas background click
  stageEl.addEventListener('pointerdown', (e) => { if (e.target === stageEl || e.target === scaleEl) deselect(); });

  // ============================================================ LEFT RAIL
  function buildRail() {
    const rail = $('#rail');
    const tools = [
      ['templates', 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z'],
      ['upload', 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12'],
      ['zones', 'M4 4h7v7H4z M13 13h7v7h-7z M13 4l7 7 M4 13l7 7'],
      ['colors', 'M12 2a10 10 0 1 0 0 20 2 2 0 0 0 2-2c0-.5-.2-1-.5-1.4-.3-.4-.5-.9-.5-1.3a1.5 1.5 0 0 1 1.5-1.5H16a5 5 0 0 0 5-5c0-4.4-4-8-9-8z'],
      ['dice', 'RECT'],
    ];
    rail.innerHTML = '';
    tools.forEach(([id, path]) => {
      const b = document.createElement('button'); b.className = 'rbtn' + (id === st.tool ? ' active' : ''); b.dataset.tool = id;
      let svg;
      if (path === 'RECT') svg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="15.5" cy="8.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="8.5" cy="15.5" r="1.3" fill="currentColor" stroke="none"/></svg>';
      else svg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + path + '"/></svg>';
      b.innerHTML = svg + '<span data-i18n="tool_' + id + '">' + D()['tool_' + id] + '</span>';
      b.addEventListener('click', () => selectTool(id));
      rail.appendChild(b);
    });
  }
  function selectTool(id) {
    if (st.tool === id) { // toggle collapse
      const fly = $('#flyout'); fly.classList.toggle('collapsed');
      return;
    }
    st.tool = id;
    $('#flyout').classList.remove('collapsed');
    $$('.rbtn', $('#rail')).forEach((b) => b.classList.toggle('active', b.dataset.tool === id));
    $$('.panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === id));
    setMode(id === 'dice' ? 'dice' : 'plaque');
    if (id === 'zones') renderZonesList();
  }

  function setMode(mode) {
    st.mode = mode;
    $$('#modeSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    if (mode === 'dice') {
      // Dice editor: plaque steps back, a single themed die floats + slowly spins.
      // The dice layer is revealed by startDiceSpin AFTER the (hidden) toss settles,
      // so the throw animation is never seen — just the spinning die.
      plaqueEl.classList.add('dice-mode');
      if (BR.startDiceSpin) BR.startDiceSpin();
    } else {
      // Plaque editor: pure zone editing, no dice on the canvas.
      if (BR.stopDiceSpin) BR.stopDiceSpin();
      plaqueEl.classList.remove('dice-mode');
      $('#diceLayer').classList.remove('on');
    }
    renderProps(); // swap the right panel: dice tuning ↔ zone props/empty
  }

  // ============================================================ PANELS
  function buildTemplatesPanel() {
    const grid = $('#tplGrid'); grid.innerHTML = '';
    BR.TEMPLATES.forEach((t) => {
      const b = document.createElement('button'); b.className = 'tpl'; b.dataset.tpl = t.id;
      b.setAttribute('aria-pressed', String(t.id === st.templateId));
      const thumb = t.art ? `<div class="thumb"><img src="${t.art}" alt=""></div>`
        : `<div class="thumb"><div style="width:62%;height:70%;border-radius:10px;box-shadow:inset 0 0 0 2px ${t.colors.accent}66, inset 0 0 30px rgba(0,0,0,.5)"></div></div>`;
      const dots = Object.keys(t.colors).map((k) => `<i class="${t.editable[k] ? '' : 'lk'}" style="background:${t.colors[k]}"></i>`).join('');
      b.innerHTML = thumb + `<div class="tmeta"><div class="tname">${t.name}</div><div class="tcolors">${dots}</div></div>`;
      b.addEventListener('click', () => applyTemplate(t.id));
      grid.appendChild(b);
    });
    const anyLock = Object.values(tpl().editable).some((v) => !v);
    $('#tplLockNote').className = 'pnote ' + (anyLock ? 'lock' : '');
    $('#tplLockNote').innerHTML = (anyLock
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' + D().locked_colors
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>' + D().all_editable);
  }

  function applyTemplate(id) {
    const t = BR.TEMPLATES.find((x) => x.id === id); if (!t) return;
    st.templateId = id;
    st.colors = BR.clone(t.colors); st.editable = BR.clone(t.editable);
    st.zones = BR.clone(t.zones); st.art = t.art; st.frame = t.frame || null;
    st.customBg = null; st.selected = null;
    applyArt(); buildZones(); buildTemplatesPanel(); buildColorsPanel(); updateUploadState(); renderProps();
  }

  // texture image preview (served per-id; falls back to a blank tile when no file exists)
  const texImg = (id) => `/assets/textures/${id}.webp`;
  // is the active dice look this preset? (compare the channels + material + texture)
  function presetActive(p) {
    const c = st.dice.custom || {};
    return c.foreground === p.foreground && c.background === p.background && c.edge === p.edge &&
      st.dice.material === p.material && st.dice.texture === p.texture;
  }

  // ---- LEFT FLYOUT: preconfigured dice presets (the full list) ----
  const presetSubset = (BR.DICE_PRESETS || []).slice();
  function buildDicePresets() {
    const wrap = $('#dicePresets'); if (!wrap) return;
    wrap.innerHTML = '';
    presetSubset.forEach((p) => {
      const t = document.createElement('button'); t.className = 'preset' + (presetActive(p) ? ' on' : '');
      t.title = p.name;
      t.innerHTML =
        `<span class="pv" style="background:${p.background}">` +
          `<span class="pv-tex" style="background-image:url('${texImg(p.texture)}')"></span>` +
          `<span class="pv-num" style="color:${p.foreground};-webkit-text-stroke:1px ${p.edge}">20</span>` +
        `</span>` +
        `<span class="pn">${p.name}</span>`;
      t.addEventListener('click', () => applyDicePreset(p));
      wrap.appendChild(t);
    });
  }
  function applyDicePreset(p) {
    st.dice.custom = { foreground: p.foreground, background: p.background, edge: p.edge };
    st.dice.material = p.material; st.dice.texture = p.texture;
    // Editing a dice attribute always swaps the canvas to the dice view.
    if (st.mode !== 'dice') setMode('dice'); // renders the right panel + starts the spin
    else { renderDiceProps(); diceChanged(); }
    syncPresetSel();
  }

  // ---- texture grid (rendered in the right panel; labels outside the image; panel scrolls) ----
  function buildDiceTextures() {
    const wrap = $('#diceTextures'); if (!wrap) return;
    const man = BR.MANIFEST;
    const texs = (man && man.textures && man.textures.length) ? man.textures : BR.TEXTURES;
    wrap.innerHTML = '';
    texs.forEach((tx) => {
      const id = tx.id || tx;
      const b = document.createElement('button'); b.className = 'tex-tile' + (id === st.dice.texture ? ' on' : '');
      b.dataset.tex = id; b.title = tx.name || id;
      b.innerHTML = `<span class="tex-thumb" style="background-image:url('${texImg(id)}')"></span><span class="tex-cap">${tx.name || id}</span>`;
      b.addEventListener('click', () => { st.dice.texture = id; $$('#diceTextures .tex-tile').forEach((x) => x.classList.toggle('on', x.dataset.tex === id)); syncPresetSel(); diceChanged(); });
      wrap.appendChild(b);
    });
  }

  // ---- RIGHT PANEL: dice tuning (material · Numbers/Body/Edge colours · texture) ----
  function renderDiceProps() {
    closeColorPicker();
    const man = BR.MANIFEST;
    const mats = (man && man.materials && man.materials.length) ? man.materials : BR.MATERIALS;
    const c = st.dice.custom;
    propsEl.innerHTML =
      `<h2>${D().p_dice_tune_h}</h2>` +
      `<div class="pgroup"><div class="pg-head"><b>${D().dice_material}</b></div><select class="inp" id="matSel"></select></div>` +
      colorSection('foreground', D().custom_fg, c.foreground) +
      colorSection('background', D().custom_bg, c.background) +
      colorSection('edge', D().custom_edge, c.edge) +
      `<div class="pgroup"><div class="pg-head"><b>${D().dice_texture}</b></div><div class="tex-grid" id="diceTextures"></div></div>`;
    const mat = $('#matSel'); mat.innerHTML = '';
    mats.forEach((m2) => { const o = document.createElement('option'); o.value = m2; o.textContent = m2; mat.appendChild(o); });
    mat.value = st.dice.material;
    mat.onchange = () => { st.dice.material = mat.value; syncPresetSel(); diceChanged(); };
    ['foreground', 'background', 'edge'].forEach((ch) => wireColorSection(ch));
    buildDiceTextures();
  }
  function colorSection(ch, label, hex) {
    const palette = (BR.DICE_COLOR_PALETTES && BR.DICE_COLOR_PALETTES[ch]) || [];
    const sw = palette.map((h) => `<button class="sw" data-ch="${ch}" data-hex="${h}" style="background:${h}" aria-pressed="${h.toLowerCase() === (hex || '').toLowerCase()}"></button>`).join('');
    return `<div class="pgroup dice-col"><div class="pg-head"><b>${label}</b><span class="cur" id="cur_${ch}" style="background:${hex}"></span></div>` +
      `<div class="swatches">${sw}<button class="sw pick" data-ch="${ch}" title="${D().dice_custom}" style="background:${hex}"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" stroke-width="2" style="filter:drop-shadow(0 1px 2px #0008)"><path d="M12 5v14M5 12h14"/></svg></button></div></div>`;
  }
  // Palette swatches set the channel directly; the "pick" swatch hosts a Pickr instance.
  let pickrs = [];
  function wireColorSection(ch) {
    $$(`.sw[data-ch="${ch}"]:not(.pick)`).forEach((b) => b.addEventListener('click', () => setDiceColor(ch, b.dataset.hex)));
    const pickEl = $(`.sw.pick[data-ch="${ch}"]`);
    if (pickEl && window.Pickr) {
      const inst = window.Pickr.create({
        el: pickEl, theme: 'nano', default: st.dice.custom[ch] || '#ffffff', useAsButton: true, position: 'left-start',
        components: { preview: true, hue: true, interaction: { hex: true, input: true, save: false, clear: false } },
      });
      inst.on('change', (color) => { if (color) setDiceColor(ch, color.toHEXA().toString().slice(0, 7)); });
      pickrs.push(inst);
    }
  }
  function setDiceColor(ch, hex) {
    hex = String(hex || '').toLowerCase();
    st.dice.custom[ch] = hex;
    const cur = $('#cur_' + ch); if (cur) cur.style.background = hex;
    const pick = $(`.sw.pick[data-ch="${ch}"]`); if (pick) pick.style.background = hex;
    $$(`.sw[data-ch="${ch}"]:not(.pick)`).forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.hex || '').toLowerCase() === hex)));
    syncPresetSel(); diceChanged();
  }
  function syncPresetSel() {
    $$('#dicePresets .preset').forEach((b, i) => b.classList.toggle('on', presetSubset && presetSubset[i] && presetActive(presetSubset[i])));
  }
  let diceT = null;
  function diceChanged() {
    clearTimeout(diceT);
    diceT = setTimeout(() => {
      if (st.mode !== 'dice') { setMode('dice'); return; } // any dice edit → swap to the dice view (setMode starts the spin)
      if (BR.startDiceSpin) BR.startDiceSpin();
    }, 220);
  }
  // Tear down Pickr instances (called before re-rendering the props panel).
  function closeColorPicker() { pickrs.forEach((p) => { try { p.destroyAndRemove(); } catch (e) {} }); pickrs = []; }

  // Plaque-colour Pickr instances (one per editable key); torn down on each rebuild.
  let platePickrs = [];
  function destroyPlatePickrs() { platePickrs.forEach((p) => { try { p.destroyAndRemove(); } catch (e) {} }); platePickrs = []; }
  function setPlateColor(key, hex) {
    hex = String(hex || '').toLowerCase();
    st.colors[key] = hex; applyColors();
    const block = $(`#colorBlocks .color-block[data-key="${key}"]`);
    if (block) {
      $$('.sw[data-hex]', block).forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.hex || '').toLowerCase() === hex)));
      const p = block.querySelector('.sw.pick'); if (p) p.style.background = hex;
    }
  }
  function buildColorsPanel() {
    destroyPlatePickrs();
    const wrap = $('#colorBlocks'); wrap.innerHTML = '';
    const keys = [['accent', D().c_accent, BR.ACCENTS], ['badge', D().c_badge, BR.BADGE_COLORS], ['name', D().c_name, BR.ACCENTS]];
    keys.forEach(([key, label, palette]) => {
      const editable = st.editable[key];
      const block = document.createElement('div'); block.className = 'color-block' + (editable ? '' : ' locked'); block.dataset.key = key;
      const head = document.createElement('div'); head.className = 'cbh';
      head.innerHTML = `<b>${label}</b>` + (editable ? '' : `<span class="lockchip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>${D().locked}</span>`);
      block.appendChild(head);
      const sw = document.createElement('div'); sw.className = 'swatches';
      palette.forEach((hex) => {
        const b = document.createElement('button'); b.className = 'sw'; b.style.background = hex; b.title = hex; b.dataset.hex = hex;
        b.setAttribute('aria-pressed', String(hex.toLowerCase() === (st.colors[key] || '').toLowerCase()));
        b.addEventListener('click', () => setPlateColor(key, hex));
        sw.appendChild(b);
      });
      // custom picker — Pickr on the swatch (same component as the dice colours)
      const pick = document.createElement('button'); pick.className = 'sw pick'; pick.style.background = st.colors[key]; pick.title = D().dice_custom;
      pick.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" stroke-width="2" style="filter:drop-shadow(0 1px 2px #0008)"><path d="M12 5v14M5 12h14"/></svg>';
      sw.appendChild(pick);
      block.appendChild(sw);
      wrap.appendChild(block);
      if (editable && window.Pickr) {
        const inst = window.Pickr.create({ el: pick, theme: 'nano', default: st.colors[key] || '#ffffff', useAsButton: true, position: 'right-start',
          components: { preview: true, hue: true, interaction: { hex: true, input: true, save: false, clear: false } } });
        inst.on('change', (c) => { if (c) setPlateColor(key, c.toHEXA().toString().slice(0, 7)); });
        platePickrs.push(inst);
      }
    });
  }

  function renderZonesList() {
    const list = $('#zoneList'); list.innerHTML = '';
    const ic = { portrait: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0', text: 'M4 7V4h16v3M9 20h6M12 4v16', pill: 'M3 12h18M6 8h12a3 3 0 0 1 0 8H6a3 3 0 0 1 0-8z', image: 'M3 5h18v14H3z M3 15l5-5 4 4 3-3 6 6' };
    st.zones.forEach((z) => {
      const r = document.createElement('div'); r.className = 'zrow' + (z.id === st.selected ? ' active' : '') + (z.visible ? '' : ' hidden-z'); r.dataset.zone = z.id;
      const icon = ic[z.kind] || ic.text;
      r.innerHTML = `<span class="zi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${icon}"/></svg></span>`
        + `<span class="zn">${BR.ZONE_LABELS[lang][z.id] || z.id}</span>`
        + `<button class="zeye" title="toggle">${eyeSvg(z.visible)}</button>`;
      r.querySelector('.zn').addEventListener('click', () => selectZone(z.id));
      r.querySelector('.zi').addEventListener('click', () => selectZone(z.id));
      r.querySelector('.zeye').addEventListener('click', (e) => { e.stopPropagation(); z.visible = !z.visible; layoutZones(); paintZoneContent(); renderZonesList(); if (st.selected === z.id) renderProps(); });
      list.appendChild(r);
    });
  }
  function eyeSvg(on) {
    return on ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/></svg>';
  }

  // ============================================================ PROPERTIES
  function renderProps() {
    closeColorPicker();
    if (st.mode === 'dice') { renderDiceProps(); return; } // dice tuning owns the right panel in dice mode
    const id = st.selected;
    if (!id) { propsEl.innerHTML = `<h2 data-i18n="props">${D().props}</h2><div class="empty-props"><div class="ed"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7.4-6.3-4.6L5.7 21 8 14 2 9.4h7.6z"/></svg></div><b>${D().no_sel_h}</b><p>${D().no_sel_d}</p></div>`; return; }
    if (id === 'bg') { renderBgProps(); return; }
    const z = zone(id); if (!z) return;
    const label = BR.ZONE_LABELS[lang][z.id] || z.id;
    const colorEditable = z.colorKey && st.editable[z.colorKey];
    let html = `<h2>${D().props}</h2>`;
    html += `<div class="sel-title"><span class="si"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/></svg></span><div class="st"><b>${label}</b><span>${z.kind}</span></div></div>`;
    // visible
    html += `<div class="pgroup"><div class="pg-head"><b>${D().pr_visible}</b><label class="switch"><input type="checkbox" id="pp_vis" ${z.visible ? 'checked' : ''}><span class="track"></span><span class="knob"></span></label></div></div>`;
    if (!z.locked) {
      // position
      html += `<div class="pgroup"><div class="pg-head"><b>${D().pr_pos}</b></div><div class="row2">
        <div class="numfield"><label>${D().pr_x}</label><div class="nf"><span>%</span><input type="number" id="pp_x" value="${z.cx.toFixed(1)}" step="0.5"></div></div>
        <div class="numfield"><label>${D().pr_y}</label><div class="nf"><span>%</span><input type="number" id="pp_y" value="${z.cy.toFixed(1)}" step="0.5"></div></div></div></div>`;
      // size + font
      if (z.kind !== 'pill') html += `<div class="pgroup"><div class="pg-head"><b>${D().pr_size}</b><output id="pp_w_out">${Math.round(z.w)}%</output></div><div class="range-row"><input type="range" id="pp_w" min="5" max="100" step="1" value="${z.w}"></div></div>`;
      if (z.kind !== 'image') html += `<div class="pgroup"><div class="pg-head"><b>${D().pr_font}</b><output id="pp_fs_out">${z.fs.toFixed(2)}×</output></div><div class="range-row"><input type="range" id="pp_fs" min="0.3" max="3" step="0.05" value="${z.fs}"></div></div>`;
      // align
      if (z.kind === 'text') html += `<div class="pgroup"><div class="pg-head"><b>${D().pr_align}</b><div class="alignseg" id="pp_align">${alignBtn('left', z.align)}${alignBtn('center', z.align)}${alignBtn('right', z.align)}</div></div></div>`;
      // color
      if (z.colorKey) html += `<div class="pgroup"><div class="pg-head"><b>${D().pr_color}</b>${colorEditable ? `<button class="sw pick" id="pp_color" style="background:${st.colors[z.colorKey]}"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" stroke-width="2" style="filter:drop-shadow(0 1px 2px #0008)"><path d="M12 5v14M5 12h14"/></svg></button>` : `<span class="lockchip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>${D().locked}</span>`}</div></div>`;
      html += `<div class="pgroup"><button class="linkbtn" id="pp_reset">↺ ${D().pr_reset}</button></div>`;
    } else {
      html += `<div class="pgroup"><span class="lockchip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>${D().locked}</span></div>`;
    }
    propsEl.innerHTML = html;
    wireProps(z);
  }
  function alignBtn(a, cur) {
    const ic = { left: 'M3 6h18M3 12h12M3 18h15', center: 'M3 6h18M6 12h12M4 18h16', right: 'M3 6h18M9 12h12M6 18h15' }[a];
    return `<button data-align="${a}" aria-pressed="${a === cur}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="${ic}"/></svg></button>`;
  }
  function wireProps(z) {
    const vis = $('#pp_vis'); if (vis) vis.onchange = () => { z.visible = vis.checked; layoutZones(); paintZoneContent(); renderZonesList(); };
    const x = $('#pp_x'), y = $('#pp_y');
    if (x) x.oninput = () => { z.cx = clamp(parseFloat(x.value) || 0, 0, 100); layoutZones(); };
    if (y) y.oninput = () => { z.cy = clamp(parseFloat(y.value) || 0, 0, 100); layoutZones(); };
    const w = $('#pp_w'); if (w) { setFill(w); w.oninput = () => { z.w = parseFloat(w.value); $('#pp_w_out').textContent = Math.round(z.w) + '%'; setFill(w); layoutZones(); recomputeFont(); }; }
    const fs = $('#pp_fs'); if (fs) { setFill(fs); fs.oninput = () => { z.fs = parseFloat(fs.value); $('#pp_fs_out').textContent = z.fs.toFixed(2) + '×'; setFill(fs); recomputeFont(); }; }
    const al = $('#pp_align'); if (al) $$('button', al).forEach((b) => b.onclick = () => { z.align = b.dataset.align; $$('button', al).forEach((x2) => x2.setAttribute('aria-pressed', String(x2 === b))); layoutZones(); });
    const col = $('#pp_color');
    if (col && window.Pickr) {
      const inst = window.Pickr.create({ el: col, theme: 'nano', default: st.colors[z.colorKey] || '#ffffff', useAsButton: true, position: 'left-start',
        components: { preview: true, hue: true, interaction: { hex: true, input: true, save: false, clear: false } } });
      inst.on('change', (c) => { if (!c) return; const hex = c.toHEXA().toString().slice(0, 7).toLowerCase(); st.colors[z.colorKey] = hex; col.style.background = hex; applyColors(); buildColorsPanel(); });
      pickrs.push(inst); // torn down by closeColorPicker() on the next renderProps
    }
    const rst = $('#pp_reset'); if (rst) rst.onclick = () => { const orig = tpl().zones.find((o) => o.id === z.id); Object.assign(z, BR.clone(orig)); layoutZones(); recomputeFont(); paintZoneContent(); renderProps(); };
  }
  function setFill(r) { const pct = ((r.value - r.min) / (r.max - r.min)) * 100; r.style.setProperty('--fill', pct + '%'); }
  function syncPropNumbers() {
    if (!st.selected || st.selected === 'bg') return;
    const z = zone(st.selected); if (!z) return;
    const x = $('#pp_x'), y = $('#pp_y'), w = $('#pp_w'), fs = $('#pp_fs');
    if (x) x.value = z.cx.toFixed(1); if (y) y.value = z.cy.toFixed(1);
    if (w) { w.value = z.w; $('#pp_w_out').textContent = Math.round(z.w) + '%'; setFill(w); }
    if (fs) { fs.value = z.fs; $('#pp_fs_out').textContent = z.fs.toFixed(2) + '×'; setFill(fs); }
  }
  function renderBgProps() {
    propsEl.innerHTML = `<h2>${D().props}</h2><div class="sel-title"><span class="si"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 15l5-5 4 4 3-3 6 6"/></svg></span><div class="st"><b>${D().bg_sel}</b><span>${st.customBg ? 'custom' : (st.art ? 'template' : 'drawn')}</span></div></div>
      <div class="pgroup"><p style="color:var(--muted);font-size:12.5px;margin:0 0 12px">${D().bg_d}</p>
      <button class="btn btn-ghost btn-sm" id="bg_replace">${D().replace}</button> ${st.customBg ? `<button class="linkbtn" id="bg_remove" style="margin-left:10px">${D().remove}</button>` : ''}</div>`;
    $('#bg_replace').onclick = () => $('#fileInput').click();
    const rm = $('#bg_remove'); if (rm) rm.onclick = () => { st.customBg = null; applyArt(); deselect(); };
  }

  // ============================================================ TRIGGERS / CANVAS
  function buildTriggers() {
    const wrap = $('#triggers'); wrap.innerHTML = '';
    BR.TRIGGERS.forEach((t) => {
      const b = document.createElement('button'); b.dataset.trig = t.id; b.textContent = D()['trig_' + t.id];
      b.setAttribute('aria-pressed', String(t.id === st.trigger));
      b.addEventListener('click', () => fireTrigger(t.id));
      wrap.appendChild(b);
    });
  }
  // Selecting a trigger just sets the plaque's sample state (totals, badge, tag,
  // crit/fumble styling). No dice — the live roll is the "Play test roll" button.
  function fireTrigger(id) {
    st.trigger = id;
    $$('#triggers button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.trig === id)));
    paintZoneContent();
  }

  // Crit/fumble confetti, mirroring the overlay's fireParticles (uses vendored canvas-confetti).
  function fireParticles(trg) {
    const confetti = window.confetti; if (!confetti) return;
    if (trg.cls === 'crit') {
      const gold = ['#ffd24a', '#ffb300', '#fff3c4', '#ffffff'];
      confetti({ particleCount: 120, spread: 80, startVelocity: 55, origin: { x: 0.5, y: 0.75 }, colors: gold });
      setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 70, origin: { x: 0, y: 0.9 }, colors: gold }), 120);
      setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 70, origin: { x: 1, y: 0.9 }, colors: gold }), 120);
    } else if (trg.cls === 'fumble') {
      confetti({ particleCount: 40, spread: 100, startVelocity: 18, gravity: 1.6, ticks: 120, origin: { x: 0.5, y: 0.4 }, colors: ['#ff5050', '#7a0000', '#2a0000'], scalar: 0.9 });
    }
  }

  // WYSIWYG preview: mirror the overlay's roll sequence (drain()) against the editor's
  // own live plaque — hide plaque → real 3D roll lands on the trigger value → reveal
  // plaque with the example result + confetti → hold → hide. Reflects unsaved edits.
  let playing = false;
  async function playTestRoll() {
    if (playing) return; playing = true;
    const btn = $('#playBtn'); if (btn) btn.disabled = true;
    const trg = BR.TRIGGERS.find((t) => t.id === st.trigger) || BR.TRIGGERS[0];
    try {
      if (BR.stopDiceSpin) BR.stopDiceSpin();
      st.mode = 'plaque'; plaqueEl.classList.remove('dice-mode');
      $$('#modeSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === 'plaque')));
      paintZoneContent();
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (BR.playRoll && !reduce) {
        plaqueEl.classList.add('play-hide');
        $('#diceLayer').classList.add('on');
        const timeout = new Promise((r) => setTimeout(r, 2600));
        await Promise.race([Promise.resolve(BR.playRoll(trg.die)).catch(() => {}), timeout]);
        $('#diceLayer').classList.remove('on');
        plaqueEl.classList.remove('play-hide');
      }
      plaqueEl.classList.add('play-show');
      fireParticles(trg);
      await new Promise((r) => setTimeout(r, 4200));
      plaqueEl.classList.remove('play-show');
    } catch (e) { /* never get stuck */ }
    finally {
      plaqueEl.classList.remove('play-hide', 'play-show');
      $('#diceLayer').classList.remove('on');
      if (BR.clearDice) BR.clearDice();
      if (btn) btn.disabled = false;
      playing = false;
    }
  }

  // ============================================================ UPLOAD + CROP
  const fileInput = $('#fileInput');
  $('#uploadBtn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => { const f = e.target.files[0]; if (f) openCrop(f); fileInput.value = ''; });

  let crop = null;
  function openCrop(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = $('#cropImg'); img.onload = () => {
        // Show the modal FIRST, then measure the crop frame on the next frame — while
        // the modal is display:none its frame has zero size, which scaled the image to
        // nothing (image never appeared).
        $('#cropModal').classList.add('show');
        requestAnimationFrame(() => {
          const frame = $('#cropFrame').getBoundingClientRect();
          const s0 = Math.max(frame.width / img.naturalWidth, frame.height / img.naturalHeight) || 1;
          crop = { x: 0, y: 0, s: s0, s0, nat: { w: img.naturalWidth, h: img.naturalHeight }, frameW: frame.width, frameH: frame.height };
          applyCropTransform();
          const z = $('#cropZoom'); z.value = 1; setFill(z);
        });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
  function applyCropTransform() { const img = $('#cropImg'); img.style.transform = `translate(-50%,-50%) translate(${crop.x}px,${crop.y}px) scale(${crop.s})`; }
  (function cropDrag() {
    const area = $('#cropArea'); let p = null;
    area.addEventListener('pointerdown', (e) => { if (!crop) return; p = { sx: e.clientX, sy: e.clientY, x0: crop.x, y0: crop.y }; area.classList.add('grabbing'); area.setPointerCapture(e.pointerId); });
    area.addEventListener('pointermove', (e) => { if (!p) return; crop.x = p.x0 + (e.clientX - p.sx); crop.y = p.y0 + (e.clientY - p.sy); applyCropTransform(); });
    area.addEventListener('pointerup', (e) => { p = null; area.classList.remove('grabbing'); });
    area.addEventListener('pointerleave', () => { p = null; area.classList.remove('grabbing'); });
  })();
  $('#cropZoom').addEventListener('input', (e) => { if (!crop) return; crop.s = crop.s0 * parseFloat(e.target.value); setFill(e.target); applyCropTransform(); });
  $('#cropCancel').addEventListener('click', () => $('#cropModal').classList.remove('show'));
  $('#cropApply').addEventListener('click', () => {
    const out = document.createElement('canvas'); const W = 398, H = 440; out.width = W; out.height = H;
    const ctx = out.getContext('2d'); const img = $('#cropImg');
    const k = W / crop.frameW; // frame px → output px
    ctx.save(); ctx.translate(W / 2 + crop.x * k, H / 2 + crop.y * k); ctx.scale(crop.s * k, crop.s * k);
    ctx.drawImage(img, -crop.nat.w / 2, -crop.nat.h / 2); ctx.restore();
    st.customBg = out.toDataURL('image/png');
    applyArt(); $('#cropModal').classList.remove('show');
    updateUploadState(); selectTool('zones'); st.selected = 'bg'; renderProps();
  });
  function updateUploadState() {
    $('#uploadState').textContent = st.customBg ? D().using_custom : D().using_template;
    $('#uploadState').style.color = st.customBg ? 'var(--green)' : 'var(--muted-2)';
  }

  // ============================================================ ZOOM
  function setZoom(z) { st.zoom = clamp(z, 0.5, 1.6); scaleEl.style.transform = `scale(${st.zoom})`; $('#zoomVal').textContent = Math.round(st.zoom * 100) + '%'; recomputeFont(); }
  $('#zoomIn').onclick = () => setZoom(st.zoom + 0.1);
  $('#zoomOut').onclick = () => setZoom(st.zoom - 0.1);
  $('#zoomFit').onclick = () => setZoom(1);

  // ============================================================ SAVE / LOAD
  function plaquePayload() {
    return { templateId: st.templateId, colors: st.colors, zones: st.zones, customBg: st.customBg ? '[dataURL omitted in preview]' : null };
  }
  function dicePayload() {
    const s = { texture: st.dice.texture, material: st.dice.material };
    Object.assign(s, st.dice.custom); // dice colour is always per-channel custom (foreground/background/edge)
    return s;
  }
  $('#saveBtn').addEventListener('click', async () => {
    const pill = $('#savedPill'); const btn = $('#saveBtn');
    btn.disabled = true; const old = btn.querySelector('span').textContent; btn.querySelector('span').textContent = D().saving;
    // Dice → style store, plaque → plaque store (two independent writes). Token mode
    // targets the player's cross-room profile; room mode targets this room's per-player store.
    const styleUrl = TOKEN ? `/u/${TOKEN}/style` : `/room/${ROOM}/styles?player=${encodeURIComponent(PLAYER)}`;
    const plaqueUrl = TOKEN ? `/u/${TOKEN}/plaque` : `/room/${ROOM}/plaque?player=${encodeURIComponent(PLAYER)}`;
    let ok = true;
    try {
      const r = await fetch(styleUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ style: dicePayload() }) });
      ok = r.ok;
    } catch (e) { ok = false; }
    try {
      const r2 = await fetch(plaqueUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ templateId: st.templateId, colors: st.colors, zones: st.zones, background: st.customBg }) });
      ok = ok && r2.ok;
    } catch (e) { ok = false; }
    btn.disabled = false; btn.querySelector('span').textContent = old;
    const pillSpan = pill.querySelector('span');
    if (pillSpan) pillSpan.textContent = ok ? D().saved : D().savefail;
    pill.classList.toggle('fail', !ok);
    pill.classList.add('show'); setTimeout(() => pill.classList.remove('show'), ok ? 1600 : 2600);
  });

  function applyDiceStyle(ds) {
    if (!ds) return;
    if (ds.texture) st.dice.texture = ds.texture;
    if (ds.material) st.dice.material = ds.material;
    // Per-channel custom colours; a legacy colorset-only save keeps the default custom colours.
    if (ds.foreground || ds.background || ds.edge) st.dice.custom = { foreground: ds.foreground || '#ffffff', background: ds.background || '#a01010', edge: ds.edge || '#220000' };
    buildDicePresets();
    if (st.mode === 'dice') renderDiceProps();
  }
  function applyPlaqueCfg(pl) {
    if (!pl || !pl.templateId) return;
    applyTemplate(pl.templateId);
    if (pl.colors) st.colors = Object.assign(st.colors, pl.colors);
    if (pl.zones && pl.zones.length) st.zones = pl.zones;
    if (pl.background) st.customBg = pl.background;
    applyArt(); buildZones(); buildColorsPanel(); updateUploadState();
  }
  // Seed from this room's saved dice + plaque; fall back to the player's cross-room
  // profile (what they saved in any previous room) when this room has nothing yet.
  async function loadExisting() {
    let ds = null, pl = null;
    if (TOKEN) {
      // Token mode: the player's profile IS the style + plaque (no room store).
      try {
        const r = await fetch(`/u/${TOKEN}/profile`);
        if (r.ok) { const d = await r.json(); ds = d.style; pl = d.plaque; }
      } catch (e) {}
      applyDiceStyle(ds); applyPlaqueCfg(pl);
      return;
    }
    try {
      const r = await fetch(`/room/${ROOM}/styles`);
      if (r.ok) { const d = await r.json(); ds = PLAYER === 'default' ? d.defaultStyle : (d.styles || {})[PLAYER]; }
    } catch (e) {}
    try {
      const r = await fetch(`/room/${ROOM}/plaque`);
      if (r.ok) { const d = await r.json(); pl = PLAYER === 'default' ? d.defaultPlaque : (d.plaques || {})[PLAYER]; }
    } catch (e) {}
    if ((!ds || !pl) && PLAYER !== 'default') {
      try {
        const r = await fetch(`/room/${ROOM}/profile?player=${encodeURIComponent(PLAYER)}`);
        if (r.ok) { const d = await r.json(); if (!ds) ds = d.style; if (!pl) pl = d.plaque; }
      } catch (e) {}
    }
    applyDiceStyle(ds);
    applyPlaqueCfg(pl);
  }

  // ============================================================ WHO + i18n
  async function fetchWho() {
    if (TOKEN) {
      // Token mode: identity (name/portrait/colour) comes from the profile endpoint, best-effort.
      $('#whoName').textContent = (lang === 'es' ? 'Tus dados y placa' : 'Your dice & plaque');
      try {
        const r = await fetch(`/u/${TOKEN}/profile`); if (!r.ok) return;
        const d = await r.json(); const w = d.identity || {};
        const nm = w.charName || w.name;
        if (nm) { $('#whoName').textContent = nm; st.charName = nm; }
        if (w.color) $('#whoDot').style.background = w.color;
        if (w.avatar) st.portraitImg = w.avatar;
        paintZoneContent();
      } catch (e) {}
      return;
    }
    if (PLAYER === 'default') { $('#whoName').textContent = D().allPlayers; return; }
    $('#whoName').textContent = PLAYER;
    try {
      const r = await fetch(`/room/${ROOM}/players`); if (!r.ok) return;
      const d = await r.json();
      const p = (d.players || []).find((x) => x.id === PLAYER); if (!p) return;
      const charName = p.charName || p.name; // character name from their last roll, else account name
      $('#whoName').textContent = charName;
      $('#whoDot').style.background = p.color || 'var(--gold)';
      if (charName) st.charName = charName;     // state → survives template/plaque reloads (zone.sample gets clobbered)
      if (p.avatar) st.portraitImg = p.avatar;  // real character token image as the preview portrait
      paintZoneContent();
    } catch (e) {}
  }
  function applyLang() {
    document.documentElement.lang = lang; document.title = D().doc;
    $$('[data-i18n]').forEach((el) => { const v = D()[el.getAttribute('data-i18n')]; if (v != null) el.innerHTML = v; });
    $$('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    buildRail(); buildTriggers(); buildTemplatesPanel(); buildDicePresets(); buildColorsPanel(); renderZonesList();
    paintZoneContent(); renderProps();
    if (PLAYER === 'default') $('#whoName').textContent = D().allPlayers;
  }
  $$('[data-lang]').forEach((b) => b.addEventListener('click', () => { lang = b.dataset.lang; try { localStorage.setItem('ovr_lang', lang); } catch (e) {} applyLang(); }));

  $('#modeSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setMode(b.dataset.mode); });
  $('#playBtn') && $('#playBtn').addEventListener('click', playTestRoll);
  // Token-mode links carry no room, so there's no setup page to return to — hide the back link.
  if (TOKEN) { const b = $('#backBtn'); if (b) b.style.display = 'none'; }
  else $('#backBtn').href = `/room/${ROOM}/setup`;

  // Load the real dice engine manifest (textures/materials/colorsets) + seeded
  // templates from the server, then rebuild the affected panels. Both fall back to
  // the bundled defaults in data.js if the fetch fails.
  async function loadManifest() {
    try {
      const r = await fetch('/assets/dice-manifest.json');
      if (r.ok) { BR.MANIFEST = await r.json(); if (st.mode === 'dice') renderDiceProps(); } // texture grid + material use the manifest
    } catch (e) {}
  }
  async function loadTemplates() {
    try {
      const r = await fetch(TOKEN ? `/u/${TOKEN}/templates` : `/room/${ROOM}/templates`);
      if (!r.ok) return;
      const d = await r.json();
      if (Array.isArray(d.templates) && d.templates.length) { BR.TEMPLATES = d.templates; buildTemplatesPanel(); }
    } catch (e) {}
  }

  // ============================================================ BOOT
  applyArt(); buildZones(); applyLang();
  setZoom(1); fetchWho();
  loadManifest();
  loadTemplates();
  loadExisting();
  new ResizeObserver(() => recomputeFont()).observe(plaqueEl);
  // expose for dice module
  BR.getDiceConfig = function () {
    const s = st.dice; const texture = s.texture, material = s.material;
    if (s.custom) return { theme_texture: texture, theme_material: material, theme_customColorset: { foreground: s.custom.foreground, background: s.custom.background, outline: s.custom.edge, edge: s.custom.edge, texture, material } };
    return { theme_customColorset: null, theme_colorset: s.colorset, theme_texture: texture, theme_material: material };
  };
  BR.afterEngine = function (note) { const n = $('#engineNote'); if (n) n.textContent = note; };

  // ── export current plaque as core defaults ─────────────────────────────────
  // Dump the LIVE editor state (the selected template's zones + colors, exactly as
  // you've tuned them on screen) as paste-ready blocks for the core: a SHARED-DEFAULT
  // block (zonesArcane() body + DEFAULT_COLORS, used by every template) and a
  // PER-TEMPLATE OVERRIDE block keyed by the current template id. Run
  // `BR.exportTemplate()` in the DevTools console — it logs the blocks and copies them
  // to the clipboard. See CLAUDE.md → "Aligning template defaults".
  BR.exportTemplate = function () {
    const r1 = (n) => Math.round((+n || 0) * 10) / 10;
    const r2 = (n) => Math.round((+n || 0) * 100) / 100;
    const r3 = (n) => Math.round((+n || 0) * 1000) / 1000;
    const zline = (z, pad) => `${pad}{ id: '${z.id}', kind: '${z.kind}', cx: ${r1(z.cx)}, cy: ${r1(z.cy)}, w: ${r1(z.w)}, coef: ${r3(z.coef)}, fs: ${r2(z.fs)}, align: '${z.align}', colorKey: ${z.colorKey ? `'${z.colorKey}'` : 'null'}, visible: ${z.visible !== false}, locked: ${!!z.locked} },`;
    const zonesAt = (pad) => st.zones.map((z) => zline(z, pad)).join('\n');
    const colors = `{ accent: '${st.colors.accent}', badge: '${st.colors.badge}', name: '${st.colors.name}' }`;
    const id = st.templateId;
    const out = [
      `/* ===== SHARED DEFAULT (every template) — src/templates.js + data.js ===== */`,
      `// → DEFAULT_COLORS / TPL_DEFAULT_COLORS:`,
      `${colors}`,
      `// → zonesArcane() return body:`,
      `return [`,
      zonesAt('    '),
      `];`,
      ``,
      `/* ===== PER-TEMPLATE OVERRIDE for "${id}" — add to TEMPLATE_OVERRIDES (templates.js) / TPL_OVERRIDES (data.js) ===== */`,
      `  ${JSON.stringify(id)}: {`,
      `    colors: ${colors},`,
      `    zones: [`,
      zonesAt('      '),
      `    ],`,
      `  },`,
    ].join('\n');
    try { navigator.clipboard.writeText(out); console.log('%c[export] copied to clipboard ✓', 'color:#3ad17a;font-weight:700'); } catch (e) { console.log('[export] (clipboard blocked — copy from below)'); }
    console.log(out);
    return out;
  };
})();
