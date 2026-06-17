/* ============================================================================
   Triggers — the "when": pure data binding a roll outcome to an effect id.
   Adding an effect to the game = add a recipe file + one line here. Nothing in
   the Conductor, Timeline, Director, or onBeforeRender ever changes.
   `when(roll)` is a predicate over the roll; `play` is a registered effect id,
   OR a function `(roll) => id` that picks one at fire time (e.g. random choice).
   `overlay: false` keeps a trigger out of the live OBS overlay (playground/demo only);
   the Director skips it when called with `{ overlay: true }`.
   `key` names the result category so the overlay can disable it per room setting
   (the Director skips a trigger whose key is in `opts.disabled`).
   ========================================================================== */

export const TRIGGERS = [
  { when: (r) => !!r && r.mode === 'advantage',    play: 'voidHole', overlay: false, key: 'advantage' },   // advantage → loser spirals into the drain (demo/playground only)
  // disadvantage → randomly ONE of the two showcase animations: the Mage scene or the Void Dome
  { when: (r) => !!r && r.mode === 'disadvantage', play: () => (Math.random() < 0.5 ? 'mageRabbit' : 'voidDome'), key: 'disadvantage' },
  { when: (r) => !!r && r.isCrit,   play: 'critGlow',   key: 'crit'   },   // nat 20 → golden glow on the die
  { when: (r) => !!r && r.isFumble, play: 'fumbleGlow', key: 'fumble' },   // nat 1 → red glow, the "1" hottest
];
