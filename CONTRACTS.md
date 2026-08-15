# Pokemon Racing Game - shell contracts

One playable game, one entry point: **`index.html`** at the repo root.
Everything else hangs off it. This file is the contract every other build piece
codes against: URL params, the `window.__pkr` debug surface, shared data, and
the plugin seam for replacing any visual layer.

```
index.html                 shell page + global stylesheet (owned by shell-and-contracts)
src/main.js                boot, screen flow, clock, window.__pkr
src/core/                  state, rng, loop, input, registry, sim, world, screens/
src/data/roster.js         24 racers, 4 stats each
src/data/tracks.js         3 named tracks
tools/screenshot.mjs       headless capture CLI (random free port)
```

---

## 1. Screen flow

`title -> character-select -> track-select -> race -> results`

* `A` / `Enter` / `Space` confirms, `B` / `Esc` goes back, arrows move the cursor.
* A finished race auto-advances to `results` (~2.2 s after the player crosses).
* From `results`, `A` returns to `track-select`, `B` to `title`.

## 2. URL parameters

Every screen is directly addressable, so any piece can be screenshotted in isolation:

| Param | Values | Meaning |
|---|---|---|
| `screen` | `title` \| `character-select` \| `track-select` \| `race` \| `results` | which screen to boot into (default `title`) |
| `track` | `pallet-town` \| `ryme-city` \| `mt-coronet` | selected track |
| `racer` | any roster id (`pikachu`, `gengar`, `snorlax`, ...) | player character |
| `lap` | `1..laps` | starts the race mid-race on that lap |
| `pos` | `1..12` | forces the player's position (race HUD + results podium) |
| `coins` | `0..999` | player coin count |
| `item` | `poke-ball` \| `thunderbolt` \| `green-shell` \| `hyper-beam` \| `shadow-ball` \| `boost-berry` | item held in the HUD slot |
| `t` | ms | fast-forwards the sim deterministically after boot |
| `seed` | uint32 | RNG seed (default `1`) |
| `laps` | int | override lap count |
| `rolling` | `1` | skip the countdown, start the field mid-race |
| `paused` | `1` | boot with the realtime clock paused |
| `plugins` | comma list | extra modules to import at boot (paths relative to `/src/`) |

Examples:

```
index.html?screen=race&track=pallet-town&lap=2&pos=1&coins=10&item=thunderbolt&t=1500
index.html?screen=results&track=mt-coronet&coins=250&pos=1
index.html?screen=character-select&racer=snorlax
```

## 3. `window.__pkr` debug surface

```js
await window.__pkr.ready;          // resolves once boot + plugins are done
window.__pkr.isReady               // boolean mirror of the above
window.__pkr.goto(screen, opts)    // opts = { track, racer, lap, pos, coins, item, seed, laps }
window.__pkr.state()               // deterministic JSON snapshot (see below)
window.__pkr.step(ms)              // advance the sim in fixed 1/120 s steps, then render
window.__pkr.press(key, ms)        // hold a key for `ms` of SIMULATED time -> Promise
window.__pkr.seed(n)               // reseed and rebuild the current screen
window.__pkr.pause() / .resume()   // realtime clock control
window.__pkr.screen()              // current screen name
window.__pkr.register(provider)    // see the plugin seam below
window.__pkr.registered()          // what is currently registered, by kind
window.__pkr.roster / .tracks / .items
window.__pkr.art                   // canonical per-species creature art (see 4b)
```

`document.documentElement.dataset.pkrReady === '1'` once boot finished
(useful for tools that cannot evaluate JS before load).

**Determinism guarantee.** `goto()`, `seed()` and `step()` pause the realtime
clock, so the sim only advances inside `step()`. Two fresh loads that run

```js
await page.evaluate(() => window.__pkr.goto('race', { track: 'pallet-town' }));
await page.evaluate(() => window.__pkr.seed(42));
await page.evaluate(() => window.__pkr.step(3000));
JSON.stringify(await page.evaluate(() => window.__pkr.state()));
```

produce byte-identical snapshots. Rules that keep it that way - any replacement
`sim` provider must follow them:

* no `Math.random()`, `Date.now()`, `performance.now()` inside anything that
  reaches `state()`; use the seeded rng (`src/core/rng.js`, `race.rng`),
* fixed timestep only (`FIXED_MS = 1000/120`), no dt from the wall clock,
* iterate arrays in a stable order; never iterate `Set`/`Map` insertion order
  that depends on load timing,
* cosmetic-only wobble may use `view.time`, but must never write to state.

`state()` shape:

```jsonc
{
  "screen": "race", "seed": 42, "t": 3000, "frame": 360,
  "select": { "racerId": "pikachu", "trackId": "pallet-town", "...": "..." },
  "race": {
    "trackId": "pallet-town", "playerId": "pikachu", "laps": 3,
    "phase": "countdown|racing|finished", "countdown": 0, "elapsed": 0.6, "steps": 360,
    "hud": { "lap": 1, "pos": 6, "coins": 0, "item": null },
    "racers": [{ "id": "mewtwo", "dist": 12.5, "speed": 96.2, "lane": -0.5,
                 "lap": 1, "pos": 1, "coins": 0, "item": null, "boost": 0, "finished": false }]
  },
  "results": { "trackId": "...", "coins": 250, "rank": 1, "order": [{ "id": "pikachu", "time": 166.19 }] }
}
```

## 4. Shared data

`src/data/roster.js`

```js
import { roster, getRacer, racerOr, derive, STAT_KEYS, FIELD_SIZE } from './data/roster.js';
// roster: 24 frozen entries
// { id, name, type, color, accent, kart, shape, item, tagline,
//   stats: { speed, acceleration, handling, weight } }   // each 1..5
// derive(racer) -> { topSpeed, accel, grip, mass }  physics numbers for a sim
```

`src/data/tracks.js`

```js
import { tracks, trackMenuOrder, getTrack, trackOr, sampleTrack } from './data/tracks.js';
// exactly 3 tracks: pallet-town (sunny grass), ryme-city (neon night), mt-coronet (snow)
// { id, name, subtitle, laps, difficulty, order, theme, segments, minimap, itemRows, length }
// theme:    { key, skyTop, skyBottom, cloud, hillFar, hillNear, ground, groundAlt,
//             road, roadAlt, rumbleA, rumbleB, line, fog, neon, accent, hud }
// segments: [{ len, curve, hill }] looped pseudo-3D road description
// minimap:  [[x,y]...] closed loop in 0..1 space
// itemRows: [t...] normalised lap positions of Poke Ball rows
```

Both modules are frozen - clone before mutating.

## 4b. Canonical creature art - `src/core/avatars.js`

**Rule: no screen may draw a Pokemon as a recoloured generic blob.** Every one
of the 24 roster ids has a bespoke silhouette in `SPECIES` - its own head and
body shape plus the signature feature that makes it readable at a glance
(Charizard's wings and tail flame, Snorlax's bulk and sleeping face, Gengar's
grin and back spikes, Pikachu's bolt tail and cheeks, Machamp's four arms,
Squirtle's shell, Ditto's featureless slump). One art source feeds the select
grid, the karts, the minimap tokens and the podium, so a racer looks like the
same creature on every screen.

```js
import { avatarSvg, tokenSvg, kartSvg, ballSvg, creatureMarkup,
         avatarImage, hasSpecies, missingSpecies, SPECIES_IDS } from './core/avatars.js';
// also reachable at runtime as window.__pkr.art

avatarSvg(racer, 84)      // portrait  <svg viewBox="0 0 100 100">, ground line y=92
tokenSvg(racer, 40)       // round minimap / standings token
kartSvg(racer, 300)       // racer sitting in their kart (select preview, podium)
ballSvg(48)               // Poke Ball icon
creatureMarkup(racer)     // inner markup only, for embedding in your own <svg>
avatarImage(racer, 128)   // rasterised HTMLImageElement for canvas / 3D karts
missingSpecies(roster)    // audit: must return [] - non-empty means a blob is about to render
```

If a piece keeps its own art module (e.g. `src/assets/pokeArt.js`), it must hold
the same bar: one bespoke silhouette per id, never a shared template with swapped
ears. `missingSpecies(roster)` is the cheap regression check.

## 5. Plugin seam (how other pieces take over a layer)

```js
import { register } from '../core/registry.js';

register({
  id: 'race-world',           // unique
  kind: 'world',              // 'screen' | 'world' | 'hud' | 'sim' | 'overlay'
  screens: ['race'],          // null = all screens
  priority: 1,                // > 0 beats the shell defaults (which are priority 0)
  mount(ctx) {},              // DOM/canvas setup when the screen is entered
  update(dt, ctx) {},         // fixed-step sim tick (seconds)
  render(ctx) {},             // called every frame
  unmount(ctx) {},
});
```

`ctx` = `{ state, layer, canvas, c, w, h, dpr, time, rng, input, roster, tracks, items, goto, register }`.

Layers (all sized to a fixed 1600x900 stage that is scaled to fit):

| kind | DOM layer | notes |
|---|---|---|
| `screen` | `#pkr-layer-screen` | owns the screen's DOM |
| `hud` | `#pkr-layer-hud` | race HUD only |
| `world` | canvas `#pkr-canvas` | race world renderer |
| `overlay` | `#pkr-layer-overlay` | countdown, item popups, anything on top |
| `sim` | - | `init(opts)`, `update(race, dt, controls)`, `useItem(race)`, `results(race)` |

To have the shell import your module at boot, add its path to
`PLUGIN_MODULES` in `src/core/plugins.js` (one line, relative to `/src/`) - or
pass `?plugins=world/race-world.js` for a one-off. The shell never probes for
files that are not listed, so the console stays clean.

Registering after boot remounts the current screen automatically.

## 6. Screenshot tool

```
node tools/screenshot.mjs "?screen=race&track=pallet-town" out/race.png
node tools/screenshot.mjs "?screen=results&coins=250&pos=1" out/results.png --wait 600
node tools/screenshot.mjs "?screen=race" out/step.png --seed 42 --step 4000
```

* serves the repo root on a **random free port** (`listen(0)`), so parallel runs
  never collide,
* waits for `window.__pkr.isReady`, then two rAFs,
* captures **1600x900** by default (`--size WxH`),
* flags: `--size`, `--wait <ms>`, `--step <ms>`, `--seed <n>`, `--full`, `--quiet`,
* exits non-zero and prints the offenders if the page logged a console error,
  a page error, or a failed request.

It also exports `serveRepo()` and `capture(target, out, flags)` for scripting:

```js
import { serveRepo } from './tools/screenshot.mjs';
const { origin, port, server, close } = await serveRepo();  // random free port
// ... drive Playwright against `origin` ...
await close();
```

## 7. House rules

* No external assets or CDNs: every visual is procedural (canvas 2D / inline SVG / CSS).
* Every Pokemon is drawn from its own silhouette, never a recoloured template (see 4b).
* The global stylesheet forces `[hidden] { display: none !important }` - if your
  panel sets `display:flex/grid` in a same-specificity rule, toggling `hidden`
  still works and you will not leave a ghost panel on screen.
* Zero console errors on every screen - critics fail the build on any.
* Keep the 1600x900 stage: menus are laid out at that size and scaled to fit.
* Do not edit files owned by another piece; extend through the registry.
