/* ============================================================================
   Banana Roll — Customizer data layer
   Templates, default zone layouts, dice colorsets, accent palette, i18n.
   Loaded before editor.js (defines window.BR).
   ========================================================================== */
(function () {
  const BR = (window.BR = window.BR || {});

  /* Plaque aspect ratio comes from the reference art (398 × 440). */
  BR.PLAQUE_AR = 398 / 440;

  /* --- zone factory --------------------------------------------------------
     kind:  image | text | pill
     cx/cy: center position as % of the plaque box
     w:     wrap width as % of plaque width (pills hug content, ignore for layout)
     coef:  font size as a fraction of plaque width (text/pill only)
     fs:    user font-scale multiplier (1 = template default)
     colorKey: which template color drives it (accent | name | badge | null)
  --------------------------------------------------------------------------- */
  function zonesArcane() {
    return [
        { id: 'portrait', kind: 'image', cx: 50, cy: 21.6, w: 21.5, coef: 0, fs: 1, align: 'center', colorKey: null, visible: true, locked: false },
        { id: 'name', kind: 'text', cx: 50, cy: 43, w: 70, coef: 0.034, fs: 1, align: 'center', colorKey: 'name', visible: true, locked: false },
        { id: 'badge', kind: 'pill', cx: 50, cy: 50, w: 0, coef: 0.024, fs: 1, align: 'center', colorKey: 'badge', visible: true, locked: false },
        { id: 'total', kind: 'text', cx: 50, cy: 62.8, w: 50, coef: 0.205, fs: 1, align: 'center', colorKey: 'accent', visible: true, locked: false },
        { id: 'rname', kind: 'text', cx: 50, cy: 75, w: 82, coef: 0.041, fs: 1, align: 'center', colorKey: 'accent', visible: true, locked: false },
        { id: 'breakdown', kind: 'text', cx: 50, cy: 81.4, w: 60, coef: 0.031, fs: 1, align: 'center', colorKey: 'name', visible: true, locked: false },
        { id: 'tag', kind: 'pill', cx: 50, cy: 90.1, w: 0, coef: 0.028, fs: 1, align: 'center', colorKey: 'accent', visible: true, locked: false },
    ];
  }

  /* Labels shown in the zones list / properties panel. */
  BR.ZONE_LABELS = {
    en: { portrait: 'Portrait', name: 'Character name', badge: 'Advantage badge', total: 'Total', rname: 'Roll name', breakdown: 'Dice breakdown', tag: 'Result tag' },
    es: { portrait: 'Retrato', name: 'Nombre', badge: 'Distintivo de ventaja', total: 'Total', rname: 'Nombre de tirada', breakdown: 'Desglose de dados', tag: 'Etiqueta de resultado' },
  };

  /* --- templates ----------------------------------------------------------
     Offline fallback list (the editor replaces this with GET /room/:id/templates
     at boot). Image templates all share the Arcane zone layout; keep in sync with
     ART_TEMPLATES in src/templates.js.
  --------------------------------------------------------------------------- */
  const TPL_DEFAULT_COLORS = { accent: '#ffd24a', badge: '#2e7d32', name: '#e6c87f' };
  const TPL_ALL_EDITABLE = { accent: true, badge: true, name: true };
  BR.TEMPLATES = [
    ['arcane',        'Arcane Plaque', 'arcane-plaque.png', { accent: true, badge: true, name: false }],
    ['generic',       'Generic',       'generic.png'],
    ['artificer',     'Artificer',     'artificer.png'],
    ['barbarian',     'Barbarian',     'barbarian.png'],
    ['bard',          'Bard',          'bard.png'],
    ['cleric',        'Cleric',        'cleric.png'],
    ['druid',         'Druid',         'druid.png'],
    ['fighter',       'Fighter',       'fighter.png'],
    ['monk',          'Monk',          'monk.png'],
    ['paladin',       'Paladin',       'paladin.png'],
    ['ranger',        'Ranger',        'ranger.png'],
    ['rogue',         'Rogue',         'rogue.png'],
    ['sorcerer',      'Sorcerer',      'sorcerer.png'],
    ['warlock',       'Warlock',       'warlock.png'],
    ['wizard',        'Wizard',        'wizard.png'],
    ['reymys',        'Reymys',        'reymys.png'],
    ['tiron',         'Tiron',         'tiron.png'],
    ['rafi',          'Rafi',          'rafi.png'],
    ['huesped',       'Huesped',       'huesped.png'],
    ['jenny',         'Jenny',         'jenny.png'],
    ['luna',          'Luna',          'luna.png'],
  ];

  // Per-template overrides (offline fallback mirror of TEMPLATE_OVERRIDES in
  // src/templates.js — the editor normally replaces BR.TEMPLATES with GET
  // /room/:id/templates, so templates.js is the source of truth; this keeps the
  // offline fallback faithful). Same shape; `sample` on zones is optional.
  const TPL_OVERRIDES = {
    // wizard: { colors: { accent: '#7db8ff' }, zones: [ /* … */ ] },
  };
  BR.TEMPLATES = BR.TEMPLATES.map(([id, name, file, editable]) => {
    const o = TPL_OVERRIDES[id] || {};
    return {
      id, name,
      art: '/assets/plaque_templates/' + file,
      colors: { ...TPL_DEFAULT_COLORS, ...(o.colors || {}) },
      editable: editable || { ...TPL_ALL_EDITABLE },
      zones: o.zones ? o.zones.map((z) => ({ ...z })) : zonesArcane(),
    };
  });

  /* Accent swatch palette (plaque). */
  BR.ACCENTS = ['#ffd24a', '#ff7a7a', '#5fd08a', '#7db8ff', '#c08bff', '#ff8fbf', '#ffae57', '#e8e8ee'];
  BR.BADGE_COLORS = ['#2e7d32', '#1f6feb', '#b58900', '#8957e5', '#444b5a', '#c0392b'];

  /* --- dice colorsets (grid). rep = swatch color shown in the grid. -------- */
  BR.DICE_COLORSETS = [
    { id: 'white',   name: 'Ivory',    rep: '#ece9e0' },
    { id: 'black',   name: 'Obsidian', rep: '#1b1b22' },
    { id: 'bronze',  name: 'Bronze',   rep: '#b87333' },
    { id: 'fire',    name: 'Fire',     rep: '#ff5a2c' },
    { id: 'ice',     name: 'Ice',      rep: '#7fd3ff' },
    { id: 'poison',  name: 'Poison',   rep: '#7bd647' },
    { id: 'arcane',  name: 'Arcane',   rep: '#b07bff' },
    { id: 'bloodmoon', name: 'Blood',  rep: '#a01828' },
    { id: 'gold',    name: 'Gold',     rep: '#ffd24a' },
    { id: 'rose',    name: 'Rose',     rep: '#ff8fbf' },
    { id: 'emerald', name: 'Emerald',  rep: '#1f8a5b' },
    { id: 'midnight', name: 'Midnight', rep: '#2a3b6e' },
  ];

  BR.MATERIALS = ['glass', 'plastic', 'metal', 'wood', 'pearl', 'none'];
  BR.TEXTURES = [
    { id: 'marble', name: 'Marble' }, { id: 'glass', name: 'Glass' },
    { id: 'wood', name: 'Wood' }, { id: 'metal', name: 'Metal' },
    { id: 'cloudy', name: 'Cloudy' }, { id: 'stone', name: 'Stone' }, { id: 'none', name: 'Smooth' },
  ];

  /* --- preconfigured dice presets (left flyout; a random subset shown per load) ----
     texture ids are real engine textures that also have a /assets/textures/<id>.webp. */
  BR.DICE_PRESETS = [
    { name: 'Nebula',           foreground: '#f6f6f2', background: '#f14a16', edge: '#370665', material: 'glass', texture: 'stars' },
    { name: 'Sunforge',         foreground: '#f8f1f1', background: '#db6400', edge: '#16697a', material: 'metal', texture: 'fire' },
    { name: 'Voidbloom',        foreground: '#ebd3f8', background: '#ad49e1', edge: '#2e073f', material: 'glass', texture: 'astral' },
    { name: 'Royal Parchment',  foreground: '#f9f5eb', background: '#1c3879', edge: '#0e1c3c', material: 'none', texture: 'paper' },
    { name: 'Glacier',          foreground: '#e8f0f2', background: '#39a2db', edge: '#053742', material: 'glass', texture: 'ice' },
    { name: 'Wildwood',         foreground: '#cdd2b8', background: '#2b5748', edge: '#273338', material: 'wood', texture: 'wood' },
    { name: 'Carnival',         foreground: '#f0d43a', background: '#f23557', edge: '#3b4a6b', material: 'glass', texture: 'stainedglass' },
    { name: 'Driftgold',        foreground: '#f1d18a', background: '#255965', edge: '#032a33', material: 'metal', texture: 'marble' },
    { name: 'Emberlime',        foreground: '#fff6c2', background: '#ff7f3f', edge: '#a8350f', material: 'plastic', texture: 'cloudy' },
    { name: 'Neon Hex',         foreground: '#fff338', background: '#c400ff', edge: '#3a0050', material: 'glass', texture: 'glitter' },
    { name: 'Jade Spark',       foreground: '#ffdc34', background: '#00918e', edge: '#110133', material: 'glass', texture: 'dragon' },
    { name: 'Orchid',           foreground: '#f6f6f2', background: '#9145b6', edge: '#4c3f91', material: 'glass', texture: 'speckles' },
    { name: 'Harbor',           foreground: '#efefef', background: '#f66b0e', edge: '#112b3c', material: 'metal', texture: 'metal' },
    { name: 'Crimson Court',    foreground: '#f1f8fd', background: '#c70039', edge: '#900c27', material: 'glass', texture: 'marble' },
    { name: 'Deepcyan',         foreground: '#10262c', background: '#00b7c2', edge: '#063a40', material: 'glass', texture: 'water' },
    { name: 'Mosswind',         foreground: '#2f5249', background: '#97b067', edge: '#1d3329', material: 'none', texture: 'leopard' },
    { name: 'Lavender Dusk',    foreground: '#0b1d51', background: '#8ccdeb', edge: '#091740', material: 'glass', texture: 'cloudy' },
    { name: 'Cobalt Sun',       foreground: '#ffeb00', background: '#344cb7', edge: '#000957', material: 'glass', texture: 'stars' },
    { name: 'Sageveil',         foreground: '#001524', background: '#d6cc99', edge: '#7a7150', material: 'none', texture: 'marble' },
    { name: 'Wine & Gold',      foreground: '#8e1d41', background: '#ffcd19', edge: '#5a1228', material: 'metal', texture: 'glitter' },
    { name: 'Steelblue',        foreground: '#f5f2e7', background: '#2666cf', edge: '#152033', material: 'metal', texture: 'metal' },
    { name: 'Bloodmead',        foreground: '#620808', background: '#f4ce74', edge: '#3a0505', material: 'glass', texture: 'marble' },
    { name: 'Lagoon',           foreground: '#faf35e', background: '#069a8e', edge: '#055049', material: 'glass', texture: 'water' },
    { name: 'Sapphire',         foreground: '#bfe6fb', background: '#2e79ba', edge: '#081f37', material: 'glass', texture: 'ice' },
    { name: 'Shadowking',       foreground: '#d9b8ff', background: '#3f0071', edge: '#000000', material: 'metal', texture: 'astral' },
    { name: 'Nebula Frost',     foreground: '#f6f6f2', background: '#f14a16', edge: '#370665', material: 'metal', texture: 'marble' },
    { name: 'Glacier Glass',    foreground: '#e8f0f2', background: '#39a2db', edge: '#053742', material: 'glass', texture: 'stainedglass' },
    { name: 'Voidbloom Stone',  foreground: '#ebd3f8', background: '#7a1cac', edge: '#2e073f', material: 'none', texture: 'skulls' },
    { name: 'Carnival Spark',   foreground: '#f0d43a', background: '#f23557', edge: '#3b4a6b', material: 'glass', texture: 'glitter' },
    { name: 'Crimson Forge',    foreground: '#f1f8fd', background: '#c70039', edge: '#900c27', material: 'metal', texture: 'fire' },
  ];

  /* Per-channel example palettes for the right-panel color sections. */
  BR.DICE_COLOR_PALETTES = {
    foreground: ['#ffffff', '#ffd24a', '#eaffff', '#ffe9c0', '#f3e9ff', '#7db8ff', '#3a2c10', '#000000'],
    background: ['#a01010', '#b41f2a', '#2b6c88', '#0f5a7a', '#15151c', '#1f6b3a', '#7b4bb0', '#b8860b', '#b87333', '#3a3a48', '#2a1d6e', '#e7e0cf'],
    edge:       ['#000000', '#220000', '#2a0000', '#0a2330', '#06210f', '#2a153f', '#3a2a00', '#14141a', '#ffffff'],
  };

  /* --- trigger states (preview events on the canvas) ----------------------- */
  BR.TRIGGERS = [
    { id: 'normal', die: 12, mod: 5,  total: 17, badge: null,           tag: null,  cls: '' },
    { id: 'adv',    die: 19, mod: 5,  total: 24, badge: 'advantage',    tag: null,  cls: '' },
    { id: 'dis',    die: 4,  mod: 5,  total: 9,  badge: 'disadvantage', tag: null,  cls: '' },
    { id: 'crit',   die: 20, mod: 8,  total: 28, badge: 'advantage',    tag: 'crit', cls: 'crit' },
    { id: 'fumble', die: 1,  mod: 2,  total: 3,  badge: null,           tag: 'fumble', cls: 'fumble' },
  ];

  /* --- i18n ---------------------------------------------------------------- */
  BR.I18N = {
    en: {
      doc: 'Customize — Banana Roll', brandsub: 'Editor',
      back: 'Room panel', styling: 'Editing for', allPlayers: 'All players · default',
      save: 'Save', saved: 'Saved', saving: 'Saving…', savefail: 'Save failed — relay unreachable',
      // rail
      tool_templates: 'Templates', tool_upload: 'Upload', tool_dice: 'Dice', tool_colors: 'Colors', tool_zones: 'Zones',
      // panels
      p_templates_h: 'Templates', p_templates_d: 'Pick a base plaque. Each one sets its own art and which colors you can change.',
      locked_colors: 'Some colors are locked', all_editable: 'All colors editable',
      p_upload_h: 'Background image', p_upload_d: 'Upload your own plaque art, crop it to fit, then nudge the zones to match.',
      upload_btn: 'Upload image', upload_hint: 'PNG or JPG · transparent PNG recommended', replace: 'Replace', remove: 'Remove',
      using_custom: 'Using your uploaded art', using_template: 'Using template art',
      p_dice_h: 'The dice', p_dice_d: 'Color and material of the rolling dice. Pick a color to preview it on the canvas.',
      p_dice_presets_d: 'Pick a starting look, then fine-tune it on the right.',
      p_dice_tune_h: 'Fine-tune',
      dice_color: 'Color', dice_custom: 'Custom…', dice_material: 'Material', dice_texture: 'Texture',
      custom_fg: 'Numbers', custom_bg: 'Body', custom_edge: 'Edge',
      p_colors_h: 'Plaque colors', p_colors_d: 'Recolor the editable parts of this template.',
      c_accent: 'Accent', c_badge: 'Badge', c_name: 'Name', locked: 'Locked',
      p_zones_h: 'Zones', p_zones_d: 'Click a zone on the canvas to move, resize or hide it.',
      // canvas
      trig_normal: 'Normal', trig_adv: 'Advantage', trig_dis: 'Disadvant.', trig_crit: 'Critical', trig_fumble: 'Fumble',
      fit: 'Fit', mode_dice: 'Dice', mode_plaque: 'Plaque', play_test: 'Play test roll',
      // properties
      props: 'Properties', no_sel_h: 'Nothing selected', no_sel_d: 'Click a zone on the canvas, or pick a tool on the left.',
      pr_visible: 'Visible', pr_pos: 'Position', pr_size: 'Size', pr_font: 'Font size', pr_align: 'Align', pr_color: 'Color',
      pr_x: 'X', pr_y: 'Y', pr_w: 'Width', pr_bg_h: 'Background image', pr_scale: 'Scale', pr_reset: 'Reset zone',
      bg_sel: 'Background', bg_d: 'Position and scale the plaque art.',
      // crop modal
      crop_h: 'Crop your image', crop_d: 'Drag to reposition, use the slider to zoom. The frame matches the plaque shape.', crop_zoom: 'Zoom', crop_cancel: 'Cancel', crop_apply: 'Use image',
      // misc
      engineLocal: 'Dice engine: ready', engineCdn: 'Dice engine: CDN fallback', engineOff: 'Dice engine unavailable — plaque preview only',
      nudge_hint: 'Arrow keys nudge · ⇧ for bigger steps', adv: 'Advantage', dis: 'Disadvantage', crit_tag: 'Critical hit!', fumble_tag: 'Fumble!',
    },
    es: {
      doc: 'Personalizar — Banana Roll', brandsub: 'Editor',
      back: 'Panel de sala', styling: 'Editando para', allPlayers: 'Todos los jugadores · por defecto',
      save: 'Guardar', saved: 'Guardado', saving: 'Guardando…', savefail: 'Error al guardar — relay no disponible',
      tool_templates: 'Plantillas', tool_upload: 'Subir', tool_dice: 'Dados', tool_colors: 'Colores', tool_zones: 'Zonas',
      p_templates_h: 'Plantillas', p_templates_d: 'Elige una placa base. Cada una define su arte y qué colores puedes cambiar.',
      locked_colors: 'Algunos colores están bloqueados', all_editable: 'Todos los colores editables',
      p_upload_h: 'Imagen de fondo', p_upload_d: 'Sube tu propia placa, recórtala para encajarla y ajusta las zonas.',
      upload_btn: 'Subir imagen', upload_hint: 'PNG o JPG · se recomienda PNG transparente', replace: 'Reemplazar', remove: 'Quitar',
      using_custom: 'Usando tu imagen subida', using_template: 'Usando el arte de la plantilla',
      p_dice_h: 'Los dados', p_dice_d: 'Color y material de los dados. Elige un color para verlo en el lienzo.',
      p_dice_presets_d: 'Elige un estilo base y ajústalo en el panel derecho.',
      p_dice_tune_h: 'Ajuste fino',
      dice_color: 'Color', dice_custom: 'Propio…', dice_material: 'Material', dice_texture: 'Textura',
      custom_fg: 'Números', custom_bg: 'Cuerpo', custom_edge: 'Borde',
      p_colors_h: 'Colores de la placa', p_colors_d: 'Recolorea las partes editables de esta plantilla.',
      c_accent: 'Acento', c_badge: 'Distintivo', c_name: 'Nombre', locked: 'Bloqueado',
      p_zones_h: 'Zonas', p_zones_d: 'Haz clic en una zona del lienzo para moverla, redimensionarla u ocultarla.',
      trig_normal: 'Normal', trig_adv: 'Ventaja', trig_dis: 'Desventaja', trig_crit: 'Crítico', trig_fumble: 'Pifia',
      fit: 'Ajustar', mode_dice: 'Dados', mode_plaque: 'Placa', play_test: 'Tirada de prueba',
      props: 'Propiedades', no_sel_h: 'Nada seleccionado', no_sel_d: 'Haz clic en una zona del lienzo o elige una herramienta a la izquierda.',
      pr_visible: 'Visible', pr_pos: 'Posición', pr_size: 'Tamaño', pr_font: 'Tamaño de fuente', pr_align: 'Alinear', pr_color: 'Color',
      pr_x: 'X', pr_y: 'Y', pr_w: 'Ancho', pr_bg_h: 'Imagen de fondo', pr_scale: 'Escala', pr_reset: 'Restablecer zona',
      bg_sel: 'Fondo', bg_d: 'Posiciona y escala el arte de la placa.',
      crop_h: 'Recorta tu imagen', crop_d: 'Arrastra para reposicionar, usa el control para acercar. El marco coincide con la placa.', crop_zoom: 'Zoom', crop_cancel: 'Cancelar', crop_apply: 'Usar imagen',
      engineLocal: 'Motor de dados: listo', engineCdn: 'Motor de dados: respaldo CDN', engineOff: 'Motor de dados no disponible — solo placa',
      nudge_hint: 'Flechas para mover · ⇧ pasos mayores', adv: 'Ventaja', dis: 'Desventaja', crit_tag: '¡Crítico!', fumble_tag: '¡Pifia!',
    },
  };

  BR.clone = (o) => JSON.parse(JSON.stringify(o));
})();
