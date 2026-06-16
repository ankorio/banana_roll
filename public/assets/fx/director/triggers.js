/* ============================================================================
   Triggers — the "when": pure data binding a roll outcome to an effect id.
   Adding an effect to the game = add a recipe file + one line here. Nothing in
   the Conductor, Timeline, Director, or onBeforeRender ever changes.
   `when(roll)` is a predicate over the roll; `play` is a registered effect id.
   ========================================================================== */

export const TRIGGERS = [
  { when: (r) => !!r && r.mode && r.mode !== 'normal', play: 'voidHole' },   // adv/dis → loser falls into the void
  { when: (r) => !!r && r.isCrit,   play: 'critGlow'   },   // nat 20 → the die shines & glows
  { when: (r) => !!r && r.isFumble, play: 'mageRabbit' },   // nat 1 → mage turns the die into a rabbit that flees
];
