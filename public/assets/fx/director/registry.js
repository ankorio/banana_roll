/* ============================================================================
   Registry — the "what": a map of effect id -> build(ctx) factory.
   A recipe self-registers by importing defineEffect and calling it. The Director
   builds an effect by id at roll time. build(ctx) may return an FxInstance, null
   (nothing to do), or a Promise<FxInstance|null> (async, e.g. loads a model).
   ========================================================================== */

const REGISTRY = new Map();

// A recipe registers a build(ctx) factory and, optionally, a preload(box) that
// warms its heavy assets (models, atlases, shader programs) ahead of the first
// trigger so the overlay never stalls mid-roll. preload is idempotent per recipe
// (each recipe's loaders are promise-caches) and may return a Promise.
export function defineEffect(id, build, preload) {
  if (REGISTRY.has(id)) console.warn('[fx] effect re-defined:', id);
  REGISTRY.set(id, { build, preload });
}

export function buildEffect(id, ctx) {
  const entry = REGISTRY.get(id);
  if (!entry) { console.warn('[fx] unknown effect:', id); return null; }
  try { return entry.build(ctx); }
  catch (e) { console.warn('[fx] effect build failed:', id, e); return null; }
}

// Warm every registered effect's heavy assets. Errors are swallowed per-recipe
// (a missing asset must never block the others or break the overlay).
export function preloadAll(box) {
  const jobs = [];
  for (const [id, entry] of REGISTRY) {
    if (typeof entry.preload !== 'function') continue;
    try { jobs.push(Promise.resolve(entry.preload(box)).catch((e) => console.warn('[fx] preload failed:', id, e))); }
    catch (e) { console.warn('[fx] preload threw:', id, e); }
  }
  return Promise.allSettled(jobs);
}

export function effectIds() { return [...REGISTRY.keys()]; }
