/* ============================================================================
   Triggers — the "when": pure data binding a roll outcome to an effect id.
   Adding an effect to the game = add a recipe file + one line here. Nothing in
   the Conductor, Timeline, Director, or onBeforeRender ever changes.
   `when(roll)` is a predicate over the roll; `play` is a registered effect id,
   OR a function `(roll) => id` that picks one at fire time (e.g. random choice).
   ========================================================================== */

export const TRIGGERS = [
  { when: (r) => !!r && r.mode === 'advantage',    play: 'voidHole' },   // advantage → loser spirals into the drain
  // disadvantage → randomly ONE of the two showcase animations: the Mage scene or the Void Dome
  { when: (r) => !!r && r.mode === 'disadvantage', play: () => (Math.random() < 0.5 ? 'mageRabbit' : 'voidDome') },
  { when: (r) => !!r && r.isCrit,   play: 'critGlow'   },   // nat 20 → golden glow on the die
  { when: (r) => !!r && r.isFumble, play: 'fumbleGlow' },   // nat 1 → red glow, the "1" hottest
];
