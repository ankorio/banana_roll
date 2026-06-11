# 🎲 Banana Roll — Roll20 dice overlay for OBS

*[🇬🇧 English](README.en.md) · [🇪🇸 Español](README.md)*

## TL;DR

Show your Roll20 dice rolls on stream with animated 3D overlays. A Roll20 tab sends each roll to a small Node relay, which then pushes it through SSE to an OBS Browser Source. That way, your audience gets to watch the dice roll and land on the exact number that came up at the table.

👉 **Live demo: https://bananaroll.up.railway.app**

Heads up: this came out of an intense **single-day vibe-coding sprint**, so treat it for what it is: a fun hobby project, not bulletproof production software. It works and has already been used live, but the commit history is short and the bus factor is one. PRs are welcome. 🍌

```text
Roll20 tab (userscript) --HTTP POST--> Node relay (rooms + parsing) --SSE--> OBS Browser Source
```

If this is useful and you want to help with the running costs: https://buymeacoffee.com/ankorio ☕

## What it does

<details>
<summary><strong>Captures everyone’s rolls, not just yours.</strong></summary>

The userscript hooks into the Firebase data feed used by Roll20 at the transport level, so it automatically detects public rolls from every player. No one needs to type their rolls in a special format. Private whispers and GM rolls are never forwarded.

</details>

<details>
<summary><strong>Real 3D dice that match the result.</strong></summary>

The physical dice from `dice-box-threejs` are prepared to land on the exact values returned by the parser. For advantage or disadvantage rolls, two d20s are rolled and the correct die is shown on camera.

</details>

<details>
<summary><strong>An overlay that actually looks good.</strong></summary>

The “Arcane Plaque” design includes an ornate frame, portrait, large total, roll name, dice breakdown, advantage/disadvantage badge, and critical hit or fumble label. Critical hits and fumbles also trigger confetti particles.

</details>

<details>
<summary><strong>Shared overlay or per-player overlays.</strong></summary>

Each player gets a filtered overlay URL, for example `…/overlay?player=<id>`, which is useful for individual scenes, separate cameras, or custom OBS layouts.

</details>

<details>
<summary><strong>Per-player dice styles.</strong></summary>

The customization page lets each player choose the texture, material, and colors of their dice. Preferences are saved on the server and persist between sessions.

</details>

<details>
<summary><strong>Server-side rule handling.</strong></summary>

Critical hit and fumble logic is configurable depending on the game system. By default, it uses `dnd5e`, while `generic` only shows totals. This allows rules to be adjusted without forcing anyone to reinstall the userscript.

</details>

<details>
<summary><strong>Reasonable fallbacks.</strong></summary>

The dice engine, fonts, sounds, and confetti are vendored and loaded locally first. If something fails, the overlay still shows a clean plaque with the total.

</details>

<details>
<summary><strong>Preview without OBS.</strong></summary>

Open any overlay URL in your browser and press **T** to cycle through fake rolls: normal → critical hit → fumble.

</details>

## Quick start locally

```bash
npm start                 # starts on http://localhost:8765 and builds the dice engine first
```

1. **Install the userscript:** open `http://localhost:8765/roll20-capture.user.js` with [Tampermonkey](https://www.tampermonkey.net/). The server already injects its own origin, so you do not need to edit anything. The first time it runs on Roll20, it will automatically create a room and open the setup page.

2. **Add the overlay to OBS:** Sources → **+** → **Browser**, then paste the `overlayUrl`. The background is transparent.

3. **Roll dice in Roll20.** The rolls will appear in the overlay.

If you prefer to test the API directly, you can create a room with:

```bash
curl -X POST localhost:8765/rooms
```

The response includes an `overlayUrl`, a `setupUrl`, and a `publishToken`.

## For other devs

Read this before touching anything.

### Run and test

```bash
npm start          # production-like mode: builds the dice engine with prestart and serves the app
npm test           # parser tests + Redis backend test using ioredis-mock, no real Redis required
npm run smoke      # full end-to-end test: starts the server and checks create/SSE/dedup/replay/403
npm run dice:build # rebuilds the dice bundle and manifest after adding textures
```

### Architecture in one sentence

* **Capture (`userscript`):** runs at `document-start`, hooks the page WebSocket to read Roll20 Firebase frames, and forwards each raw chat record to the relay. There is no dice logic on the client.

* **Parsing (`src/parser.js`):** converts the raw Roll20 record into the roll format used by the overlay. It flattens inline rolls and roll templates, chooses the displayed roll while respecting advantage/disadvantage, and applies critical hit/fumble logic. It has unit tests.

* **Relay (`src/server.js` + `src/rooms.js`):** handles HTTP input, SSE output, rooms, rate limits, and deduplication.

### State and persistence — ⚠️ the one thing you need to understand

State lives in an in-memory `Map` per instance. It has to work that way because that is where the live SSE connections are kept. Durable or shared state is replicated to an **interchangeable backend**, selected at startup depending on the environment:

| Environment  | Backend                                                  | Usage                          |
| ------------ | -------------------------------------------------------- | ------------------------------ |
| `REDIS_URL`  | **Redis** — per-room keys with TTL + **pub/sub fan-out** | Production / scaling           |
| `STATE_FILE` | JSON file, single instance                               | Local persistence              |
| *(none)*     | Memory only                                              | Quick local tests / test suite |

The Redis backend is what makes multiple instances possible: a roll that reaches instance A can reach SSE clients connected to instance B through pub/sub, and room/style data is shared between instances.

That said, keep replicas at 1 for now unless you have tested it under real load. A single machine can handle a lot of SSE clients, and although the pub/sub path is implemented and tested, it has not yet been seriously battle-tested across real replicas. The SSE client `Set` is always local to each instance and never leaves the process.

### Environment configuration

| Variable                                 | Default              | Purpose                                                          |
| ---------------------------------------- | -------------------- | ---------------------------------------------------------------- |
| `PORT`                                   | `8765`               | Listening port. Railway injects this automatically               |
| `BASE_URL`                               | Derived from request | Absolute base URL for generated links. Recommended in production |
| `REDIS_URL` / `REDIS_PRIVATE_URL`        | *(empty)*            | Redis connection. Enables the Redis backend                      |
| `STATE_FILE`                             | *(empty)*            | JSON persistence path. Ignored if `REDIS_URL` exists             |
| `ROOM_TTL`                               | `21600000` — 6 h     | Lifetime of an inactive room, in ms                              |
| `MAX_ROOMS`                              | `5000`               | Global room limit                                                |
| `CREATE_RATE_MAX` / `CREATE_RATE_WINDOW` | `10` / `60000`       | `/rooms` limit per IP                                            |
| `ROLL_RATE_MAX` / `ROLL_RATE_WINDOW`     | `20` / `1000`        | Roll limit per room                                              |
| `CLIENTS_MAX`                            | `50`                 | Maximum SSE clients per room                                     |
| `SEEN_MAX`                               | `500`                | Deduplication window per room                                    |

### Deployment on Railway

This is the setup used by the live demo.

1. Connect the GitHub repository to a Railway project and deploy on every push. That becomes your deployment pipeline. The build uses Nixpacks; `railway.json` defines the start command and the `/healthz` healthcheck.

2. Add a **Redis** database to the project and set `REDIS_URL = ${{Redis.REDIS_URL}}` on the app service.

3. Generate a public domain. Optionally, set `BASE_URL` to that domain.

In the logs, you should see something like:

```text
[state] backend: redis
[redis] connected
[redis] loaded N room(s)
```

Any host that supports **long-lived connections** should work, such as Railway, Render, Fly, or a VPS. Do not use serverless functions: SSE and in-memory fan-out do not fit that model well.

### Adding your own dice textures

Put a `.webp` file in:

```text
public/assets/custom-textures/
```

Then add an entry to:

```text
public/assets/custom-textures/dice-textures.json
```

And run:

```bash
npm run dice:build
```

This injects the texture into the vendored dice engine bundle and regenerates the manifest used by the customization page.

### Security model

The URLs work as bearer capabilities: whoever has the link has access.

The `publishToken` only appears in the response from `POST /rooms` and inside your installed userscript. It is never sent over SSE and is never shown on pages that only use the room id. IDs and tokens are 128-bit.

The full invariants are documented in `CLAUDE.md`.

### Project structure

```text
src/server.js                  HTTP server + routing
src/rooms.js                   room store, rate limits, TTL sweep, and interchangeable persistence: redis/file/memory
src/parser.js                  raw Roll20 record → overlay roll format, with pluggable game systems
public/overlay.html            transparent OBS overlay: EventSource + 3D dice + animations
public/setup.html              per-room setup page, with per-player links
public/customize.html          self-service dice customization per player
public/landing.html            landing page
public/roll20-capture.user.js  Tampermonkey capture script, with origin injected when served
public/assets/                 dice engine, textures, sounds, fonts, and plaque art, all vendored
scripts/build-dice.mjs         builds the dice bundle and manifest
scripts/parser.test.cjs        parser unit tests
scripts/redis.test.mjs         Redis backend test with ioredis-mock
scripts/smoke.mjs              end-to-end test
```

### Credits

Banana Roll stands on two excellent open-source libraries:

- **[@3d-dice/dice-box-threejs](https://github.com/3d-dice/dice-box-threejs)** — the 3D physics dice engine that rolls the predetermined results onto the overlay.
- **[canvas-confetti](https://github.com/catdad/canvas-confetti)** — the crit / fumble particle bursts.

MIT License. Have fun, and may you avoid the fumble. 🎲
