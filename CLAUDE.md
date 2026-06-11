# Roll20 → OBS Overlay

Relay Roll20 dice rolls onto a stream overlay.

```
Roll20 tab (userscript: relay raw chat records) --HTTP POST--> Node server (parse + rooms, in-memory) --SSE--> OBS Browser Source (overlay)
```

## Run
- `npm start` — boots the server on `PORT` (default 8765).
- `npm run smoke` — end-to-end smoke test (create room, SSE, post + duplicate, bad token).
- Env: `PORT`, `BASE_URL` (absolute URL base for generated links), `ROOM_TTL` (ms),
  `MAX_ROOMS`, rate-limit knobs (see `src/rooms.js`).

## Architecture
- **Capture = Firebase transport hook (thin relay).** The userscript runs at `document-start`
  and hooks the page's `WebSocket` (via `unsafeWindow`) to read Roll20's Firebase Realtime DB
  frames, plus wraps `ref.on` for clean players-roster snapshots. It does **no dice parsing**:
  it forwards each *raw* chat record (keyed by its Firebase push-id) to the relay. It only
  (a) drops history replayed on initial sync (push-id embedded timestamp) and (b) never relays
  secret types (`whisper`/`gmrollresult`), so private rolls don't leave the page.
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
| POST | `/room/:id/players` | `?token=` | Userscript pushes the Roll20 roster `[{id,name,color,online}]`; stored on the room |
| GET  | `/room/:id/players` | room id | Read the roster (no token; same names/ids as the per-player overlay URLs) — drives the setup page's per-player links |
| GET  | `/room/:id/events` | room id | SSE stream; replays retained last-roll on connect |
| GET  | `/room/:id/ping` | room id | Heartbeat liveness; 200 if room exists, 404 if lost (drives userscript re-provision) |
| GET  | `/room/:id/overlay` | room id | Overlay HTML (`?player=<playerid>` filters to one player) |
| GET  | `/room/:id/setup` | room id | Human setup page |
| GET  | `/healthz` | none | Liveness |

**Roll event shape:** (`id` is the Firebase chat push-id; `playerid` is optional)
```json
{ "id": "<firebase-chat-key>", "who": "Player", "formula": "1d20 + 5", "total": 23,
  "dice": [{ "sides": "20", "value": 18, "crit": false, "fumble": false }],
  "isCrit": false, "isFumble": false, "playerid": "-OSo…", "ts": 1733800000000 }
```
The overlay reads `playerid` so a per-player overlay URL (`…/overlay?player=<playerid>`) shows
only that player's rolls; omit the param for the all-players overlay. The userscript builds these
URLs from the live players roster it observes on the Firebase `/players` node.

## Invariants
- The **publish token is never** sent over SSE, shown on the overlay, or returned by any
  room-id-only endpoint. It appears only in the `POST /rooms` response and inside the userscript.
- **Room ids and tokens are high-entropy and unguessable** (128-bit via `crypto`); no enumeration endpoint.
- Rolls are **idempotent by `id`** (the Firebase chat push-id) within a room.
- The server is **single-instance and stateless across restarts** (in-memory only). Losing state
  just means rooms must be recreated. Don't add persistence without revisiting the broker decision.
- Treat both URLs as **bearer capabilities**: link = access.
