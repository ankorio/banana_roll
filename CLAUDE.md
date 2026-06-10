# Roll20 → OBS Overlay

Relay Roll20 dice rolls onto a stream overlay.

```
Roll20 tab (userscript) --HTTP POST--> Node server (rooms, in-memory) --SSE--> OBS Browser Source (overlay)
```

## Run
- `npm start` — boots the server on `PORT` (default 8765).
- `npm run smoke` — end-to-end smoke test (create room, SSE, post + duplicate, bad token).
- Env: `PORT`, `BASE_URL` (absolute URL base for generated links), `ROOM_TTL` (ms),
  `MAX_ROOMS`, rate-limit knobs (see `src/rooms.js`).

## Architecture
- **Ingress = HTTP POST** from the userscript via `GM_xmlhttpRequest` (CSP-safe; the only
  capture method Roll20's `connect-src` doesn't block).
- **Egress = SSE** (`EventSource`) to the overlay — one-way, native, auto-reconnecting.
- **State = in-memory**, single instance. Each room holds its publish token, retained last
  roll, connected SSE clients, and a bounded set of seen message ids.
- **No broker** (Redis/NATS) until either >1 server instance OR a non-browser consumer.

## API contract (keep stable)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/rooms` | IP rate-limit | Create room → `{ room, publishToken, overlayUrl, setupUrl }` |
| POST | `/room/:id/roll` | `?token=` | Ingest one roll; dedup by message id; broadcast |
| GET  | `/room/:id/events` | room id | SSE stream; replays retained last-roll on connect |
| GET  | `/room/:id/overlay` | room id | Overlay HTML |
| GET  | `/room/:id/setup` | room id | Human setup page |
| GET  | `/healthz` | none | Liveness |

**Roll event shape:**
```json
{ "id": "<data-messageid>", "who": "Player", "formula": "1d20 + 5", "total": 23,
  "dice": [{ "sides": "20", "value": 18, "crit": false, "fumble": false }],
  "isCrit": false, "isFumble": false, "ts": 1733800000000 }
```

## Invariants
- The **publish token is never** sent over SSE, shown on the overlay, or returned by any
  room-id-only endpoint. It appears only in the `POST /rooms` response and inside the userscript.
- **Room ids and tokens are high-entropy and unguessable** (128-bit via `crypto`); no enumeration endpoint.
- Rolls are **idempotent by `data-messageid`** within a room.
- The server is **single-instance and stateless across restarts** (in-memory only). Losing state
  just means rooms must be recreated. Don't add persistence without revisiting the broker decision.
- Treat both URLs as **bearer capabilities**: link = access.
