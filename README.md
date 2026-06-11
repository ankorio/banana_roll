# Roll20 → OBS Overlay

Put your Roll20 dice rolls on stream as animated overlays. A tiny Node relay (no
dependencies) receives rolls from a Tampermonkey userscript and pushes them to an
OBS Browser Source over SSE.

```
Roll20 tab (userscript) --HTTP POST--> Node relay (in-memory rooms) --SSE--> OBS Browser Source
```

## Quick start (local)

```bash
npm start                 # boots on http://localhost:8765
```

Then:

1. **Create a room:** `curl -X POST localhost:8765/rooms` → returns `overlayUrl`, `setupUrl`,
   and a `publishToken`. (Or just install the userscript — it self-provisions.)
2. **Install the userscript:** open `http://localhost:8765/roll20-capture.user.js` with
   [Tampermonkey](https://www.tampermonkey.net/) installed. The server bakes its own origin
   into the script. On first run in Roll20 it provisions a room and opens the setup page.
3. **Add to OBS:** Sources → **+** → **Browser**, paste the `overlayUrl`, set the size to your
   canvas. The background is transparent.
4. **Roll dice** in Roll20 — they appear on the overlay. The userscript reads rolls straight from
   Roll20's Firebase data feed, so every player's rolls are captured, not just yours.

**Per-player overlays:** the userscript's on-page panel lists the players it sees and gives each a
filtered overlay URL (`…/overlay?player=<playerid>`) alongside the all-players one — handy for a
per-player scene or a solo cam overlay.

Preview without OBS: open the overlay URL in a browser tab and press **T** for a fake roll
(cycles normal → crit → fumble).

## Test

```bash
npm run smoke   # spawns the server, asserts create/SSE/dedup/retained-replay/403
```

## Configuration (env)

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `8765` | Listen port |
| `BASE_URL` | derived from request | Absolute URL base for generated links (set in production) |
| `STATE_FILE` | _(unset)_ | Path to persist rooms to disk so they survive restarts (e.g. `.state.json`). Off = in-memory only. Single-instance only. |
| `ROOM_TTL` | `21600000` (6h) | Idle room lifetime (ms) before sweep |
| `MAX_ROOMS` | `5000` | Global room cap |
| `CREATE_RATE_MAX` / `CREATE_RATE_WINDOW` | `10` / `60000` | Per-IP `/rooms` limit |
| `ROLL_RATE_MAX` / `ROLL_RATE_WINDOW` | `20` / `1000` | Per-room roll limit |
| `CLIENTS_MAX` | `50` | SSE clients per room |
| `SEEN_MAX` | `500` | Bounded dedup window per room |

## Deploy notes

- Use a host that allows **long-lived connections** (Fly / Railway / Render web service / VPS) —
  **not** serverless functions.
- Set `BASE_URL` to your public HTTPS origin so generated links are correct.
- Behind nginx, disable buffering for the SSE stream (the server also sets
  `X-Accel-Buffering: no`):
  ```nginx
  location /room/ { proxy_buffering off; proxy_pass http://127.0.0.1:8765; }
  ```
- Run under a process manager with auto-restart. State is in-memory: a restart drops all
  rooms (they're cheap to recreate).

## Security model

Both URLs are **bearer capabilities** — anyone with a link can use it. The publish token
appears only in the `POST /rooms` response and inside your installed userscript; it is never
sent over SSE or shown on any room-id-only page. Ids and tokens are 128-bit. See `CLAUDE.md`
for the full invariants.

## Layout

```
src/server.js                  http server + routing
src/rooms.js                   in-memory room store, rate limits, TTL sweep
public/overlay.html            transparent OBS overlay (EventSource + animations)
public/setup.html              per-room setup page
public/roll20-capture.user.js  Tampermonkey capture script — hooks Roll20's Firebase transport (origin templated on serve)
scripts/smoke.mjs              end-to-end smoke test
poc/                           throwaway ticking-number POC for OBS import testing
```
