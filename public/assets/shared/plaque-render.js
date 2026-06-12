/* ============================================================================
   Banana Roll — shared plaque renderer (window.BRPlaque)
   ----------------------------------------------------------------------------
   The ONE place that turns a plaque config (zones + colors + art) plus a data
   object (a roll OR an editor trigger sample) into positioned DOM inside a
   `.plaque` element. Used by the customizer's edit view and its "Play test roll",
   so what you edit is what plays. (The live overlay adopts this next.)

   Stateless: every function takes the target `plaqueEl` + the data it needs.
   No editing chrome here — pass { editable:true } to build() for resize handles;
   selection/drag/snap live in the editor.

   zone:  { id, kind:'text'|'pill'|'image', cx, cy (center %), w (% width),
            coef (font fraction of plaque width), fs (font scale), align,
            colorKey:'accent'|'badge'|'name'|null, visible, locked }
   data:  { total, breakdown, name, rname, badge:'advantage'|'disadvantage'|null,
            tag:'crit'|'fumble'|null, cls:''|'crit'|'fumble', portraitImg:null|url }
   dict:  i18n strings (adv, dis, crit_tag, fumble_tag) for badge/tag text.
   ========================================================================== */
(function () {
  const q = (root, sel) => root.querySelector(sel);
  const setText = (plaqueEl, id, txt) => {
    const zc = q(plaqueEl, `.zone[data-id="${id}"] .zc`);
    if (zc && !zc.querySelector('img')) zc.textContent = txt == null ? '' : txt;
  };

  const BRPlaque = {
    // Create one `.zone > .zc` per config zone (handles only when editable).
    build(plaqueEl, zones, opts) {
      const editable = !!(opts && opts.editable);
      [...plaqueEl.querySelectorAll('.zone')].forEach((e) => e.remove());
      zones.forEach((z) => {
        const el = document.createElement('div');
        el.className = 'zone' + (z.kind === 'pill' ? ' pill' : '') + (z.kind === 'image' ? ' portrait' : '');
        el.dataset.id = z.id; el.dataset.kind = z.kind;
        const zc = document.createElement('div'); zc.className = 'zc';
        el.appendChild(zc);
        if (editable) {
          ['tl', 'tr', 'bl', 'br'].forEach((h) => {
            const hd = document.createElement('span'); hd.className = 'h ' + h; hd.dataset.h = h; el.appendChild(hd);
          });
        }
        plaqueEl.appendChild(el);
      });
    },

    // Position + size each zone (center %, width %; portrait stays square via CSS aspect-ratio).
    layout(plaqueEl, zones) {
      zones.forEach((z) => {
        const el = q(plaqueEl, `.zone[data-id="${z.id}"]`); if (!el) return;
        el.style.left = z.cx + '%'; el.style.top = z.cy + '%';
        if (z.kind === 'image') { el.style.width = z.w + '%'; el.style.height = ''; }
        else if (z.kind === 'pill') { el.style.width = 'auto'; }
        else { el.style.width = z.w + '%'; }
        el.style.display = z.visible ? '' : 'none';
        const zc = el.querySelector('.zc'); if (zc && z.align) zc.style.textAlign = z.align;
      });
    },

    // Font size = plaque width * coef * fs (so text scales with the plaque).
    recomputeFont(plaqueEl, zones) {
      const plaqueW = plaqueEl.getBoundingClientRect().width || 1;
      zones.forEach((z) => {
        const el = q(plaqueEl, `.zone[data-id="${z.id}"]`);
        if (!el || z.kind === 'image') return;
        const zc = el.querySelector('.zc'); if (zc) zc.style.fontSize = (plaqueW * z.coef * z.fs) + 'px';
      });
    },

    // Apply the color keys (CSS vars drive pill backgrounds + crit/fumble); text zones get their key color.
    applyColors(plaqueEl, colors, zones) {
      plaqueEl.style.setProperty('--accent', colors.accent);
      plaqueEl.style.setProperty('--namecol', colors.name);
      plaqueEl.style.setProperty('--badgecol', colors.badge);
      zones.forEach((z) => {
        const zc = q(plaqueEl, `.zone[data-id="${z.id}"] .zc`); if (!zc) return;
        if (z.kind === 'text') zc.style.color = z.colorKey ? colors[z.colorKey] : '';
      });
    },

    // Background: an uploaded image (cover) or the template art (stretched); else a drawn frame class.
    applyArt(plaqueEl, art) {
      plaqueEl.classList.remove('frame-blank', 'frame-obsidian');
      const src = (art && art.background) || (art && art.art) || null;
      let bg = q(plaqueEl, '.bg-art');
      if (src) {
        if (!bg) { bg = document.createElement('div'); bg.className = 'bg-art'; plaqueEl.insertBefore(bg, plaqueEl.firstChild); }
        bg.style.backgroundImage = `url("${src}")`;
        bg.style.backgroundSize = (art && art.background) ? 'cover' : '100% 100%';
      } else {
        if (bg) bg.remove();
        plaqueEl.classList.add('frame-' + ((art && art.frame) || 'blank'));
      }
    },

    // Fill zone content from a data object (a real roll or the editor's trigger sample).
    paint(plaqueEl, zones, data, dict) {
      dict = dict || {};
      plaqueEl.classList.remove('crit', 'fumble');
      if (data.cls) plaqueEl.classList.add(data.cls);
      setText(plaqueEl, 'total', String(data.total));
      setText(plaqueEl, 'breakdown', data.breakdown);
      setText(plaqueEl, 'rname', data.rname);
      setText(plaqueEl, 'name', data.name);
      // portrait — image if provided, else coloured initial
      const pEl = q(plaqueEl, '.zone[data-id="portrait"]');
      const pz = pEl && pEl.querySelector('.zc');
      if (pEl && pz) {
        if (data.portraitImg) {
          let im = pEl.querySelector('img');
          if (!im) { im = document.createElement('img'); im.referrerPolicy = 'no-referrer'; pEl.appendChild(im); }
          im.onerror = () => { im.remove(); pz.textContent = (data.name || 'S').slice(0, 1).toUpperCase(); };
          im.src = data.portraitImg; pz.textContent = '';
        } else {
          const im = pEl.querySelector('img'); if (im) im.remove();
          pz.textContent = (data.name || 'S').slice(0, 1).toUpperCase();
        }
      }
      const zoneVisible = (id) => { const z = zones.find((x) => x.id === id); return z && z.visible; };
      // advantage/disadvantage badge — shown only when the data carries one AND the zone is visible
      const bz = q(plaqueEl, '.zone[data-id="badge"]');
      if (bz) {
        bz.style.display = (data.badge && zoneVisible('badge')) ? '' : 'none';
        setText(plaqueEl, 'badge', data.badge === 'disadvantage' ? dict.dis : dict.adv);
      }
      // crit/fumble result tag
      const tz = q(plaqueEl, '.zone[data-id="tag"]');
      if (tz) {
        tz.style.display = (data.tag && zoneVisible('tag')) ? '' : 'none';
        setText(plaqueEl, 'tag', data.tag === 'fumble' ? dict.fumble_tag : dict.crit_tag);
      }
    },
  };

  window.BRPlaque = BRPlaque;
})();
