# Roll20 → OBS Overlay

Relay Roll20 dice rolls onto a stream overlay.

```
Roll20 tab (userscript: relay raw chat records) --HTTP POST--> Node server (parse + rooms, in-memory) --SSE--> OBS Browser Source (overlay)
```

## Run
- `npm start` — boots the server on `PORT` (default 8765); runs `dice:build` first (`prestart`).
- `npm run dice:build` — rebuild the vendored dice engine + manifest after adding custom textures
  (see **Dice styles** below).
- `npm run smoke` — end-to-end smoke test (create room, SSE, post + duplicate, bad token).
- Env: `PORT`, `BASE_URL` (absolute URL base for generated links), `ROOM_TTL` (ms),
  `MAX_ROOMS`, rate-limit knobs (see `src/rooms.js`).
- **Caching:** `serveFile` sends code/markup (`.html/.js/.css/.json`) as `no-cache` + an
  ETag (always revalidate → instant edits, cheap `304` when unchanged); heavy media
  (textures/sounds/fonts/art) keeps `max-age=86400`. `NO_CACHE=1` forces `no-cache` on
  everything **and** re-reads the in-memory `landing.html`/userscript templates per request
  (dev: see edits without a server restart or Ctrl+F5).

## Architecture
- **Capture = Firebase transport hook (thin relay).** The userscript runs at `document-start`
  and hooks the page's `WebSocket` (via `unsafeWindow`) to read Roll20's Firebase Realtime DB
  frames, plus wraps `ref.on` for clean players-roster snapshots. It does **no dice parsing**:
  it forwards each *raw* chat record (keyed by its Firebase push-id) to the relay. It only
  (a) drops history replayed on initial sync (push-id embedded timestamp) and (b) never relays
  secret types (`whisper`/`gmrollresult`), so private rolls don't leave the page. It also indexes
  the synced `/characters` node (token image / bio avatar, keyed by characterid + name) and stamps
  the matching character's token-image URL onto each relayed record as `msg.avatar` — the chat
  record itself carries no portrait, so this is how the overlay's plaque portrait gets filled.
- **Parse = server (`src/parser.js`).** The server turns a raw Roll20 chat record into the overlay
  roll shape: flattens `inlinerolls`/rolltemplates, picks the shown roll honoring
  advantage/disadvantage, labels it from `{{rname}}`, and applies crit/fumble rules. Crit/fumble is
  **pluggable per game `system`** (default `dnd5e`; `generic` = totals only) so new systems or rule
  tweaks ship server-side with **no userscript update**. The Firebase transport encodes arrays as
  objects with numeric-string keys — `toArray` normalizes them. Unit-tested in `npm test`.
- **Ingress = HTTP POST** from the userscript via `GM_xmlhttpRequest` (CSP-safe; the only
  way to reach the relay that Roll20's `connect-src` doesn't block). `/chat` takes raw records
  (server parses); `/roll` takes an already-parsed roll (tests / non-Roll20 producers).
- **Egress = SSE** (`EventSource`) to the overlay — one-way, native, auto-reconnecting.
- **State = in-memory**, single instance. Each room holds its publish token, retained last
  roll, connected SSE clients, and a bounded set of seen message ids.
- **No broker** (Redis/NATS) until either >1 server instance OR a non-browser consumer.

## API contract (keep stable)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/rooms` | IP rate-limit | Create room → `{ room, publishToken, overlayUrl, setupUrl }` |
| POST | `/room/:id/chat` | `?token=` | Ingest a raw Roll20 chat record `{ id, msg, ts? }`; server parses → roll; dedup by id; broadcast. Echoes the parsed `roll` (or `null`) |
| POST | `/room/:id/roll` | `?token=` | Ingest one already-parsed roll; dedup by message id; broadcast |
| POST | `/room/:id/players` | `?token=` | Userscript pushes the Roll20 roster `[{id,name,color,online,userid}]`; stored on the room. `id` = per-campaign player id; `userid` = stable Roll20 account id (`d20userid`) used to key cross-campaign profiles |
| GET  | `/room/:id/players` | room id | Read the roster (no token; same names/ids as the per-player overlay URLs) — drives the setup page's per-player links |
| GET  | `/room/:id/events` | room id | SSE stream; replays retained last-roll on connect |
| GET  | `/room/:id/ping` | room id | Heartbeat liveness; 200 if room exists, 404 if lost (drives userscript re-provision) |
| GET  | `/room/:id/overlay` | room id | Overlay HTML (`?player=<playerid>` filters to one player) |
| GET  | `/room/:id/setup` | room id | Human setup page |
| GET  | `/room/:id/styles` | room id | Read the per-player dice styles map `{ styles, defaultStyle }` (drives the customize page) |
| POST | `/room/:id/styles?player=<pid\|default>` | room id | Set one player's dice style (or the room default); body `{ style }`. Cosmetic, validated, rate-limited. A real `pid` is mirrored to that player's cross-room profile |
| GET  | `/room/:id/templates` | room id | List seeded plaque templates (frame art + default zones + editable color map) for the customizer |
| GET  | `/room/:id/plaque` | room id | Read the per-player plaque configs `{ plaques, defaultPlaque }` |
| POST | `/room/:id/plaque?player=<pid\|default>` | room id | Set one player's plaque config (or the room default); body is the plaque config (`{ templateId, colors, zones, background }`). Validated (`validatePlaque` in `src/templates.js`), larger body cap for the inline base64 PNG background, rate-limited. A real `pid` is mirrored to the cross-room profile |
| GET  | `/room/:id/profile?player=<pid>` | room id | Read a player's cross-room profile `{ style, plaque }` (what they saved in any previous room); seeds the customizer when this room has nothing yet |
| GET/POST | `/room/:id/settings` | room id | Read/set room settings `{ displaySeconds, system, confetti, sound, hideGm }`; `system` selects the parser's crit/fumble rules |
| GET  | `/room/:id/customize` | room id | Self-serve Canva-style dice + plaque editor (`?player=<pid>`; `default` = all-players fallback) |
| GET  | `/assets/<path>` | none | Static vendored assets (plaque PNG, fonts, dice engine bundle, textures, sounds, `dice-manifest.json`, customizer `editor.{js,css}`/`data.js`); nested paths allowed, traversal-guarded to `public/assets/` |
| GET  | `/healthz` | none | Liveness |

**Plaque config + cross-room profiles:** the customize page (`public/customize.html` +
`public/assets/customizer/{data,editor}.js`, `editor.css`) is a three-pane editor that styles a
player's **dice** (existing `/styles` shape) and their **plaque** (a `templateId` + editable
`colors` + draggable `zones` + an optional inline base64-PNG `background`, validated in
`src/templates.js`). Dice → `/styles`, plaque → `/plaque` (two stores). Saving for a real player also writes a
**global profile keyed by the player's stable Roll20 account id** (`d20userid`, carried on the roster
as `userid` — *not* the per-campaign player id, which changes every game), via `rooms.saveProfile`.
So the look follows the **account** across campaigns: when the userscript pushes the roster, the
server resolves each player's `userid` (`useridFor`) and seeds that campaign's `room.styles`/
`room.plaques[playerid]` from the account profile if the room has nothing yet (read-on-demand, off the
per-roll path). The per-campaign `playerid` still drives roll filtering, per-player overlay URLs, and
display; only the **profile key** is the account id. Requires userscript ≥ 0.8.0 (older scripts omit
`userid`, so customizations stay per-campaign). The live overlay does **not** yet render `plaqueConfig` (deferred — it keeps
its fixed CSS plaque); plaque configs persist but don't drive the overlay yet.

**Aligning template defaults (live tuning → core):** templates are seeded server-side in
`src/templates.js`. Every template uses one shared layout (`zonesArcane()`) + `DEFAULT_COLORS`;
a template id listed in `TEMPLATE_OVERRIDES` uses its own `zones`/`colors` instead (omit a field
to keep the shared default). `public/assets/customizer/data.js` mirrors this (`TPL_OVERRIDES`) as
the editor's offline fallback — templates.js is the source of truth (the editor loads
`GET /room/:id/templates`). To promote what you tuned in the customizer into the core: open the
plaque in the customize page (it loads any saved config into `BR.state`), tune it, then run
**`BR.exportTemplate()`** in the DevTools console. It logs + clipboard-copies two paste-ready
blocks — a SHARED-DEFAULT block (paste into `zonesArcane()` + `DEFAULT_COLORS`, applies to all)
and a PER-TEMPLATE OVERRIDE block keyed by the current template id (paste into `TEMPLATE_OVERRIDES`
/ `TPL_OVERRIDES`). Restart the server (or `NO_CACHE=1`) to pick up the change.

**Roll event shape:** (`id` is the Firebase chat push-id; `playerid` is optional)
```json
{ "id": "<firebase-chat-key>", "who": "Player", "formula": "Fire Bolt: 1d20 + 7", "total": 23,
  "dice": [{ "sides": "20", "value": 16, "crit": false, "fumble": false }],
  "modifier": 7, "mode": "normal", "d20": null,
  "isCrit": false, "isFumble": false, "playerid": "-OSo…", "avatar": "https://files.d20.io/…",
  "ts": 1733800000000 }
```
`modifier` is the flat bonus (`total − Σdice`) shown as `+N`/`−N`. `mode` is
`normal | advantage | disadvantage`; for adv/dis, `d20: { values:[v1,v2], keptIndex }`
carries both d20s so the overlay rolls two dice and selects the winner. The overlay reads
`playerid` so a per-player overlay URL (`…/overlay?player=<playerid>`) shows only that
player's rolls; omit the param for the all-players overlay. `style` (optional) is the rolling
player's dice look (see **Dice styles** below), stamped on the roll server-side at ingest.
`avatar` (optional, http(s) only)
is the rolling character's token image, set by the userscript from `/characters` (`msg.avatar`).
The overlay loads it as an `<img>` and falls back to a coloured initials disc when it's absent or
fails to load — note Roll20's *account* avatar endpoint (`app.roll20.net/users/avatar/…`) is
CORP-blocked cross-origin so it can't be used; the `files.d20.io` token CDN loads fine.

**Overlay rendering:** the overlay (`public/overlay.html`) is the **Arcane Plaque** design — an
ornate frame (`/assets/arcane-plaque.png`, Cinzel from Google Fonts) whose zones map to the roll:
a circular **portrait** (the `avatar`), the big **total**, plus boxes for the roll name, dice
breakdown (`🎲 16 + 7`), advantage/disadvantage badge, and crit/fumble tag. Behind it, **predetermined**
3D physics dice roll via [`@3d-dice/dice-box-threejs`](https://github.com/3d-dice/dice-box-threejs)
(notation like `2d20@13,8` lands on the parser's exact values; transparent canvas for OBS), with
crit/fumble particles (`canvas-confetti`). The dice engine, textures, sounds, confetti, and font are
**vendored under `public/assets/` and load local-first** (CDN only as a last-resort fallback), so a
CDN outage never breaks the overlay; everything still **degrades gracefully** (plaque-only, serif) if
all sources fail. The `CONFIG` block at the top of the overlay `<script>` is the **default** dice
look; zone CSS uses `cqw` so every box scales with the plaque.

## Dice styles (per-player customization)
- **A style** is a small cosmetic object — `{ texture, material, colorset?, foreground?, background?,
  edge? }` (all optional) — describing how one player's dice look. Stored per room: `room.styles`
  (`playerid → style`) and `room.defaultStyle`. Set via the self-serve **customize page**
  (`/room/:id/customize?player=<pid>`); the setup page links one per roster player plus a `default`.
  Writes are room-id capability (no publish token — a player link can't carry the secret), validated
  (`validateStyle` in `src/server.js`), size-capped, and rate-limited.
- **How it renders:** the server stamps the rolling player's style onto each roll as `roll.style` at
  ingest (`styleForRoll`); the overlay's `styleToConfig` maps it to dice-box-threejs config and calls
  `Box.updateConfig(...)` to **re-theme per roll** before tossing. Custom colors → `theme_customColorset`;
  otherwise a named `theme_colorset` + texture + material. Missing fields fall back to `CONFIG`.
- **Adding your own textures (drop-in + build):** put a `.webp` in `public/assets/custom-textures/`,
  add one entry to `dice-textures.json` (`{ "<id>": { "file", "name"?, "material"?, "bump"? } }`), then
  run `npm run dice:build`. `scripts/build-dice.mjs` injects it into the texturelist of the vendored
  upstream engine (anchored on the `cloudy:` key) → `public/assets/dice-box/dice-box.bundle.js`, and
  regenerates `public/assets/dice-manifest.json` (textures + colorsets + materials) that drives the
  customize-page pickers. The manifest only advertises built-in textures whose art is actually vendored.
  `npm start` runs the build first (`prestart`). Bump the pinned upstream version → re-vendor
  `public/assets/dice-box/upstream/` (engine `.es.js` + `const/*.mjs`); the build throws loudly if the
  injection anchor is missing.

## Invariants
- The **publish token is never** sent over SSE, shown on the overlay, or returned by any
  room-id-only endpoint. It appears only in the `POST /rooms` response and inside the userscript.
- **Room ids and tokens are high-entropy and unguessable** (128-bit via `crypto`); no enumeration endpoint.
- Rolls are **idempotent by `id`** (the Firebase chat push-id) within a room.
- The server is **single-instance and stateless across restarts** (in-memory only). Losing state
  just means rooms must be recreated. Don't add persistence without revisiting the broker decision.
- Treat both URLs as **bearer capabilities**: link = access.
