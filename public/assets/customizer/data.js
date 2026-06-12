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
      { id: 'portrait',  kind: 'image', cx: 50, cy: 21.6, w: 21.5, coef: 0,     fs: 1, align: 'center', colorKey: null,    visible: true,  locked: false, sample: 'S' },
      { id: 'name',      kind: 'text',  cx: 50, cy: 39.8, w: 70,   coef: 0.034, fs: 1, align: 'center', colorKey: 'name',  visible: true,  locked: false, sample: 'Seraphina' },
      { id: 'badge',     kind: 'pill',  cx: 50, cy: 51.5, w: 0,    coef: 0.024, fs: 1, align: 'center', colorKey: 'badge', visible: true,  locked: false, sample: 'Advantage' },
      { id: 'total',     kind: 'text',  cx: 50, cy: 62.8, w: 50,   coef: 0.205, fs: 1, align: 'center', colorKey: 'accent', visible: true, locked: false, sample: '28' },
      { id: 'rname',     kind: 'text',  cx: 50, cy: 75.0, w: 82,   coef: 0.041, fs: 1, align: 'center', colorKey: 'accent', visible: true, locked: false, sample: 'Longsword Attack' },
      { id: 'breakdown', kind: 'text',  cx: 50, cy: 83.2, w: 60,   coef: 0.031, fs: 1, align: 'center', colorKey: 'name',  visible: true,  locked: false, sample: '20 + 8' },
      { id: 'tag',       kind: 'pill',  cx: 50, cy: 91.2, w: 0,    coef: 0.028, fs: 1, align: 'center', colorKey: 'accent', visible: true, locked: false, sample: 'Critical hit!' },
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
  ].map(([id, name, file, editable]) => ({
    id, name,
    art: '/assets/plaque_templates/' + file,
    colors: { ...TPL_DEFAULT_COLORS },
    editable: editable || { ...TPL_ALL_EDITABLE },
    zones: zonesArcane(),
  }));

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
    { name: 'Inferno',     foreground: '#ffd9a0', background: '#a01010', edge: '#2a0000', material: 'metal',   texture: 'fire' },
    { name: 'Frost',       foreground: '#eaffff', background: '#2b6c88', edge: '#0a2330', material: 'glass',   texture: 'ice' },
    { name: 'Marbled',     foreground: '#fff3d6', background: '#b41f2a', edge: '#2a0205', material: 'glass',   texture: 'marble' },
    { name: 'Obsidian',    foreground: '#cfd6e6', background: '#15151c', edge: '#000000', material: 'metal',   texture: 'metal' },
    { name: 'Starfall',    foreground: '#ffd24a', background: '#2a1d6e', edge: '#0a0626', material: 'glass',   texture: 'stars' },
    { name: 'Bone',        foreground: '#3a2c10', background: '#e7e0cf', edge: '#b8a978', material: 'none',    texture: 'paper' },
    { name: 'Abyss',       foreground: '#7db8ff', background: '#0d1b2a', edge: '#05101a', material: 'glass',   texture: 'astral' },
    { name: 'Gilded',      foreground: '#fff8e1', background: '#b8860b', edge: '#3a2a00', material: 'metal',   texture: 'glitter' },
    { name: 'Dragonscale', foreground: '#eafff0', background: '#1f6b3a', edge: '#06210f', material: 'glass',   texture: 'dragon' },
    { name: 'Tideglass',   foreground: '#eaffff', background: '#0f5a7a', edge: '#042230', material: 'glass',   texture: 'water' },
    { name: 'Leopard',     foreground: '#2a1a05', background: '#b07a2a', edge: '#5a3a10', material: 'none',    texture: 'leopard' },
    { name: "Tiger's Eye", foreground: '#ffe9c0', background: '#8a4b1e', edge: '#2a1305', material: 'glass',   texture: 'tiger' },
    { name: 'Amethyst',    foreground: '#f3e9ff', background: '#7b4bb0', edge: '#2a153f', material: 'glass',   texture: 'speckles' },
    { name: 'Bronze',      foreground: '#fff1d6', background: '#b87333', edge: '#3a2208', material: 'metal',   texture: 'bronze01' },
    { name: 'Reliquary',   foreground: '#e8e8ee', background: '#3a3a48', edge: '#14141a', material: 'none',    texture: 'skulls' },
    { name: 'Cathedral',   foreground: '#ffffff', background: '#2b6c88', edge: '#0a2330', material: 'glass',   texture: 'stainedglass' },
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
