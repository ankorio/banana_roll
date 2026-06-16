/* ============================================================================
   Context — the "where / who" handed to every recipe. It resolves the abstract
   roll into concrete scene objects and exposes intent-level helpers, so recipes
   never reach into Box internals or repeat the physics-ownership dance.

   ctx = {
     roll,                       the roll data
     Box, scene,                 escape hatch for the rare custom case
     dice: { all, winner, loser },   resolved THREE meshes (loser=null on normal)
     fx(name, opts),             fire an existing particle effect (BRFX)
     seize(die),                 take a die off physics → you own its transform
     removeDie(die),             remove + dispose a die's mesh
     worldOf(die),               the die's world position
   }
   ========================================================================== */

export function createContext(Box, BRFX, roll) {
  const all = Box.diceList ? Box.diceList.slice() : [];

  // Resolve winner/loser. adv/dis carries d20.keptIndex; the dice come out in
  // notation order, so the kept index maps straight onto diceList.
  let winner = all[0] || null;
  let loser = null;
  if (roll && roll.d20 && roll.d20.keptIndex != null && all.length >= 2) {
    const w = roll.d20.keptIndex === 0 ? 0 : 1;
    winner = all[w] || null;
    loser = all[w === 0 ? 1 : 0] || null;
  }

  return {
    roll,
    Box,
    scene: Box.scene,
    dice: { all, winner, loser },

    fx(name, opts) {
      try { return BRFX.play(name, opts); }
      catch (e) { console.warn('[fx] BRFX.play failed:', name, e); }
    },

    // Detach the die from the physics world so the engine stops driving its
    // transform from the rigid body — now the recipe owns position/scale/rotation.
    seize(die) {
      if (!die) return;
      // Defensive: groupFinished() skips bodyless dice, so if we null the body
      // before the engine has recorded this die's value, its .result stays empty
      // and buildResults() later crashes on result.at(-1). Mark it 'remove' first
      // (buildResults skips removed dice) so detaching can never corrupt a group.
      try { if (Array.isArray(die.result) && die.result.length === 0) die.storeRolledValue?.('remove'); } catch {}
      if (die.body) {
        try { Box.world.removeBody(die.body); } catch {}
        die.body = null;
      }
    },

    removeDie(die) {
      if (!die) return;
      try { Box.scene.remove(die); } catch {}
      try {
        die.traverse?.((n) => {
          n.geometry?.dispose?.();
          const m = n.material;
          if (m) (Array.isArray(m) ? m : [m]).forEach((x) => x?.dispose?.());
        });
      } catch {}
      if (Box.diceList) {
        const i = Box.diceList.indexOf(die);
        if (i !== -1) Box.diceList.splice(i, 1);
      }
      // The engine keeps shadowMap.autoUpdate OFF (only re-bakes on a roll), so a die
      // removed outside that path leaves a stale baked shadow. Force one refresh.
      try { if (Box.renderer && Box.renderer.shadowMap) Box.renderer.shadowMap.needsUpdate = true; } catch {}
    },

    worldOf(die) { return die ? die.position : null; },
  };
}
