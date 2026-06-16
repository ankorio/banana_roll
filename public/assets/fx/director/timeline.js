/* ============================================================================
   Timeline — the GRAMMAR for authoring an effect's full lifecycle declaratively.
   It knows nothing about dice, mages, or explosions. It only knows generic verbs:

     .call(at, fn)              fire a callback at absolute time `at` (seconds)
     .tween(target, to, opts)   animate numeric props of `target` toward `to`
                                  opts: { at=0, dur=0.3, ease='linear', from? }
     .spin(target, rates, opts) add rates {x,y,z} (rad/s) to target.rotation
                                  opts: { at=0, dur=∞ }
     .drive(fn)                 run fn(dt, t) EVERY frame for the whole lifetime
                                  (this is where an AnimationMixer.update lives)
     .duration(sec)             force total length (else inferred from the steps)
     .onEnd(fn)                 cleanup, run exactly once when finished/disposed
     .build()                   compile to an FxInstance { tick, dispose }

   All the `t += dt` bookkeeping lives HERE, once — recipes never write it.
   ========================================================================== */

const EASINGS = {
  linear:    (t) => t,
  easeIn:    (t) => t * t,
  easeOut:   (t) => 1 - (1 - t) * (1 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
};
const easeFn = (e) => (typeof e === 'function' ? e : EASINGS[e] || EASINGS.linear);
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const snapshot = (target, props) => { const o = {}; for (const k in props) o[k] = target[k]; return o; };

export function timeline() {
  const calls  = [];   // { at, fn, done }
  const tweens = [];   // { target, to, from, at, end, ease, started }
  const spins  = [];   // { target, rates, at, end }
  const drives = [];   // fn(dt, t)
  const ends   = [];   // fn()
  let explicitDuration = null;

  const api = {
    call(at, fn) { calls.push({ at, fn, done: false }); return api; },

    tween(target, to, opts = {}) {
      const at = opts.at || 0;
      const dur = opts.dur != null ? opts.dur : 0.3;
      tweens.push({ target, to, from: opts.from || null, at, end: at + dur, ease: easeFn(opts.ease), started: false });
      return api;
    },

    spin(target, rates, opts = {}) {
      const at = opts.at || 0;
      spins.push({ target, rates, at, end: opts.dur != null ? at + opts.dur : Infinity });
      return api;
    },

    drive(fn) { drives.push(fn); return api; },
    duration(sec) { explicitDuration = sec; return api; },
    onEnd(fn) { ends.push(fn); return api; },

    build() {
      // Total lifetime: explicit, or the latest moment anything is scheduled to end.
      let dur = explicitDuration != null ? explicitDuration : 0;
      if (explicitDuration == null) {
        for (const tw of tweens) dur = Math.max(dur, tw.end);
        for (const c of calls)   dur = Math.max(dur, c.at);
        for (const s of spins)   if (s.end !== Infinity) dur = Math.max(dur, s.end);
        if (dur === 0) dur = 0.001;
      }

      let t = 0, disposed = false;

      return {
        tick(dt) {
          t += dt;

          // timed callbacks (fire once)
          for (const c of calls) {
            if (!c.done && t >= c.at) { c.done = true; try { c.fn(); } catch (e) { console.warn('[fx] call failed', e); } }
          }

          // tweens (capture `from` lazily at first activation so it respects live state)
          for (const tw of tweens) {
            if (t < tw.at) continue;
            if (!tw.started) { tw.started = true; if (!tw.from) tw.from = snapshot(tw.target, tw.to); }
            const local = clamp01((t - tw.at) / Math.max(1e-6, tw.end - tw.at));
            const e = tw.ease(local);
            for (const k in tw.to) tw.target[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * e;
          }

          // continuous spins
          for (const s of spins) {
            if (t < s.at || t > s.end) continue;
            const r = s.rates, rot = s.target.rotation;
            if (rot) { if (r.x) rot.x += r.x * dt; if (r.y) rot.y += r.y * dt; if (r.z) rot.z += r.z * dt; }
          }

          // per-frame drivers (e.g. AnimationMixer.update)
          for (const d of drives) { try { d(dt, t); } catch (e) { console.warn('[fx] drive failed', e); } }

          return t < dur;   // finished once we pass the total lifetime
        },

        dispose() {
          if (disposed) return; disposed = true;
          for (const fn of ends) { try { fn(); } catch (e) { console.warn('[fx] onEnd failed', e); } }
        },
      };
    },
  };

  return api;
}
