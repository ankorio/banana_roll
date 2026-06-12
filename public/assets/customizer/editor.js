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

  const ROOM = (location.pathname.match(/\/room\/([^/]+)\//) || [])[1] || 'demo';
  const PLAYER = new URLSearchParams(location.search).get('player') || 'default';
  BR.room = ROOM; BR.player = PLAYER;

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
    dice: { colorset: 'white', material: 'glass', texture: 'marble', custom: null },
    trigger: 'crit',
    tool: 'templates',
    mode: 'plaque',           // plaque | dice (canvas emphasis)
    selected: null,           // zone id | 'bg' | null
    zoom: 1,
    portraitImg: null,
  };

  const tpl = () => BR.TEMPLATES.find((t) => t.id === st.templateId);
  const zone = (id) => st.zones.find((z) => z.id === id);

  // ---- DOM refs -------------------------------------------------------------
  const plaqueEl = $('#plaque');
  const stageEl = $('#stage');
  const scaleEl = $('#canvasScale');
  const propsEl = $('#props');

  // ============================================================ RENDER PLAQUE
  let plaqueW = 1;
  function recomputeFont() {
    plaqueW = plaqueEl.getBoundingClientRect().width || 1;
    st.zones.forEach((z) => {
      const el = $(`.zone[data-id="${z.id}"]`);
      if (!el || z.kind === 'image') return;
      const px = plaqueW * z.coef * z.fs;
      const zc = el.querySelector('.zc'); if (zc) zc.style.fontSize = px + 'px';
    });
  }

  function buildZones() {
    // remove old
    $$('.zone', plaqueEl).forEach((e) => e.remove());
    st.zones.forEach((z) => {
      const el = document.createElement('div');
      el.className = 'zone' + (z.kind === 'pill' ? ' pill' : '') + (z.kind === 'image' ? ' portrait' : '');
      el.dataset.id = z.id; el.dataset.kind = z.kind;
      const zc = document.createElement(z.kind === 'image' ? 'div' : 'div');
      zc.className = 'zc';
      el.appendChild(zc);
      ['tl', 'tr', 'bl', 'br'].forEach((h) => { const hd = document.createElement('span'); hd.className = 'h ' + h; hd.dataset.h = h; el.appendChild(hd); });
      plaqueEl.appendChild(el);
      attachZoneEvents(el, z);
    });
    layoutZones();
    paintZoneContent();
    applyColors();
    requestAnimationFrame(recomputeFont);
  }

  function layoutZones() {
    st.zones.forEach((z) => {
      const el = $(`.zone[data-id="${z.id}"]`); if (!el) return;
      el.style.left = z.cx + '%'; el.style.top = z.cy + '%';
      if (z.kind === 'image') { el.style.width = z.w + '%'; el.style.height = ''; } /* height from aspect-ratio:1 → perfect circle */
      else if (z.kind === 'pill') { el.style.width = 'auto'; }
      else { el.style.width = z.w + '%'; }
      el.style.display = z.visible ? '' : 'none';
      const zc = el.querySelector('.zc'); if (zc && z.align) zc.style.textAlign = z.align;
    });
  }

  function paintZoneContent() {
    const trg = BR.TRIGGERS.find((t) => t.id === st.trigger) || BR.TRIGGERS[0];
    plaqueEl.classList.remove('crit', 'fumble');
    if (trg.cls) plaqueEl.classList.add(trg.cls);
    setZoneText('total', String(trg.total));
    setZoneText('breakdown', '🎲 ' + trg.die + '  +  ' + trg.mod);
    setZoneText('rname', zone('rname')?.sample || 'Longsword Attack');
    setZoneText('name', zone('name')?.sample || 'Seraphina');
    // portrait
    const pz = $('.zone[data-id="portrait"] .zc');
    if (pz) {
      if (st.portraitImg) { pz.innerHTML = ''; const im = $('.zone[data-id="portrait"] img'); if (!im) { const img = document.createElement('img'); img.src = st.portraitImg; $('.zone[data-id="portrait"]').appendChild(img); } }
      else { const im = $('.zone[data-id="portrait"] img'); if (im) im.remove(); pz.textContent = (zone('name')?.sample || 'S').slice(0, 1).toUpperCase(); }
    }
    // badge
    const bz = $('.zone[data-id="badge"]');
    if (bz) {
      const show = !!trg.badge && zone('badge').visible;
      bz.style.display = show ? '' : 'none';
      setZoneText('badge', trg.badge === 'disadvantage' ? D().dis : D().adv);
    }
    // tag
    const tz = $('.zone[data-id="tag"]');
    if (tz) {
      const show = !!trg.tag && zone('tag').visible;
      tz.style.display = show ? '' : 'none';
      setZoneText('tag', trg.tag === 'fumble' ? D().fumble_tag : D().crit_tag);
    }
  }
  function setZoneText(id, txt) { const zc = $(`.zone[data-id="${id}"] .zc`); if (zc && !zc.querySelector('img')) zc.textContent = txt; }

  function applyColors() {
    plaqueEl.style.setProperty('--accent', st.colors.accent);
    plaqueEl.style.setProperty('--namecol', st.colors.name);
    plaqueEl.style.setProperty('--badgecol', st.colors.badge);
    st.zones.forEach((z) => {
      const zc = $(`.zone[data-id="${z.id}"] .zc`); if (!zc) return;
      if (z.kind === 'text') { zc.style.color = z.colorKey ? st.colors[z.colorKey] : ''; }
    });
  }

  function applyArt() {
    plaqueEl.classList.remove('frame-blank', 'frame-obsidian');
    const art = st.customBg || st.art;
    let bg = $('.bg-art', plaqueEl);
    if (art) {
      if (!bg) { bg = document.createElement('div'); bg.className = 'bg-art'; plaqueEl.insertBefore(bg, plaqueEl.firstChild); }
      bg.style.backgroundImage = `url("${art}")`;
      bg.style.backgroundSize = st.customBg ? 'cover' : '100% 100%';
    } else {
      if (bg) bg.remove();
      plaqueEl.classList.add('frame-' + (st.frame || 'blank'));
    }
  }

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
    if (mode === 'dice') { plaqueEl.classList.add('dimmed'); if (BR.previewDice) BR.previewDice(); }
    else { plaqueEl.classList.remove('dimmed'); $('#diceLayer').classList.remove('on'); }
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

  function buildDicePanel() {
    const grid = $('#diceGrid'); grid.innerHTML = '';
    // The real dice engine ships its own colorsets/textures/materials (vendored
    // dice-manifest.json). When the manifest is loaded, only advertise curated swatch
    // tiles whose colorset id actually exists, and source the dropdowns from it.
    const man = BR.MANIFEST;
    const manCS = man && man.colorsets ? new Set(man.colorsets.map((c) => c.id)) : null;
    BR.DICE_COLORSETS.filter((c) => !manCS || manCS.has(c.id)).forEach((c) => {
      const t = document.createElement('button'); t.className = 'ctile'; t.dataset.cs = c.id; t.title = c.name;
      t.style.background = c.rep;
      t.setAttribute('aria-pressed', String(c.id === st.dice.colorset && !st.dice.custom));
      t.addEventListener('click', () => { st.dice.colorset = c.id; st.dice.custom = null; syncDiceGrid(); diceChanged(); });
      grid.appendChild(t);
    });
    const cust = document.createElement('button'); cust.className = 'ctile custom'; cust.dataset.cs = 'custom'; cust.title = D().dice_custom;
    cust.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
    cust.setAttribute('aria-pressed', String(!!st.dice.custom));
    cust.addEventListener('click', () => { st.dice.custom = st.dice.custom || { foreground: '#ffffff', background: '#a01010', edge: '#220000' }; $('#customColors').classList.remove('hide'); syncDiceGrid(); diceChanged(); });
    grid.appendChild(cust);

    const mats = (man && man.materials && man.materials.length) ? man.materials : BR.MATERIALS;
    const texs = (man && man.textures && man.textures.length) ? man.textures : BR.TEXTURES;
    const mat = $('#matSel'); mat.innerHTML = '';
    mats.forEach((m2) => { const o = document.createElement('option'); o.value = m2; o.textContent = m2; mat.appendChild(o); });
    mat.value = st.dice.material;
    const tex = $('#texSel'); tex.innerHTML = '';
    texs.forEach((tx) => { const o = document.createElement('option'); o.value = tx.id; o.textContent = tx.name; tex.appendChild(o); });
    tex.value = st.dice.texture;
    mat.onchange = () => { st.dice.material = mat.value; diceChanged(); };
    tex.onchange = () => { st.dice.texture = tex.value; diceChanged(); };
    $('#cc_fg').oninput = () => { st.dice.custom.foreground = $('#cc_fg').value; diceChanged(); };
    $('#cc_bg').oninput = () => { st.dice.custom.background = $('#cc_bg').value; diceChanged(); };
    $('#cc_edge').oninput = () => { st.dice.custom.edge = $('#cc_edge').value; diceChanged(); };
    $('#customColors').classList.toggle('hide', !st.dice.custom);
  }
  function syncDiceGrid() {
    $$('#diceGrid .ctile').forEach((t) => t.setAttribute('aria-pressed', String((t.dataset.cs === st.dice.colorset && !st.dice.custom) || (t.dataset.cs === 'custom' && !!st.dice.custom))));
    $('#customColors').classList.toggle('hide', !st.dice.custom);
  }
  let diceT = null;
  function diceChanged() { clearTimeout(diceT); diceT = setTimeout(() => { if (st.mode === 'dice' && BR.previewDice) BR.previewDice(); }, 200); }

  function buildColorsPanel() {
    const wrap = $('#colorBlocks'); wrap.innerHTML = '';
    const keys = [['accent', D().c_accent, BR.ACCENTS], ['badge', D().c_badge, BR.BADGE_COLORS], ['name', D().c_name, BR.ACCENTS]];
    keys.forEach(([key, label, palette]) => {
      const editable = st.editable[key];
      const block = document.createElement('div'); block.className = 'color-block' + (editable ? '' : ' locked');
      const head = document.createElement('div'); head.className = 'cbh';
      head.innerHTML = `<b>${label}</b>` + (editable ? '' : `<span class="lockchip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>${D().locked}</span>`);
      block.appendChild(head);
      const sw = document.createElement('div'); sw.className = 'swatches';
      palette.forEach((hex) => {
        const b = document.createElement('button'); b.className = 'sw'; b.style.background = hex; b.title = hex;
        b.setAttribute('aria-pressed', String(hex.toLowerCase() === (st.colors[key] || '').toLowerCase()));
        b.addEventListener('click', () => { st.colors[key] = hex; applyColors(); buildColorsPanel(); });
        sw.appendChild(b);
      });
      // custom picker
      const pick = document.createElement('label'); pick.className = 'sw'; pick.style.background = st.colors[key]; pick.style.display = 'grid'; pick.style.placeItems = 'center';
      pick.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="2" style="filter:drop-shadow(0 1px 2px #0008)"><path d="M12 5v14M5 12h14"/></svg><input type="color" value="' + st.colors[key] + '" style="position:absolute;opacity:0;width:1px;height:1px">';
      pick.querySelector('input').addEventListener('input', (e) => { st.colors[key] = e.target.value; applyColors(); buildColorsPanel(); });
      sw.appendChild(pick);
      block.appendChild(sw);
      wrap.appendChild(block);
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
      if (z.colorKey) html += `<div class="pgroup"><div class="pg-head"><b>${D().pr_color}</b>${colorEditable ? `<input type="color" id="pp_color" value="${st.colors[z.colorKey]}" style="width:46px;height:30px">` : `<span class="lockchip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>${D().locked}</span>`}</div></div>`;
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
    const col = $('#pp_color'); if (col) col.oninput = () => { st.colors[z.colorKey] = col.value; applyColors(); buildColorsPanel(); };
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
  function fireTrigger(id) {
    st.trigger = id;
    $$('#triggers button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.trig === id)));
    const trg = BR.TRIGGERS.find((t) => t.id === id);
    paintZoneContent(); // always set correct plaque state immediately
    // dice roll is a visual flourish layered on top; never let it block the plaque
    if (BR.playRoll && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMode('plaque');
      $('#diceLayer').classList.add('on'); // dice roll over the plaque — no dimming overlay
      const restore = () => { $('#diceLayer').classList.remove('on'); };
      const timeout = new Promise((r) => setTimeout(r, 2600));
      Promise.race([Promise.resolve(BR.playRoll(trg.die)).catch(() => {}), timeout]).then(restore);
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
    if (st.dice.custom) Object.assign(s, st.dice.custom); else s.colorset = st.dice.colorset;
    return s;
  }
  $('#saveBtn').addEventListener('click', async () => {
    const pill = $('#savedPill'); const btn = $('#saveBtn');
    btn.disabled = true; const old = btn.querySelector('span').textContent; btn.querySelector('span').textContent = D().saving;
    // Dice → /styles, plaque → /plaque (two independent stores server-side).
    let ok = true;
    try {
      const r = await fetch(`/room/${ROOM}/styles?player=${encodeURIComponent(PLAYER)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ style: dicePayload() }) });
      ok = r.ok;
    } catch (e) { ok = false; }
    try {
      const r2 = await fetch(`/room/${ROOM}/plaque?player=${encodeURIComponent(PLAYER)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ templateId: st.templateId, colors: st.colors, zones: st.zones, background: st.customBg }) });
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
    if (ds.colorset) { st.dice.colorset = ds.colorset; st.dice.custom = null; }
    if (ds.foreground || ds.background) st.dice.custom = { foreground: ds.foreground || '#fff', background: ds.background || '#a01010', edge: ds.edge || '#220000' };
    buildDicePanel();
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
    if (PLAYER === 'default') { $('#whoName').textContent = D().allPlayers; return; }
    $('#whoName').textContent = PLAYER;
    try { const r = await fetch(`/room/${ROOM}/players`); if (!r.ok) return; const d = await r.json(); const p = (d.players || []).find((x) => x.id === PLAYER); if (p) { $('#whoName').textContent = p.name; $('#whoDot').style.background = p.color || 'var(--gold)'; if (p.name) { zone('name').sample = p.name; paintZoneContent(); } } } catch (e) {}
  }
  function applyLang() {
    document.documentElement.lang = lang; document.title = D().doc;
    $$('[data-i18n]').forEach((el) => { const v = D()[el.getAttribute('data-i18n')]; if (v != null) el.innerHTML = v; });
    $$('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    buildRail(); buildTriggers(); buildTemplatesPanel(); buildDicePanel(); buildColorsPanel(); renderZonesList();
    paintZoneContent(); renderProps();
    if (PLAYER === 'default') $('#whoName').textContent = D().allPlayers;
  }
  $$('[data-lang]').forEach((b) => b.addEventListener('click', () => { lang = b.dataset.lang; try { localStorage.setItem('ovr_lang', lang); } catch (e) {} applyLang(); }));

  $('#modeSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setMode(b.dataset.mode); });
  $('#backBtn').href = `/room/${ROOM}/setup`;

  // Load the real dice engine manifest (textures/materials/colorsets) + seeded
  // templates from the server, then rebuild the affected panels. Both fall back to
  // the bundled defaults in data.js if the fetch fails.
  async function loadManifest() {
    try {
      const r = await fetch('/assets/dice-manifest.json');
      if (r.ok) { BR.MANIFEST = await r.json(); if (st.tool === 'dice') buildDicePanel(); else buildDicePanel(); }
    } catch (e) {}
  }
  async function loadTemplates() {
    try {
      const r = await fetch(`/room/${ROOM}/templates`);
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
})();
