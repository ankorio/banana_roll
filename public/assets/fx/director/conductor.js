/* ============================================================================
   Conductor — the ONLY owner of the per-frame tick for outcome VFX.
   It speaks one language: the FxInstance contract
       { tick(dt) -> boolean(alive), dispose() }
   Hand it any instance via spawn(); it advances each one every frame and reaps
   the finished ones. Nothing above this file ever touches Box.onBeforeRender.
   ========================================================================== */

export class Conductor {
  constructor(Box) {
    this.Box = Box;
    this.active = new Set();   // live FxInstances
    this._off = null;          // onBeforeRender unsubscribe
  }

  // Attach our single frame hook (idempotent). Coexists with the particle
  // layer's own hook — the engine keeps an ARRAY of beforeRender callbacks.
  attach() {
    if (!this._off) this._off = this.Box.onBeforeRender((dt) => this._tick(Math.min(0.05, dt || 0)));
    return this;
  }

  detach() {
    if (this._off) { try { this._off(); } catch {} this._off = null; }
    for (const inst of this.active) { try { inst.dispose?.(); } catch {} }
    this.active.clear();
  }

  // Hand the Conductor any FxInstance and forget about it.
  spawn(instance) {
    if (!instance) return null;
    this.active.add(instance);
    try { this.Box.start(); } catch {}   // make sure frames are flowing
    return instance;
  }

  _tick(dt) {
    for (const inst of this.active) {
      let alive = true;
      try { alive = inst.tick(dt) !== false; }
      catch (e) { console.warn('[fx] instance tick failed', e); alive = false; }
      if (!alive) {
        try { inst.dispose?.(); } catch (e) { console.warn('[fx] dispose failed', e); }
        this.active.delete(inst);
      }
    }
    // NOTE: we intentionally do NOT call Box.stop() here. Loop idling is still
    // owned by the particle layer (BRFX.maybeIdle) + the dice engine. Unify this
    // once particles converge into the Conductor (architecture decision #4).
  }
}
