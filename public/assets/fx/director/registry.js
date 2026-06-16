/* ============================================================================
   Registry — the "what": a map of effect id -> build(ctx) factory.
   A recipe self-registers by importing defineEffect and calling it. The Director
   builds an effect by id at roll time. build(ctx) may return an FxInstance, null
   (nothing to do), or a Promise<FxInstance|null> (async, e.g. loads a model).
   ========================================================================== */

const REGISTRY = new Map();

export function defineEffect(id, build) {
  if (REGISTRY.has(id)) console.warn('[fx] effect re-defined:', id);
  REGISTRY.set(id, build);
}

export function buildEffect(id, ctx) {
  const build = REGISTRY.get(id);
  if (!build) { console.warn('[fx] unknown effect:', id); return null; }
  try { return build(ctx); }
  catch (e) { console.warn('[fx] effect build failed:', id, e); return null; }
}

export function effectIds() { return [...REGISTRY.keys()]; }
